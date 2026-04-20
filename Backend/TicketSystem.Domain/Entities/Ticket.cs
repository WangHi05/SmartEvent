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
    public string? QrCode { get; set; }
    public TicketStatus Status { get; set; } = TicketStatus.ACTIVE;

    // Relationships
    public virtual TicketType? TicketType { get; set; }
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
