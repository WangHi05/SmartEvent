using MediatR;
using Microsoft.EntityFrameworkCore;
using TicketSystem.Application.Events;
using TicketSystem.Application.Interfaces;
using TicketSystem.Domain.Entities;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace TicketSystem.Application.Handlers;

public class UpdateOccupancyHandler : INotificationHandler<TicketCheckedInEvent>
{
    private readonly IApplicationDbContext _context;
    private readonly IRealTimeUpdateService _realTimeService;

    public UpdateOccupancyHandler(
        IApplicationDbContext context, 
        IRealTimeUpdateService realTimeService)
    {
        _context = context;
        _realTimeService = realTimeService;
    }

    public async Task Handle(TicketCheckedInEvent notification, CancellationToken cancellationToken)
    {
        if (notification.ScanType != ScanType.Entry) return;

        var eventEntity = await _context.Events
            .FirstOrDefaultAsync(e => e.Id == notification.EventId, cancellationToken);

        if (eventEntity != null)
        {
            // 1. Cập nhật DB
            eventEntity.CurrentOccupancy += notification.PeopleCount;
            eventEntity.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync(cancellationToken);

            // 2. Gọi Interface để bắn Real-time 
            await _realTimeService.SendOccupancyUpdateAsync(
                eventEntity.Id, 
                eventEntity.CurrentOccupancy, 
                eventEntity.CurrentOccupancy >= eventEntity.MaxCapacity, 
                cancellationToken);
        }
    }
}