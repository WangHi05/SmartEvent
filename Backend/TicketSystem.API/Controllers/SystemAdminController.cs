using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using TicketSystem.Application.Interfaces;
// using Microsoft.AspNetCore.Authorization; // Mở ra khi ráp JWT

namespace TicketSystem.API.Controllers
{
    /// <summary>
    /// Controller quản trị hệ thống, cấp quyền cao nhất.
    /// Thuộc Layer: API
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    // [Authorize(Roles = "Admin")] // Thầy tạm comment để em dễ test, sau này phải bật lên
    public class SystemAdminController : ControllerBase
    {
        private readonly IDatabaseManagementService _dbManagementService;

        // DI: Tiêm Interface từ Application Layer, lỏng lẻo (loose coupling)
        public SystemAdminController(IDatabaseManagementService dbManagementService)
        {
            _dbManagementService = dbManagementService;
        }

        /// <summary>
        /// API Xóa trắng dữ liệu. Cần truyền Header đặc biệt để tránh click nhầm.
        /// </summary>
        [HttpDelete("clear-database")]
        public async Task<IActionResult> ClearDatabase([FromHeader(Name = "X-Confirm-Danger")] string confirmCode)
        {
            if (!_env.IsDevelopment())
            {
                return NotFound(new { Message = "API này không tồn tại trên môi trường Production." });
            }
            // Cơ chế bảo vệ phụ: Bắt buộc client phải truyền đúng chuỗi xác nhận
            if (string.IsNullOrEmpty(confirmCode) || confirmCode != "YES_DELETE_ALL")
            {
                return BadRequest(new { 
                    Message = "Xác nhận không hợp lệ. Vui lòng truyền Header 'X-Confirm-Danger' với giá trị 'YES_DELETE_ALL'." 
                });
            }

            try
            {
                await _dbManagementService.ClearAllMockDataAsync();
                return Ok(new { Message = "Đã dọn dẹp sạch sẽ database. Sẵn sàng chạy lại Seeder!" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Có lỗi xảy ra nội bộ Server.", Error = ex.Message });
            }
        }
    }
}