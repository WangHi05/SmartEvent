using System;
using System.Collections.Generic;
using TicketSystem.Domain.Common;

namespace TicketSystem.Domain.Entities
{
    public class Event : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        
        // Sức chứa và kiểm soát tải
        public int MaxCapacity { get; set; }
        public int CurrentOccupancy { get; set; } // Số người hiện đang có mặt trong sự kiện

        // Cấu hình chính sách
        public decimal BasePrice { get; set; }
        public int CancellationDeadlineHours { get; set; } // Thời hạn hủy trước bao nhiêu tiếng

        // Navigation properties
        public virtual ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();

        // Logic kiểm soát tải (Helper method)
        public bool IsFull() => CurrentOccupancy >= MaxCapacity;
    }
}