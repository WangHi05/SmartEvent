using System;
using System.Threading.Tasks;

namespace TicketSystem.Application.Interfaces
{
    public interface IAuditLogService
    {
        Task LogAsync(string action, string entityType, Guid entityId, string performedBy, string? details = null, string? ipAddress = null);
    }
}