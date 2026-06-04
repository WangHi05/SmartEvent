using System;
using System.ComponentModel.DataAnnotations;
using TicketSystem.Domain.Entities;
using TicketSystem.Domain.Common;

namespace TicketSystem.Application.DTOs
{
    
    /// DTO cho việc tạo mới Event
    
    public class CreateEventDto
    {
        [Required(ErrorMessage = "Tên sự kiện là bắt buộc")]
        [StringLength(200, ErrorMessage = "Tên sự kiện không được vượt quá 200 ký tự")]
        public string Name { get; set; } = string.Empty;

        [StringLength(1000, ErrorMessage = "Mô tả không được vượt quá 1000 ký tự")]
        public string Description { get; set; } = string.Empty;

        [Required(ErrorMessage = "Địa điểm là bắt buộc")]
        public string Location { get; set; } = string.Empty;

        [StringLength(500, ErrorMessage = "Đường dẫn ảnh không được vượt quá 500 ký tự")]
        public string? ImageUrl { get; set; }

        [Required(ErrorMessage = "Thời gian bắt đầu là bắt buộc")]
        public DateTime StartTime { get; set; }

        [Required(ErrorMessage = "Thời gian kết thúc là bắt buộc")]
        public DateTime EndTime { get; set; }

        [Range(1, 100000, ErrorMessage = "Sức chứa phải từ 1 đến 100,000")]
        public int MaxCapacity { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Giá vé phải >= 0")]
        public decimal BasePrice { get; set; }

        [Range(0, 720, ErrorMessage = "Thời hạn hủy từ 0 đến 720 giờ (30 ngày)")]
        public int CancellationDeadlineHours { get; set; } = 48; // Mặc định 48h
    }

    
    /// DTO cho việc cập nhật Event
    
    public class UpdateEventDto
    {
        [Required]
        public Guid Id { get; set; }

        [StringLength(200)]
        public string? Name { get; set; }

        [StringLength(1000)]
        public string? Description { get; set; }

        public string? Location { get; set; }

        [StringLength(500)]
        public string? ImageUrl { get; set; }
        public DateTime? StartTime { get; set; }
        public DateTime? EndTime { get; set; }

        [Range(1, 100000)]
        public int? MaxCapacity { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? BasePrice { get; set; }

        [Range(0, 720)]
        public int? CancellationDeadlineHours { get; set; }
    }

    
    /// DTO cho việc trả về thông tin Event
    
    public class EventResponseDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;

        public string? ImageUrl { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public int MaxCapacity { get; set; }
        public int CurrentOccupancy { get; set; }
        public decimal BasePrice { get; set; }
        public int CancellationDeadlineHours { get; set; }
        public bool IsFull { get; set; }
        public int Status { get; set; }
        public int EventMode { get; set; } // 1 = ShortDay, 2 = MultiDay
        public int EventDurationDays { get; set; } // Số ngày sự kiện kéo dài
        public DateTime CreatedAt { get; set; }
        public string? CreatedBy { get; set; }
    }

    
    /// DTO cho danh sách Event với phân trang
    
    public class EventListDto
    {
        public List<EventResponseDto> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
    }

    public class EventSearchRequest
    {
        public string? Keyword { get; set; }
        public string? Location { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public EventStatus? Status { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }
}
