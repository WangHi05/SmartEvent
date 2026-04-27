using TicketSystem.Application.DTOs;

namespace TicketSystem.Application.Interfaces;

public interface IOrderService
{
    Task<CreateOrderResponseDto> CreateOrderAsync(Guid userId, CreateOrderDto createOrderDto, string createdBy);
    Task<OrderResponseDto> ConfirmOrderPaymentAsync(Guid orderId, Guid userId, string transactionReference = "");
    Task<OrderResponseDto> ConfirmOrderPaymentBySystemAsync(Guid orderId, string transactionReference = "");
    Task<OrderResponseDto> ConfirmCounterPaymentByAdminAsync(Guid orderId, string confirmedBy);
    Task<OrderResponseDto> ConfirmOnlineOrderByAdminAsync(Guid orderId, string confirmedBy);
    Task<CancelOrderResponseDto> CancelOrderByAdminAsync(Guid orderId, string reason, string cancelledBy);
    Task<MyTicketsResponseDto> GetUserTicketsAsync(Guid userId);
    Task<bool> CancelTicketAsync(Guid ticketId, Guid userId);
    Task<PagedOrdersResponseDto> GetUserOrdersAsync(Guid userId, int pageNumber = 1, int pageSize = 10, int? paymentStatus = null);
    Task<PagedOrdersResponseDto> GetAdminOrdersAsync(int pageNumber = 1, int pageSize = 10, string? search = null, int? paymentStatus = null, int? orderStatus = null);
    Task<OrderResponseDto?> GetOrderDetailAsync(Guid orderId, Guid? userId = null, bool isAdmin = false);
}
