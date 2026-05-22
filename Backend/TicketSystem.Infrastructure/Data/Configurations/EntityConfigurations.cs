using TicketSystem.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace TicketSystem.Infrastructure.Data.Configurations;

public class EventConfiguration : IEntityTypeConfiguration<Event>
{
    public void Configure(EntityTypeBuilder<Event> builder)
    {
        builder.ToTable("Events", t => 
        {
            t.HasCheckConstraint("CK_EventTime", "[StartTime] < [EndTime]");
        });
        builder.HasKey(e => e.Id);

        builder.Property(e => e.Name).HasMaxLength(255).IsRequired();
        builder.Property(e => e.Location).HasMaxLength(500);
        builder.Property(e => e.StartTime).IsRequired();
        builder.Property(e => e.EndTime).IsRequired();
        builder.Property(e => e.MaxCapacity).IsRequired();

        builder.HasCheckConstraint("CK_EventTime", "[StartTime] < [EndTime]");
        builder.HasIndex(e => e.CreatedAt);
    }
}

public class TicketTypeConfiguration : IEntityTypeConfiguration<TicketType>
{
    public void Configure(EntityTypeBuilder<TicketType> builder)
    {
        builder.ToTable("TicketTypes", t => 
        {
            t.HasCheckConstraint("CK_SaleTime", "[SaleStart] < [SaleEnd]");
        });

        builder.HasKey(t => t.Id);

        builder.Property(t => t.Name).HasMaxLength(100).IsRequired();
        builder.Property(t => t.Price).HasPrecision(18, 2);
        builder.Property(t => t.AccessType)
            .HasConversion<int>();

        builder.HasOne(t => t.Event)
            .WithMany(e => e.TicketTypes)
            .HasForeignKey(t => t.EventId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasCheckConstraint("CK_SaleTime", "[SaleStart] < [SaleEnd]");
        builder.HasIndex(t => new { t.EventId, t.IsActive });
    }
}

public class TicketConfiguration : IEntityTypeConfiguration<Ticket>
{
    public void Configure(EntityTypeBuilder<Ticket> builder)
    {
        builder.ToTable("Tickets");
        builder.HasKey(t => t.Id);

        builder.Property(t => t.SecretKey).HasMaxLength(16).IsRequired();
        builder.HasIndex(t => t.SecretKey).IsUnique();
        builder.Property(t => t.Status)
            .HasConversion<int>();

        builder.HasOne(t => t.TicketType)
            .WithMany(tt => tt.Tickets)
            .HasForeignKey(t => t.TicketTypeId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class CheckInLogConfiguration : IEntityTypeConfiguration<CheckInLog>
{
    public void Configure(EntityTypeBuilder<CheckInLog> builder)
    {
        builder.ToTable("CheckInLogs");
        builder.HasKey(c => c.Id);

        builder.Property(c => c.CheckInResult).HasMaxLength(20).IsRequired();
        builder.Property(c => c.FailureReason).HasMaxLength(500);
        builder.Property(c => c.QRCodeData).HasMaxLength(2000);
        builder.Property(c => c.GateName).HasMaxLength(100);
        builder.HasOne(c => c.Ticket)
            .WithMany(t => t.CheckInLogs)
            .HasForeignKey(c => c.TicketId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(c => new { c.TicketId, c.CheckinDate }).IsUnique();
    }
}
