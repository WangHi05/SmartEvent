using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TicketSystem.Application.Interfaces;

namespace TicketSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MyTicketsController : ControllerBase
{
    private readonly IOrderService _orderService;

    public MyTicketsController(IOrderService orderService)
    {
        _orderService = orderService;
    }

    [HttpGet]
    public async Task<IActionResult> GetMyTickets()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userId, out var userIdGuid))
        {
            return Unauthorized(new { message = "Invalid user ID" });
        }

        var result = await _orderService.GetUserTicketsAsync(userIdGuid);
        return Ok(result);
    }
}
