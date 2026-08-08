using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using TicketSystem.Application.Interfaces;
using TicketSystem.Domain.Entities;

namespace TicketSystem.Tests.TestHelpers
{
    /// <summary>
    /// DbContext dùng riêng cho test, chạy trên EF Core InMemory Provider.
    /// Tách biệt hoàn toàn với ApplicationDbContext thật (không đụng Postgres/Neon).
    /// </summary>
    public class TestApplicationDbContext : DbContext, IApplicationDbContext
    {
        public TestApplicationDbContext(DbContextOptions<TestApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Employee> Employees { get; set; }
        public DbSet<Customer> Customers { get; set; }
        public DbSet<Event> Events { get; set; }
        public DbSet<TicketType> TicketTypes { get; set; }
        public DbSet<Ticket> Tickets { get; set; }
        public DbSet<CheckInLog> CheckInLogs { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<OrderItem> OrderItems { get; set; }
        public DbSet<Payment> Payments { get; set; }
        public DbSet<SystemSettings> SystemSettings { get; set; }
        public DbSet<SystemKnowledge> SystemKnowledges { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Bỏ qua entity dùng vector embedding (Pgvector) — InMemory provider không hỗ trợ,
            // và các test hiện tại không cần đụng tới bảng này.
            modelBuilder.Ignore<SystemKnowledge>();

            // Quan hệ Ticket - Order dùng NoAction giống context thật, tránh lỗi cascade cycle
            modelBuilder.Entity<Ticket>()
                .HasOne(t => t.Order)
                .WithMany(o => o.Tickets)
                .HasForeignKey(t => t.OrderId)
                .OnDelete(DeleteBehavior.NoAction);
        }
    }

    /// <summary>
    /// Factory tạo TestApplicationDbContext mới, mỗi lần gọi là 1 database riêng biệt trong RAM,
    /// tránh các test ảnh hưởng lẫn nhau.
    /// </summary>
    public static class TestDbContextFactory
    {
        public static TestApplicationDbContext Create()
        {
            var options = new DbContextOptionsBuilder<TestApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            return new TestApplicationDbContext(options);
        }
    }
}