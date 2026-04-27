using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TicketSystem.Domain.Entities;

namespace TicketSystem.Application.Interfaces
{
    /// <summary>
    /// Giao diện đại diện cho Database Context.
    /// Giúp tầng Application giao tiếp với Database mà không cần biết chi tiết về SQL Server hay Entity Framework.
    /// </summary>
    public interface IApplicationDbContext
    {
        DbSet<Event> Events { get; }
        DbSet<Ticket> Tickets { get; }
        DbSet<TicketType> TicketTypes { get; }
        DbSet<User> Users { get; }
        DbSet<Order> Orders { get; }
        DbSet<Payment> Payments { get; }
        DbSet<CheckInLog> CheckInLogs { get; }
        DbSet<AuditLog> AuditLogs { get; }
        DbSet<SystemSettings> SystemSettings { get; }

        // Phương thức lưu thay đổi vào DB
        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}