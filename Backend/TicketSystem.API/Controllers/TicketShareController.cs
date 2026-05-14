using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;
using TicketSystem.Application.Services;

namespace TicketSystem.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TicketShareController : ControllerBase
    {
        private readonly ITicketShareService _ticketShareService;

        public TicketShareController(ITicketShareService ticketShareService)
        {
            _ticketShareService = ticketShareService;
        }

        [HttpPost("{ticketId}/generate-link")]
        [Authorize] 
        public async Task<IActionResult> GenerateShareLink(Guid ticketId)
        {
            try
            {
                // Lấy UserId từ JWT Token của người đang đăng nhập
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId))
                {
                    return Unauthorized(new { message = "Không xác định được danh tính người dùng." });
                }

                // Gọi Service sinh mã Token
                var token = await _ticketShareService.GenerateShareLinkAsync(ticketId, userId);

                // Trả token về cho Frontend. Frontend sẽ tự ghép thành URL hoàn chỉnh
                return Ok(new 
                { 
                    success = true,
                    token = token,
                    message = "Tạo link chia sẻ thành công."
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPost("claim")]
        [AllowAnonymous]
        public async Task<IActionResult> ClaimTicket([FromBody] ClaimTicketRequestDto request)
        {
            try
            {
                var result = await _ticketShareService.ClaimTicketAsync(request);
                
                if (result.Success)
                {
                    return Ok(result);
                }
                
                return BadRequest(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }
    }
}