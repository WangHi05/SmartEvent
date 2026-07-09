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

        public DbSet<User> Users { get; set; }
        public DbSet<Event> Events { get; set; }
        public DbSet<Domain.Entities.TicketType> TicketTypes { get; set; }
        public DbSet<Ticket> Tickets { get; set; }
        public DbSet<CheckInLog> CheckInLogs { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<Payment> Payments { get; set; }
        public DbSet<SystemSettings> SystemSettings { get; set; }
        public DbSet<SystemKnowledge> SystemKnowledges { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Khai báo extension vector cho PostgreSQL để hỗ trợ RAG
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
            // 1. Event Configuration
            modelBuilder.Entity<Event>(entity =>
            {
                entity.ToTable(t =>
                {
                    // Đổi dấu ngoặc vuông sang nháy kép để PostgreSQL hiểu được tên cột
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
                    // Đổi dấu ngoặc vuông sang nháy kép chuẩn PostgreSQL
                    t.HasCheckConstraint("CK_SaleTime", "\"SaleStartTime\" < \"SaleEndTime\"");
                });
                entity.HasKey(e => e.Id);
                
                // Properties
                entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
                entity.Property(e => e.Price).HasPrecision(18, 2).IsRequired();
                entity.Property(e => e.Quantity).IsRequired();
                entity.Property(e => e.RemainingQuantity).IsRequired();
                entity.Property(e => e.MaxPerUser).IsRequired();
                entity.Property(e => e.TicketMode).HasConversion<int>();
                entity.Property(e => e.UsageType).HasConversion<int?>();
                entity.Property(e => e.QRMode).HasConversion<int?>();
                entity.Property(e => e.PriceMode).HasConversion<int?>();
                
                // Deprecated properties kept for backward compatibility
                entity.Property(e => e.AccessType).HasConversion<int>();
                
                // Foreign key
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

            // 5. Order Configuration
            modelBuilder.Entity<Order>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.TotalPrice).HasPrecision(18, 2).IsRequired();
                entity.Property(e => e.OrderStatus).HasConversion<int>();
                entity.Property(e => e.Quantity).IsRequired();
                entity.Property(e => e.RefundAmount).HasPrecision(18, 2);
                entity.Property(e => e.ConfirmedBy).HasMaxLength(100);

                entity.HasOne(e => e.User)
                    .WithMany(u => u.Orders)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Event)
                    .WithMany(ev => ev.Orders)
                    .HasForeignKey(e => e.EventId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.TicketType)
                    .WithMany()
                    .HasForeignKey(e => e.TicketTypeId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.UserId, e.EventId });
                entity.HasIndex(e => e.CreatedAt);
                entity.HasIndex(e => e.OrderStatus);
                entity.HasIndex(e => new { e.UserId, e.OrderStatus });
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

            // 9. SystemKnowledge Configuration (Dữ liệu Vector cho AI)
            modelBuilder.Entity<SystemKnowledge>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                // Cấu hình kiểu dữ liệu vector trong database với 768 chiều (chuẩn của Gemini)
                entity.Property(e => e.Embedding)
                      .HasColumnType("vector(768)");
            });
            
        }
    }
}