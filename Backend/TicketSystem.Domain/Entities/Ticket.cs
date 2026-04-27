using System;
using System.Collections.Generic;
using TicketSystem.Domain.Common;

namespace TicketSystem.Domain.Entities;

public enum TicketStatus
{
    ACTIVE = 1,
    CHECKED_IN = 2,
    CANCELLED = 3
}

public class Ticket : BaseEntity
{
    public Guid TicketTypeId { get; set; }
    public Guid? OrderId { get; set; } // Foreign key to Order
    public string? QrCode { get; set; }
    public TicketStatus Status { get; set; } = TicketStatus.ACTIVE;
    
    // Cancel + Refund related fields
    public DateTime? CancelledAt { get; set; }
    public decimal? RefundAmount { get; set; }
    public string? CancelReason { get; set; }
    public bool IsCheckedIn { get; set; } = false; // True nếu vé đã check-in

    // Relationships
    public virtual TicketType? TicketType { get; set; }
    public virtual Order? Order { get; set; }
    public virtual ICollection<CheckInLog> CheckInLogs { get; set; } = new List<CheckInLog>();
}

public class CheckInLog : BaseEntity
{
    public Guid TicketId { get; set; }
    public DateTime CheckedAt { get; set; }
    public DateOnly CheckinDate { get; set; }
    public string? GateName { get; set; }

    // Relationships
    public virtual Ticket? Ticket { get; set; }
}
