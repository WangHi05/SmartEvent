using System;
using System.Collections.Generic;
using TicketSystem.Domain.Common;
using System.ComponentModel.DataAnnotations;

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
        public string Slug { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        [StringLength(500)]
        public string? ImageUrl { get; set; }
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
        public virtual ICollection<Order> Orders { get; set; } = new List<Order>();

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

        [Required]
        public EventStatus Status { get; set; } = EventStatus.Draft;

        // Logic kiểm tra xem có được phép chuyển trạng thái không
        public bool CanTransitionTo(EventStatus nextStatus)
        {
            return Status switch
            {
                EventStatus.Draft => nextStatus == EventStatus.Active || nextStatus == EventStatus.Cancelled,
                EventStatus.Active => nextStatus == EventStatus.Ongoing || nextStatus == EventStatus.Cancelled,
                EventStatus.Ongoing => nextStatus == EventStatus.Completed,
                _ => false
            };
        }
    }
}