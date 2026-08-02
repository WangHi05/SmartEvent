using System;
using System.ComponentModel.DataAnnotations;
using TicketSystem.Domain.Common;
using TicketSystem.Domain.Entities;

namespace TicketSystem.Application.DTOs
{
    
    /// DTO cho yêu cầu hủy vé
    
    public class CancelTicketDto
    {
        [Required]
        public Guid TicketId { get; set; }

        [StringLength(500)]
        public string? Reason { get; set; } // Lý do hủy (tùy chọn)

        public string? RefundStrategyType { get; set; } // Tên strategy: "Full", "Partial", "None"
    }

    
    /// DTO trả về kết quả hủy vé
    
    public class CancelTicketResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public decimal RefundAmount { get; set; }
        public string RefundPolicyApplied { get; set; } = string.Empty;
        public TicketStatus NewStatus { get; set; }
    }

    
    /// DTO cho cấu hình Settings hệ thống
    
    public class SystemSettingsDto
    {
        public string DefaultRefundStrategy { get; set; } = "Partial"; // Full, Partial, None
        public int DefaultCancellationDeadlineHours { get; set; } = 48;
        public bool EnableAutoRefund { get; set; } = true;
        public decimal RefundProcessingFeePercent { get; set; } = 0; // Phí xử lý hoàn tiền (%)
    }

    
    /// DTO cho Audit Log
    
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

    
    /// DTO cho danh sách Audit Log với filter và phân trang
    
    public class AuditLogQueryDto
    {
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public string? Action { get; set; }
        public string? EntityType { get; set; }
        public string? PerformedBy { get; set; }
        public int PageNumber { get; set; } = 1;
        private int _pageSize = 20;
        public int PageSize 
        { 
            get => _pageSize;
            set => _pageSize = value > 20 ? 20 : value;
        }
    }

    /// <summary>
    /// DTO cho yêu cầu hủy đơn hàng
    /// </summary>
    public class CancelOrderRequestDto
    {
        [StringLength(500)]
        public string? Reason { get; set; }
    }

    /// <summary>
    /// DTO trả về kết quả hủy đơn hàng
    /// </summary>
    public class CancelOrderResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public decimal RefundAmount { get; set; }
        public DateTime? CancelledAt { get; set; }
        public string? ErrorCode { get; set; }
    }

    /// <summary>
    /// DTO cho kết quả kiểm tra xem có thể hủy hay không
    /// </summary>
    public class CancelValidationDto
    {
        public bool CanCancel { get; set; }
        public string? ReasonCannotCancel { get; set; }
        public decimal EstimatedRefundAmount { get; set; }

        public decimal EstimatedRefundPercentage { get; set; }
        public string? RefundReason { get; set; }
    }

    /// <summary>
    /// DTO cho tính toán hoàn tiền
    /// </summary>
    public class CalculateRefundDto
    {
        public decimal TotalPrice { get; set; }
        public decimal RefundPercentage { get; set; }
        public decimal RefundBeforeFee { get; set; }
        public decimal RefundFeePercent { get; set; }
        public decimal RefundFeeAmount { get; set; }
        public decimal FinalRefundAmount { get; set; }
        public string RefundReason { get; set; } = string.Empty;
    }
}
