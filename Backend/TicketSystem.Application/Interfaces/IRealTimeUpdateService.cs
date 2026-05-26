using System;
using System.Threading;
using System.Threading.Tasks;

namespace TicketSystem.Application.Interfaces;

public interface IRealTimeUpdateService
{
    Task SendOccupancyUpdateAsync(Guid eventId, int newOccupancy, bool isFull, CancellationToken cancellationToken = default);
}