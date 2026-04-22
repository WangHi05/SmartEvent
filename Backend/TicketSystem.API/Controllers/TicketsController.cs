using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using TicketSystem.Application.Interfaces;

namespace TicketSystem.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TicketsController : ControllerBase
    {
        private readonly ITicketCheckInService _checkInService;

        public TicketsController(ITicketCheckInService checkInService)
        {
            _checkInService = checkInService;
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
    }
}