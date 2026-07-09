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
        private readonly ITicketService _ticketService; 

        public TicketsController(ITicketCheckInService checkInService, IOrderService orderService, ITicketService ticketService)
        {
            _checkInService = checkInService;
            _orderService = orderService;
            _ticketService = ticketService;
        }

        [HttpPost("{id}/checkin")]
        public async Task<IActionResult> CheckIn([FromBody] CheckInRequest request)
        {
            try
            {
                // Kiểm tra dữ liệu đầu vào (Validation)
                if (request == null || string.IsNullOrWhiteSpace(request.QrPayload))
                {
                    return BadRequest(new { message = "Dữ liệu QR không được để trống." });
                }

                // Lấy StaffId (ID nhân viên) từ JWT Token của người đang đăng nhập.
                // Nếu chưa cấu hình xong Auth, có thể tạm thời để chuỗi mặc định như "NV_001"
                string staffId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "NV_001";

                // Gọi Service với đúng 2 tham số: request và staffId
                var result = await _checkInService.ProcessScanAsync(request, staffId);
                
                if (!result.IsSuccess)
                    return BadRequest(new { message = result.Message });

                return Ok(result);
            }
            catch (Exception ex)
            {
                // Khuyên dùng: Em nên có ILogger để log lỗi ex.Message ra file text thay vì chỉ trả về cho Frontend
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
            // Trích xuất Claim ID của người dùng từ Token đã được xác thực
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null) 
                return Unauthorized(new { message = "Phiên đăng nhập không hợp lệ." });

            if (!Guid.TryParse(userIdClaim.Value, out Guid userId))
                return BadRequest(new { message = "Định dạng ID người dùng bị lỗi." });

            try
            {
                // Gọi Service ở tầng Application (Logic đã được xây dựng từ trước)
                var result = await _orderService.GetUserTicketsAsync(userId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi máy chủ: " + ex.Message });
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

        /// <summary>
        /// Lấy ngẫu nhiên một mã QR chưa sử dụng để phục vụ Load Testing (K6).
        /// </summary>
        [HttpGet("get-unused-qr-for-test")]
        [Authorize]
        public async Task<IActionResult> GetUnusedQrForTest()
        {
            // Bây giờ biến _ticketService không còn bị NULL nữa
            var qrPayload = await _ticketService.GetUnusedQrForTestAsync();

            if (string.IsNullOrEmpty(qrPayload))
            {
                return NotFound(new { message = "Không tìm thấy vé chưa sử dụng trong Database." });
            }

            return Ok(new { qrPayload = qrPayload });
        }
    }
}