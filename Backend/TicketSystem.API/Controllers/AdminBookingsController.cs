using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Interfaces;

namespace TicketSystem.API.Controllers;

[ApiController]
[Route("api/admin/bookings")]
[Route("api/admin/orders")]
[Authorize(Roles = "Admin,Manager,Staff")]
public class AdminBookingsController : ControllerBase
{
    private readonly IOrderService _orderService;
    private readonly ICancelOrderService _cancelOrderService;

    public AdminBookingsController(IOrderService orderService, ICancelOrderService cancelOrderService)
    {
        _orderService = orderService;
        _cancelOrderService = cancelOrderService;
    }

    [HttpGet]
    public async Task<IActionResult> GetBookings(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null,
        [FromQuery] int? paymentStatus = null,
        [FromQuery] int? orderStatus = null,
        [FromQuery] Guid? eventId = null)
    {
        var result = await _orderService.GetAdminOrdersAsync(pageNumber, pageSize, search, paymentStatus, orderStatus, eventId);
        return Ok(result);
    }

    [HttpGet("{orderId:guid}")]
    public async Task<IActionResult> GetBookingDetail(Guid orderId)
    {
        var result = await _orderService.GetOrderDetailAsync(orderId, isAdmin: true);
        if (result == null)
        {
            return NotFound(new { message = "Order not found" });
        }

        return Ok(result);
    }

    [HttpPost("{orderId:guid}/confirm-payment")]
    public async Task<IActionResult> ConfirmCounterPayment(Guid orderId)
    {
        var confirmedBy = User.Identity?.Name ?? "System";
        var result = await _orderService.ConfirmCounterPaymentByAdminAsync(orderId, confirmedBy);
        return Ok(new
        {
            success = true,
            message = "Đã xác nhận thanh toán thành công",
            data = result
        });
    }

    [HttpPost("{orderId:guid}/confirm-order")]
    public async Task<IActionResult> ConfirmOnlineOrder(Guid orderId)
    {
        var confirmedBy = User.Identity?.Name ?? "System";
        var result = await _orderService.ConfirmOnlineOrderByAdminAsync(orderId, confirmedBy);
        return Ok(new
        {
            success = true,
            message = "Đơn hàng đã xác nhận",
            data = result
        });
    }

    [HttpPost("{orderId:guid}/cancel")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> CancelOrder(Guid orderId, [FromBody] CancelOrderRequestDto request)
    {
        var cancelledBy = User.Identity?.Name ?? "System";
        var reason = string.IsNullOrWhiteSpace(request?.Reason) ? "Admin cancelled order" : request.Reason;
        var result = await _orderService.CancelOrderByAdminAsync(orderId, reason, cancelledBy);
        return Ok(result);
    }

    /// <summary>
    /// NV/Admin xác nhận đã hoàn tiền cho khách (thao tác thủ công ngoài hệ thống)
    /// </summary>
    [HttpPost("{orderId:guid}/confirm-refund")]
    public async Task<IActionResult> ConfirmRefund(Guid orderId)
    {
        try
        {
            var confirmedBy = User.Identity?.Name ?? "System";
            await _cancelOrderService.ConfirmRefundCompletedAsync(orderId, confirmedBy);
            return Ok(new { success = true, message = "Đã xác nhận hoàn tiền thành công" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}