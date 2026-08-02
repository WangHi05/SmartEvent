using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using TicketSystem.Domain.Entities;

namespace TicketSystem.Application.Interfaces
{
    public interface IApplicationDbContext
    {
        DbSet<Event> Events { get; }
        DbSet<Ticket> Tickets { get; }
        DbSet<TicketType> TicketTypes { get; }
        DbSet<User> Users { get; } // Giữ tạm để không vỡ code cũ chưa kịp sửa — sẽ xóa ở bước dọn dẹp cuối
        DbSet<Employee> Employees { get; }
        DbSet<Customer> Customers { get; }
        DbSet<Order> Orders { get; }
        DbSet<Payment> Payments { get; }
        ChangeTracker ChangeTracker { get; }
        DbSet<CheckInLog> CheckInLogs { get; }
        DbSet<AuditLog> AuditLogs { get; }
        DbSet<SystemSettings> SystemSettings { get; }
        DbSet<SystemKnowledge> SystemKnowledges { get; }
        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}