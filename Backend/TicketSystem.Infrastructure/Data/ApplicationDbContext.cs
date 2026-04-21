using Microsoft.EntityFrameworkCore;
using TicketSystem.Domain.Entities;
using TicketSystem.Domain.Common;

namespace TicketSystem.Infrastructure.Data
{
    public class ApplicationDbContext : DbContext
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

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // 1. Event Configuration
            modelBuilder.Entity<Event>(entity =>
            {
                entity.ToTable(t =>
                {
                    t.HasCheckConstraint("CK_EventTime", "[StartTime] < [EndTime]");
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
                    t.HasCheckConstraint("CK_SaleTime", "[SaleStartTime] < [SaleEndTime]");
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
                entity.Property(e => e.QrCode).HasMaxLength(100).IsRequired();
                entity.Property(e => e.Status).HasConversion<int>();

                entity.HasOne(e => e.TicketType)
                    .WithMany(tt => tt.Tickets)
                    .HasForeignKey(e => e.TicketTypeId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => e.QrCode).IsUnique();
                entity.HasIndex(e => e.Status);
            });

            // 4. CheckInLog Configuration
            modelBuilder.Entity<CheckInLog>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.GateName).HasMaxLength(100);
                
                entity.HasOne(e => e.Ticket)
                    .WithMany(t => t.CheckInLogs)
                    .HasForeignKey(e => e.TicketId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => new { e.TicketId, e.CheckinDate }).IsUnique();
            });
        }
    }
}