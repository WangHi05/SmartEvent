using System;
using System.ComponentModel.DataAnnotations;
using TicketSystem.Domain.Common;

namespace TicketSystem.Application.DTOs
{
    /// <summary>
    /// DTO cho yêu cầu hủy vé
    /// </summary>
    public class CancelTicketDto
    {
        [Required]
        public Guid TicketId { get; set; }

        [StringLength(500)]
        public string? Reason { get; set; } // Lý do hủy (tùy chọn)

        public string? RefundStrategyType { get; set; } // Tên strategy: "Full", "Partial", "None"
    }

    /// <summary>
    /// DTO trả về kết quả hủy vé
    /// </summary>
    public class CancelTicketResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public decimal RefundAmount { get; set; }
        public string RefundPolicyApplied { get; set; } = string.Empty;
        public TicketStatus NewStatus { get; set; }
    }

    /// <summary>
    /// DTO cho cấu hình Settings hệ thống
    /// </summary>
    public class SystemSettingsDto
    {
        public string DefaultRefundStrategy { get; set; } = "Partial"; // Full, Partial, None
        public int DefaultCancellationDeadlineHours { get; set; } = 48;
        public bool EnableAutoRefund { get; set; } = true;
        public decimal RefundProcessingFeePercent { get; set; } = 0; // Phí xử lý hoàn tiền (%)
    }

    /// <summary>
    /// DTO cho Audit Log
    /// </summary>
    public class AuditLogDto
    {
        public Guid Id { get; set; }
        public DateTime Timestamp { get; set; }
        public string Action { get; set; } = string.Empty; // Create, Update, Delete, CheckIn, Cancel, Refund
        public string EntityType { get; set; } = string.Empty; // Event, Ticket, User
        public Guid EntityId { get; set; }
        public string PerformedBy { get; set; } = string.Empty; // Username hoặc UserId
        public string? Details { get; set; } // JSON string với thông tin chi tiết
        public string? IpAddress { get; set; }
    }

    /// <summary>
    /// DTO cho danh sách Audit Log với filter và phân trang
    /// </summary>
    public class AuditLogQueryDto
    {
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public string? Action { get; set; }
        public string? EntityType { get; set; }
        public string? PerformedBy { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }
}
