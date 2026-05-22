using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Interfaces;
using System.Text;
using Microsoft.EntityFrameworkCore;

namespace TicketSystem.API.Controllers
{
    /// <summary>
    /// Controller quản lý các nghiệp vụ kiểm soát vào cổng (Check-in)
    /// </summary>
    [ApiController]
    [Route("api/[controller]")] // Định tuyến tự động thành: /api/checkin
    public class CheckinController : ControllerBase
    {
        private readonly ITicketCheckInService _checkInService;
        private readonly ILogger<CheckinController> _logger;

        // Dependency Injection (DI): Tiêm Service và Logger vào Controller
        public CheckinController(ITicketCheckInService checkInService, ILogger<CheckinController> logger)
        {
            _checkInService = checkInService;
            _logger = logger;
        }

        /// <summary>
        /// API xử lý quét mã QR tại cổng.
        /// </summary>
        /// <param name="request">Payload chứa mã QR quét được từ Frontend</param>
        [HttpPost("scan")]
        [Authorize(Roles = "Admin,Manager,Staff")] 
        public async Task<IActionResult> ScanTicket([FromBody] CheckInRequest request)
        {
            // 1. Kiểm tra tính hợp lệ của Model Binding cơ bản
            if (!ModelState.IsValid)
            {
                return BadRequest(CheckInResponse.Fail("Dữ liệu gửi lên không đúng định dạng."));
            }

            // 2. Trích xuất mã nhân viên (StaffId) từ JWT Token đã được xác thực
            // ClaimTypes.NameIdentifier thường lưu trữ User ID khi ta tạo Token
            var staffId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            
            if (string.IsNullOrEmpty(staffId))
            {
                _logger.LogWarning("Check-in thất bại: Không tìm thấy định danh nhân viên trong Token.");
                return Unauthorized(CheckInResponse.Fail("Phiên đăng nhập không hợp lệ hoặc thiếu quyền thao tác."));
            }

            try
            {
                // 3. Chuyển giao dữ liệu cho tầng Application xử lý nghiệp vụ lõi
                var result = await _checkInService.ProcessScanAsync(request, staffId);

                // 4. Xử lý kết quả trả về dựa trên cờ IsSuccess của DTO
                if (result.IsSuccess)
                {
                    _logger.LogInformation("Check-in thành công. Nhân viên: {StaffId}, Payload: {Payload}", staffId, request.QrPayload);
                    return Ok(result); // Trả về HTTP 200 OK cùng dữ liệu hiển thị (Tên KH, Loại vé)
                }
                else
                {
                    _logger.LogWarning("Từ chối vào cổng. Payload: {Payload}, Lý do: {Message}", request.QrPayload, result.Message);
                    // Trả về HTTP 400 Bad Request kèm theo câu thông báo lỗi chi tiết để React hiển thị
                    return BadRequest(result); 
                }
            }
            catch (Exception ex)
            {
                // 5. Exception Handling: Log chi tiết inner exception, nhưng trả về message thân thiện cho UI
                try
                {
                    var sb = new StringBuilder();
                    sb.AppendLine("Unhandled exception in ScanTicket: " + ex.Message);
                    var inner = ex.InnerException;
                    while (inner != null)
                    {
                        sb.AppendLine("Inner: " + inner.Message);
                        inner = inner.InnerException;
                    }

                    if (ex is DbUpdateException dbEx)
                    {
                        sb.AppendLine("DbUpdateException entries:");
                        if (dbEx.Entries != null)
                        {
                            foreach (var entry in dbEx.Entries)
                            {
                                try
                                {
                                    var json = System.Text.Json.JsonSerializer.Serialize(entry.Entity);
                                    sb.AppendLine($"Entry {entry.Entity.GetType().FullName}: {json}");
                                }
                                catch
                                {
                                    sb.AppendLine($"Entry {entry.Entity.GetType().FullName}: <serialization failed>");
                                }
                            }
                        }
                    }

                    _logger.LogError(ex, sb.ToString());
                }
                catch (Exception logEx)
                {
                    _logger.LogError(ex, "Exception occurred while handling exception for payload {Payload}: {LogError}", request?.QrPayload, logEx.Message);
                }

                // Trả về một DTO lỗi chuẩn hóa cho Frontend (không leak stacktrace)
                return StatusCode(500, CheckInResponse.Fail("Đã xảy ra lỗi hệ thống. Vui lòng liên hệ bộ phận kỹ thuật."));
            }
        }
    }
}