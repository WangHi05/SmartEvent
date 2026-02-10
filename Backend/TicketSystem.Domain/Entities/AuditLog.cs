using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TicketSystem.Domain.Common;

namespace TicketSystem.Domain.Entities
{
    public class AuditLog : BaseEntity
    {
        public string Action { get; set; } = string.Empty; // Create, Update, Cancel, CheckIn
        public string EntityName { get; set; } = string.Empty; // Ticket, Event, User
        public string EntityId { get; set; } = string.Empty;
        public Guid? UserId { get; set; } // Người thực hiện thao tác
        public string Details { get; set; } = string.Empty; // Mô tả chi tiết (ví dụ: "Hủy vé do khách yêu cầu")
        public string? IpAddress { get; set; }
    }
}