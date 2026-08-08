using Microsoft.EntityFrameworkCore;
using TicketSystem.Domain.Entities;
using TicketSystem.Domain.Common;
using TicketSystem.Application.Interfaces;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Pgvector;

namespace TicketSystem.Infrastructure.Data
{
    public class ApplicationDbContext : DbContext, IApplicationDbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users { get; set; } // Bảng cũ — giữ tạm, sẽ xóa sau khi migrate xong toàn bộ
        public DbSet<Employee> Employees { get; set; }
        public DbSet<Customer> Customers { get; set; }
        public DbSet<Event> Events { get; set; }
        public DbSet<Domain.Entities.TicketType> TicketTypes { get; set; }
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

            // pgvector chỉ hoạt động trên PostgreSQL thật (Neon). Khi chạy test bằng Sqlite In-Memory
            // (CustomWebApplicationFactory), loại bỏ entity SystemKnowledge khỏi model để tránh lỗi
            // mapping 'vector(768)' — cột này không tồn tại trên Sqlite.
            if (!Database.IsNpgsql())
            {
                modelBuilder.Ignore<SystemKnowledge>();
            }

            modelBuilder.HasPostgresExtension("vector");

            var dateTimeConverter = new ValueConverter<DateTime, DateTime>(
                v => v.ToUniversalTime(),
                v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                foreach (var property in entityType.GetProperties())
                {
                    if (property.ClrType == typeof(DateTime) || property.ClrType == typeof(DateTime?))
                    {
                        property.SetValueConverter(dateTimeConverter);
                    }
                }
            }

            // 0a. Employee Configuration (MỚI)
            modelBuilder.Entity<Employee>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Username).HasMaxLength(50).IsRequired();
                entity.Property(e => e.Email).HasMaxLength(255).IsRequired();
                entity.Property(e => e.FullName).HasMaxLength(100).IsRequired();
                entity.Property(e => e.AvatarUrl).HasMaxLength(500).IsRequired();
                entity.Property(e => e.Position).HasMaxLength(100);
                entity.Property(e => e.Role).HasConversion<int>();
                entity.HasIndex(e => e.Username).IsUnique();
                entity.HasIndex(e => e.Email).IsUnique();
            });

            // 0b. Customer Configuration (MỚI)
            modelBuilder.Entity<Customer>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Username).HasMaxLength(50).IsRequired();
                entity.Property(e => e.Email).HasMaxLength(255).IsRequired();
                entity.Property(e => e.FullName).HasMaxLength(100).IsRequired();
                entity.Property(e => e.AvatarUrl).HasMaxLength(500);
                entity.HasIndex(e => e.Username).IsUnique();
                entity.HasIndex(e => e.Email).IsUnique();

                entity.HasMany(c => c.Orders)
                    .WithOne(o => o.Customer)
                    .HasForeignKey(o => o.CustomerId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // 1. Event Configuration
            modelBuilder.Entity<Event>(entity =>
            {
                entity.ToTable(t =>
                {
                    t.HasCheckConstraint("CK_EventTime", "\"StartTime\" < \"EndTime\"");
                });
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).HasMaxLength(255).IsRequired();
                entity.Property(e => e.Location).HasMaxLength(500);
                entity.Property(e => e.MaxCapacity).IsRequired();
                entity.HasIndex(e => e.CreatedAt);
            });

            // 2. TicketType Configuration
            modelBuilder.Entity<Domain.Entities.TicketType>(entity =>
            {
                entity.ToTable(t =>
                {
                    t.HasCheckConstraint("CK_SaleTime", "\"SaleStartTime\" < \"SaleEndTime\"");
                });
                entity.HasKey(e => e.Id);

                entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
                entity.Property(e => e.Price).HasPrecision(18, 2).IsRequired();
                entity.Property(e => e.Quantity).IsRequired();
                entity.Property(e => e.RemainingQuantity).IsRequired();
                entity.Property(e => e.MaxPerUser).IsRequired();
                entity.Property(e => e.TicketMode).HasConversion<int>();
                entity.Property(e => e.UsageType).HasConversion<int?>();
                entity.Property(e => e.QRMode).HasConversion<int?>();
                entity.Property(e => e.PriceMode).HasConversion<int?>();

                entity.Property(e => e.AccessType).HasConversion<int>();

                entity.HasOne(e => e.Event)
                    .WithMany(e => e.TicketTypes)
                    .HasForeignKey(e => e.EventId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => new { e.EventId, e.IsActive });
            });

            // 3. Ticket Configuration
            modelBuilder.Entity<Ticket>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.SecretKey).HasMaxLength(16).IsRequired();
                entity.Property(e => e.Status).HasConversion<int>();
                entity.Property(e => e.CancelReason).HasMaxLength(500);
                entity.Property(e => e.RefundAmount).HasPrecision(18, 2);

                entity.HasOne(e => e.TicketType)
                    .WithMany(tt => tt.Tickets)
                    .HasForeignKey(e => e.TicketTypeId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => e.SecretKey).IsUnique();
                entity.HasIndex(e => e.Status);
                entity.HasIndex(e => e.IsCheckedIn);
            });

            // 4. CheckInLog Configuration
            modelBuilder.Entity<CheckInLog>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.CheckInResult).HasMaxLength(20).IsRequired();
                entity.Property(e => e.FailureReason).HasMaxLength(500);
                entity.Property(e => e.QRCodeData).HasMaxLength(2000);
                entity.Property(e => e.GateName).HasMaxLength(100);

                entity.HasOne(e => e.Ticket)
                    .WithMany(t => t.CheckInLogs)
                    .HasForeignKey(e => e.TicketId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => new { e.TicketId, e.CheckinDate });
            });

            // 5. Order Configuration (SỬA: User -> Customer)
            modelBuilder.Entity<Order>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.TotalPrice).HasPrecision(18, 2).IsRequired();
                entity.Property(e => e.OrderStatus).HasConversion<int>();
                entity.Property(e => e.Quantity).IsRequired();
                entity.Property(e => e.RefundAmount).HasPrecision(18, 2);
                entity.Property(e => e.ConfirmedBy).HasMaxLength(100);

                entity.HasOne(e => e.Customer)
                    .WithMany(c => c.Orders)
                    .HasForeignKey(e => e.CustomerId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Event)
                    .WithMany(ev => ev.Orders)
                    .HasForeignKey(e => e.EventId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.TicketType)
                    .WithMany()
                    .HasForeignKey(e => e.TicketTypeId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.CustomerId, e.EventId });
                entity.HasIndex(e => e.CreatedAt);
                entity.HasIndex(e => e.OrderStatus);
                entity.HasIndex(e => new { e.CustomerId, e.OrderStatus });
            });

            // 5b. OrderItem Configuration (MỚI — hỗ trợ nhiều loại vé trong 1 đơn)
            modelBuilder.Entity<OrderItem>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.UnitPrice).HasPrecision(18, 2).IsRequired();
                entity.Property(e => e.Subtotal).HasPrecision(18, 2).IsRequired();
                entity.Property(e => e.Quantity).IsRequired();

                entity.HasOne(e => e.Order)
                    .WithMany(o => o.OrderItems)
                    .HasForeignKey(e => e.OrderId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.TicketType)
                    .WithMany()
                    .HasForeignKey(e => e.TicketTypeId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => e.OrderId);
            });

            // 6. Payment Configuration
            modelBuilder.Entity<Payment>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Amount).HasPrecision(18, 2).IsRequired();
                entity.Property(e => e.PaymentMethod).HasConversion<int>();
                entity.Property(e => e.PaymentStatus).HasConversion<int>();
                entity.Property(e => e.TransactionReference).HasMaxLength(255);

                entity.HasOne(e => e.Order)
                    .WithMany(o => o.Payments)
                    .HasForeignKey(e => e.OrderId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => e.CreatedAt);
            });

            // 7. Ticket - Order Relationship Configuration
            modelBuilder.Entity<Ticket>(entity =>
            {
                entity.HasOne(e => e.Order)
                    .WithMany(o => o.Tickets)
                    .HasForeignKey(e => e.OrderId)
                    .OnDelete(DeleteBehavior.NoAction);
            });

            // 8. SystemSettings Configuration
            modelBuilder.Entity<SystemSettings>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.SettingKey).HasMaxLength(100).IsRequired();
                entity.Property(e => e.SettingValue).HasMaxLength(500).IsRequired();
                entity.Property(e => e.Description).HasMaxLength(500);
                entity.Property(e => e.DataType).HasMaxLength(50).IsRequired();

                entity.HasIndex(e => e.SettingKey).IsUnique();
            });

            // 9. SystemKnowledge Configuration
            // Chỉ cấu hình cột vector(768) khi chạy trên Postgres thật (Neon).
            // Trên Sqlite (test), entity này đã bị Ignore ở đầu hàm nên bỏ qua luôn, tránh bị "hồi sinh" lại model.
            if (Database.IsNpgsql())
            {
                modelBuilder.Entity<SystemKnowledge>(entity =>
                {
                    entity.HasKey(e => e.Id);
                    entity.Property(e => e.Embedding).HasColumnType("vector(768)");
                });
            }
        }
    }
}