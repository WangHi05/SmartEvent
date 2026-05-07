using MediatR;
using Microsoft.EntityFrameworkCore;
using TicketSystem.Application.Events;
using TicketSystem.Application.Interfaces;
using TicketSystem.Domain.Entities;

namespace TicketSystem.Application.Handlers;

public class UpdateOccupancyHandler : INotificationHandler<TicketCheckedInEvent>
{
    private readonly IApplicationDbContext _context;

    public UpdateOccupancyHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(TicketCheckedInEvent notification, CancellationToken cancellationToken)
    {
        // Chỉ cập nhật khi khách thực sự vào cổng (không áp dụng cho in thẻ hoặc quét ra)
        if (notification.ScanType != ScanType.Entry) return;

        var eventEntity = await _context.Events
            .FirstOrDefaultAsync(e => e.Id == notification.EventId, cancellationToken);

        if (eventEntity != null)
        {
            // Tăng số lượng người hiện có trong sự kiện
            eventEntity.CurrentOccupancy += notification.PeopleCount;
            eventEntity.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}