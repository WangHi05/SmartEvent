using System;
using System.Collections.Generic;
using TicketSystem.Domain.Common;

namespace TicketSystem.Domain.Entities
{
    /// Enum phân loại loại sự kiện
    public enum EventMode
    {
        ShortDay = 1,    // Sự kiện trong 1 ngày (check-in 1 lần duy nhất)
        MultiDay = 2     // Sự kiện kéo dài nhiều ngày (check-in theo ngày)
    }

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
        public int CancellationDeadlineHours { get; set; } // Thời hạn hủy trước bao nhiêu tiếng

        // Navigation properties
        public virtual ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();
        public virtual ICollection<Domain.Entities.TicketType> TicketTypes { get; set; } = new List<Domain.Entities.TicketType>();

        // Tự tính EventMode từ StartTime/EndTime
        public EventMode GetEventMode()
        {
            var startDate = StartTime.Date;
            var endDate = EndTime.Date;
            return startDate == endDate ? EventMode.ShortDay : EventMode.MultiDay;
        }

        // Tính số ngày sự kiện kéo dài
        public int GetEventDurationDays()
        {
            return (EndTime.Date - StartTime.Date).Days + 1;
        }

        // Logic kiểm soát tải (Helper method)
        public bool IsFull() => CurrentOccupancy >= MaxCapacity;
    }
}