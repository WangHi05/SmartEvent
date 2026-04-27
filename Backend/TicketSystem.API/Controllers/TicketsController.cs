using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Interfaces;

namespace TicketSystem.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TicketsController : ControllerBase
    {
        private readonly ITicketCheckInService _checkInService;
        private readonly IOrderService _orderService;

        public TicketsController(ITicketCheckInService checkInService, IOrderService orderService)
        {
            _checkInService = checkInService;
            _orderService = orderService;
        }

        [HttpPost("{id}/checkin")]
        public async Task<IActionResult> CheckIn(Guid id)
        {
            try
            {
                var result = await _checkInService.CheckInAsync(id);
                
                if (!result.IsSuccess)
                    return BadRequest(new { message = result.Message });

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống máy chủ: " + ex.Message });
            }
        }

        /// <summary>
        /// Get all tickets for the current user
        /// </summary>
        [HttpGet("my-tickets")]
        [Authorize]
        public async Task<IActionResult> GetMyTickets()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userId, out var userIdGuid))
                    return Unauthorized(new { message = "Invalid user ID" });

                var result = await _orderService.GetUserTicketsAsync(userIdGuid);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Cancel a ticket
        /// </summary>
        [HttpDelete("{ticketId}")]
        [Authorize]
        public async Task<IActionResult> CancelTicket(Guid ticketId)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userId, out var userIdGuid))
                    return Unauthorized(new { message = "Invalid user ID" });

                var result = await _orderService.CancelTicketAsync(ticketId, userIdGuid);
                if (result)
                    return Ok(new { message = "Ticket cancelled successfully" });

                return BadRequest(new { message = "Failed to cancel ticket" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}