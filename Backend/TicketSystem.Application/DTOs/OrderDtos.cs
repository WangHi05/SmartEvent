using System.ComponentModel.DataAnnotations;

namespace TicketSystem.Application.DTOs;

public class CreateOrderDto
{
    [Required]
    public Guid EventId { get; set; }

    [Required]
    public Guid TicketTypeId { get; set; }

    [Required]
    [Range(1, int.MaxValue, ErrorMessage = "Quantity must be at least 1")]
    public int Quantity { get; set; }

    [Required]
    [Range(1, 3, ErrorMessage = "Invalid payment method")]
    public int PaymentMethod { get; set; } // 1=VNPAY, 2=QRPayment, 3=Counter
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
    public List<PaymentResponseDto> Payments { get; set; } = new();
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
