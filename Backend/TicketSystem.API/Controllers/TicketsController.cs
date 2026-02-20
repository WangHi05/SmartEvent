using Microsoft.AspNetCore.Mvc;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Services;

namespace TicketSystem.API.Controllers
{
    /// <summary>
    /// Controller quản lý Tickets - Hủy vé, hoàn tiền
    /// </summary>
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

        /// <summary>
        /// Hủy vé và xử lý hoàn tiền
        /// </summary>
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

        /// <summary>
        /// Lấy danh sách các chính sách hoàn tiền khả dụng
        /// </summary>
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
