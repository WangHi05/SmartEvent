using Microsoft.AspNetCore.Mvc;
using TicketSystem.Application.DTOs;
using TicketSystem.Domain.Entities;
using TicketSystem.Domain.Interfaces;

namespace TicketSystem.API.Controllers
{
    /// <summary>
    /// Controller quản lý Settings hệ thống
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class SettingsController : ControllerBase
    {
        private readonly ILogger<SettingsController> _logger;
        // Trong thực tế, cần có service hoặc repository để lưu/lấy settings từ DB hoặc config

        public SettingsController(ILogger<SettingsController> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Lấy cấu hình hệ thống hiện tại
        /// </summary>
        [HttpGet]
        public ActionResult<SystemSettingsDto> GetSettings()
        {
            try
            {
                // Mock data - trong thực tế nên lấy từ database hoặc configuration
                var settings = new SystemSettingsDto
                {
                    DefaultRefundStrategy = "Partial",
                    DefaultCancellationDeadlineHours = 48,
                    EnableAutoRefund = true,
                    RefundProcessingFeePercent = 2.5m
                };

                return Ok(settings);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting settings");
                return StatusCode(500, new { message = "Có lỗi xảy ra" });
            }
        }

        /// <summary>
        /// Cập nhật cấu hình hệ thống
        /// </summary>
        [HttpPut]
        // [Authorize(Roles = "Admin")]
        public ActionResult<SystemSettingsDto> UpdateSettings([FromBody] SystemSettingsDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                // TODO: Lưu vào database hoặc configuration file
                // Hiện tại chỉ mock

                _logger.LogInformation("Settings updated by {User}", User.Identity?.Name ?? "System");

                return Ok(dto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating settings");
                return StatusCode(500, new { message = "Có lỗi xảy ra khi cập nhật cấu hình" });
            }
        }
    }
}
