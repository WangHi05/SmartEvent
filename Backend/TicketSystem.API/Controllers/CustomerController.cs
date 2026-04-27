using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TicketSystem.Application.Interfaces;

namespace TicketSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CustomerController : ControllerBase
{
    private readonly IOrderService _orderService;

    public CustomerController(IOrderService orderService)
    {
        _orderService = orderService;
    }

    [HttpGet("me")]
    [Authorize]
    public IActionResult GetCurrentCustomer()
    {
        return Ok(new
        {
            id = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
            username = User.FindFirst(ClaimTypes.Name)?.Value,
            role = User.FindFirst(ClaimTypes.Role)?.Value
        });
    }

    [HttpGet("my-orders")]
    [Authorize]
    public async Task<IActionResult> GetMyOrders(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] int? paymentStatus = null)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userId, out var userIdGuid))
        {
            return Unauthorized(new { message = "Invalid user ID" });
        }

        var result = await _orderService.GetUserOrdersAsync(userIdGuid, pageNumber, pageSize, paymentStatus);
        return Ok(result);
    }
}
