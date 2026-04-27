using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Interfaces;

namespace TicketSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BookingController : ControllerBase
{
    private readonly IOrderService _orderService;

    public BookingController(IOrderService orderService)
    {
        _orderService = orderService;
    }

    [HttpPost]
    public async Task<IActionResult> CreateBooking([FromBody] CreateOrderDto createOrderDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userId, out var userIdGuid))
        {
            return Unauthorized(new { message = "Invalid user ID" });
        }

        var username = User.FindFirst(ClaimTypes.Name)?.Value ?? "System";
        var result = await _orderService.CreateOrderAsync(userIdGuid, createOrderDto, username);
        return Ok(result);
    }

    [HttpGet("{orderId:guid}")]
    public async Task<IActionResult> GetBookingDetail(Guid orderId)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userId, out var userIdGuid))
        {
            return Unauthorized(new { message = "Invalid user ID" });
        }

        var result = await _orderService.GetOrderDetailAsync(orderId, userIdGuid);
        if (result == null)
        {
            return NotFound(new { message = "Booking not found" });
        }

        return Ok(result);
    }
}
