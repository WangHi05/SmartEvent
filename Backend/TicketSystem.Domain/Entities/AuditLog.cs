using System;
using TicketSystem.Domain.Common;

namespace TicketSystem.Domain.Entities
{
    
    /// Entity lưu lịch sử thao tác của người dùng (Audit Trail)
    
    public class AuditLog : BaseEntity
    {
        public DateTime Timestamp { get; set; } = DateTime.Now;
        public string Action { get; set; } = string.Empty; // Create, Update, Delete, Cancel, CheckIn, Refund
        public string EntityType { get; set; } = string.Empty; // Event, Ticket, User
        public Guid EntityId { get; set; }
        public string PerformedBy { get; set; } = string.Empty; // Username hoặc UserId
        public string? Details { get; set; } // Mô tả chi tiết (JSON string)
        public string? IpAddress { get; set; }
    }
}