using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Services;
using TicketSystem.Application.Interfaces;

namespace TicketSystem.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin,Manager,Staff")]
    public class HelpDeskController : ControllerBase
    {
        private readonly IHelpDeskService _helpDeskService;

        // Tiêm (Inject) IHelpDeskService vào Controller thông qua Constructor
        public HelpDeskController(IHelpDeskService helpDeskService)
        {
            _helpDeskService = helpDeskService;
        }

        /// <summary>
        /// API: GET /api/helpdesk/search?keyword=...
        /// Tìm kiếm vé dựa trên SĐT, CCCD hoặc Tên
        /// </summary>
        [HttpGet("search")]
        public async Task<IActionResult> SearchTickets([FromQuery] string keyword)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(keyword))
                {
                    return BadRequest(new { message = "Vui lòng cung cấp từ khóa tìm kiếm." });
                }

                var result = await _helpDeskService.SearchTicketsAsync(keyword);
                return Ok(result); // Trả về HTTP 200 kèm danh sách vé
            }
            catch (Exception ex)
            {
                // Trả về lỗi 500 nếu có lỗi hệ thống, không làm crash server
                return StatusCode(500, new { message = "Lỗi máy chủ: " + ex.Message });
            }
        }

        /// <summary>
        /// API: POST /api/helpdesk/tickets/{ticketId}/revoke-reissue
        /// Sự cố 1 & 2: Thu hồi vé cũ, cấp vé/mã QR mới
        /// </summary>
        [HttpPost("tickets/{ticketId}/revoke-reissue")]
        public async Task<IActionResult> RevokeAndReissue(Guid ticketId, [FromBody] RevokeAndReissueRequestDto request)
        {
            try
            {
                // Kiểm tra dữ liệu đầu vào (Validation) dựa trên Data Annotations ở DTO
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var result = await _helpDeskService.RevokeAndReissueAsync(ticketId, request);
                
                return Ok(new 
                { 
                    message = "Đã thu hồi vé cũ và cấp thẻ mới thành công.",
                    data = result 
                });
            }
            catch (Exception ex)
            {
                // Nếu Exception ném ra từ Service (ví dụ: "Không tìm thấy vé"), trả về HTTP 400 (Lỗi do client/nghiệp vụ)
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// API: POST /api/helpdesk/tickets/{ticketId}/manual-checkin
        /// Sự cố 1: Check-in thủ công khi mất mạng/hư máy quét
        /// </summary>
        [HttpPost("tickets/{ticketId}/manual-checkin")]
        public async Task<IActionResult> ManualCheckIn(Guid ticketId, [FromBody] ManualCheckInRequestDto request) // Tái sử dụng DTO vì payload giống nhau (reason, actionBy)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var success = await _helpDeskService.ManualCheckInAsync(ticketId, request.PeopleCount, request.Reason, request.ActionBy);

                if (success)
                {
                    return Ok(new { message = "Check-in thủ công thành công." });
                }

                return BadRequest(new { message = "Không thể Check-in thủ công." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}