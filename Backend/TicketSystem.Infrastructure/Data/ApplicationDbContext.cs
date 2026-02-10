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
        public DbSet<Ticket> Tickets { get; set; }
        public DbSet<SubTicket> SubTickets { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // 1. Cấu hình cho Ticket
            modelBuilder.Entity<Ticket>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                // Chuyển đổi Enum sang Int để lưu vào DB
                entity.Property(e => e.Status).HasConversion<int>();
                entity.Property(e => e.Type).HasConversion<int>();
                entity.Property(e => e.GroupMode).HasConversion<int>();

                entity.Property(e => e.Price).HasPrecision(18, 2);

                // SỬA LỖI 1: Quan hệ Event -> Tickets (Sử dụng tên thuộc tính 'Tickets' trong lớp Event)
                entity.HasOne(d => d.Event)
                    .WithMany(p => p.Tickets) 
                    .HasForeignKey(d => d.EventId);

                entity.HasOne(d => d.User)
                    .WithMany(p => p.PurchasedTickets)
                    .HasForeignKey(d => d.UserId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            // 2. Cấu hình cho SubTicket (Dành cho Mode 2 của vé đoàn)
            modelBuilder.Entity<SubTicket>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.Status).HasConversion<int>();

                // SỬA LỖI 3: Quan hệ Ticket -> SubTickets (Sử dụng tên 'ParentTicket' trong lớp SubTicket)
                entity.HasOne(d => d.ParentTicket)
                    .WithMany(p => p.SubTickets)
                    .HasForeignKey(d => d.ParentTicketId)
                    .OnDelete(DeleteBehavior.Cascade); 
            });
            
            // 3. Cấu hình cho Event
            modelBuilder.Entity<Event>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.BasePrice).HasPrecision(18, 2);
            });

            
        }
    }
}