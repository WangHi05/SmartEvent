using Microsoft.AspNetCore.Mvc;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Services;

namespace TicketSystem.API.Controllers
{
    
    /// Controller quản lý Tickets - Hủy vé, hoàn tiền
    
    [ApiController]
    [Route("api/[controller]")]
    public class TicketsController : ControllerBase
    {
        private readonly TicketService _ticketService;
        private readonly ILogger<TicketsController> _logger;

        public TicketsController(TicketService ticketService, ILogger<TicketsController> logger)
        {
            _ticketService = ticketService;
            _logger = logger;
        }

        
        /// Hủy vé và xử lý hoàn tiền
        
        [HttpPost("cancel")]
        public async Task<ActionResult<CancelTicketResponseDto>> CancelTicket([FromBody] CancelTicketDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var performedBy = User.Identity?.Name ?? "System";
                var result = await _ticketService.CancelTicketAsync(dto, performedBy);

                if (!result.Success)
                    return BadRequest(result);

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cancelling ticket {TicketId}", dto.TicketId);
                return StatusCode(500, new { message = "Có lỗi xảy ra khi hủy vé" });
            }
        }

        
        /// Lấy danh sách các chính sách hoàn tiền khả dụng
        
        [HttpGet("refund-policies")]
        public ActionResult<List<RefundPolicyInfo>> GetRefundPolicies()
        {
            try
            {
                var policies = _ticketService.GetAvailableRefundPolicies();
                return Ok(policies);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting refund policies");
                return StatusCode(500, new { message = "Có lỗi xảy ra" });
            }
        }
    }
}
