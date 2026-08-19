using System.ComponentModel.DataAnnotations;

namespace TicketSystem.Application.DTOs;

public class CreateOrderItemDto
{
    [Required]
    public Guid TicketTypeId { get; set; }

    [Required]
    [Range(1, int.MaxValue, ErrorMessage = "Quantity must be at least 1")]
    public int Quantity { get; set; }

    [Required]
    public int MemberCount { get; set; } = 1;
}

public class CreateOrderDto
{
    [Required]
    public Guid EventId { get; set; }

    [Required]
    [MinLength(1, ErrorMessage = "Đơn hàng phải có ít nhất 1 loại vé")]
    public List<CreateOrderItemDto> Items { get; set; } = new();

    [Required]
    [Range(1, 3, ErrorMessage = "Invalid payment method")]
    public int PaymentMethod { get; set; } // 1=VNPAY, 2=QRPayment, 3=Counter

    public string? BuyerName { get; set; }
    public string? BuyerPhone { get; set; }
    public string? BuyerCccd { get; set; }
}

public class OrderResponseDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string BuyerName { get; set; } = string.Empty;
    public string BuyerUsername { get; set; } = string.Empty;
    public Guid EventId { get; set; }
    public string EventName { get; set; } = string.Empty;
    public decimal TotalPrice { get; set; }
    public int OrderStatus { get; set; }
    public string OrderStatusName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public Guid TicketTypeId { get; set; }
    public string TicketTypeName { get; set; } = string.Empty;
    public int PaymentStatus { get; set; }
    public string PaymentStatusName { get; set; } = string.Empty;
    public DateTime? ConfirmedAt { get; set; }
    public string? ConfirmedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<OrderItemResponseDto> Items { get; set; } = new();
    public List<PaymentResponseDto> Payments { get; set; } = new();
    public decimal? RefundAmount { get; set; }
    public int RefundStatus { get; set; }
}

public class OrderItemResponseDto
{
    public Guid TicketTypeId { get; set; }
    public string TicketTypeName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public int MemberCount { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Subtotal { get; set; }
}

public class PaymentResponseDto
{
    public Guid Id { get; set; }
    public decimal Amount { get; set; }
    public int PaymentMethod { get; set; } // 1=VNPAY, 2=QRPayment, 3=Counter
    public string PaymentMethodName { get; set; } = string.Empty;
    public int PaymentStatus { get; set; } // 0=Pending, 1=Completed, 2=Failed, 3=Cancelled
    public string PaymentStatusName { get; set; } = string.Empty;
    public string TransactionReference { get; set; } = string.Empty;
    public DateTime? PaidAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateOrderResponseDto
{
    public Guid OrderId { get; set; }
    public decimal TotalPrice { get; set; }
    public int PaymentMethod { get; set; }
    public string PaymentMethodName { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

public class PagedOrdersResponseDto
{
    public List<OrderResponseDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
}

public class ExportReportLineDto
{
    public int STT { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string TicketType { get; set; } = string.Empty;
    public decimal TicketPrice { get; set; }
    public string PaymentStatus { get; set; } = string.Empty;
    public string? CheckinTime { get; set; }
}

public class ExportReportDataDto
{
    public string ReportName { get; set; } = string.Empty;
    public string EventName { get; set; } = string.Empty;
    public DateTime ExportDate { get; set; } = DateTime.UtcNow;
    public List<ExportReportLineDto> Lines { get; set; } = new();
}

public class ExportSummaryReportDataDto
{
    public string ReportName { get; set; } = string.Empty;
    public DateTime ExportDate { get; set; } = DateTime.UtcNow;
    public List<EventSummaryLineDto> Lines { get; set; } = new();
}

public class EventSummaryLineDto
{
    public int STT { get; set; }
    public string EventName { get; set; } = string.Empty;
    public int TotalOrders { get; set; }
    public int TotalTickets { get; set; }
    public decimal TotalRevenue { get; set; }
    public int CompletedPayments { get; set; }
    public int PendingPayments { get; set; }
}

public class VnPayOrderTokenResultDto
{
    public string Token { get; set; } = string.Empty;
    public decimal TotalPrice { get; set; }
}

// Payload được mã hóa + ký (HMAC) rồi nhét vào vnp_ReturnUrl khi khởi tạo thanh toán VNPay.
// Đặt tên field ngắn (U, E, I, N, P, C, Cb) để giảm độ dài token trên URL.
public class VnPayOrderTokenPayload
{
    public Guid U { get; set; } // UserId
    public Guid E { get; set; } // EventId
    public List<VnPayTokenItem> I { get; set; } = new(); // Items
    public string? N { get; set; } // BuyerName
    public string? P { get; set; } // BuyerPhone
    public string? C { get; set; } // BuyerCccd
    public string Cb { get; set; } = string.Empty; // CreatedBy
}

public class VnPayTokenItem
{
    public Guid T { get; set; } // TicketTypeId
    public int Q { get; set; } // Quantity
    public int M { get; set; } // MemberCount
}
