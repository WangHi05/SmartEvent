using Microsoft.AspNetCore.SignalR;
using TicketSystem.Application.Interfaces;
using TicketSystem.API.Hubs;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace TicketSystem.API.Services;

public class RealTimeUpdateService : IRealTimeUpdateService
{
    private readonly IHubContext<GateHub> _hubContext;

    public RealTimeUpdateService(IHubContext<GateHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task SendOccupancyUpdateAsync(Guid eventId, int newOccupancy, bool isFull, CancellationToken cancellationToken = default)
    {
        var payload = new 
        {
            eventId = eventId,
            newOccupancy = newOccupancy,
            isFull = isFull
        };

        await _hubContext.Clients.All.SendAsync("TicketCheckedIn", payload, cancellationToken);
    }

    public async Task NotifyEventStatusChangedAsync(Guid eventId, int newStatus, CancellationToken cancellationToken = default)
    {
        var payload = new
        {
            eventId = eventId,
            newStatus = newStatus
        };

        await _hubContext.Clients.All.SendAsync("EventStatusChanged", payload, cancellationToken);
    }
}