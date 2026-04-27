using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Interfaces;
using TicketSystem.Domain.Entities;

namespace TicketSystem.API.Controllers
{
    /// Controller quản lý Settings hệ thống
    [ApiController]
    [Route("api/[controller]")]
    public class SettingsController : ControllerBase
    {
        private readonly ILogger<SettingsController> _logger;
        private readonly ISettingsService _settingsService;

        public SettingsController(
            ILogger<SettingsController> logger,
            ISettingsService settingsService)
        {
            _logger = logger;
            _settingsService = settingsService;
        }

        /// <summary>
        /// Lấy cấu hình hệ thống hiện tại
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetSettings()
        {
            try
            {
                var settings = await _settingsService.GetAllSettingsAsync();
                return Ok(settings);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting settings");
                return StatusCode(500, new { message = "Có lỗi xảy ra" });
            }
        }

        /// <summary>
        /// Lấy một setting cụ thể theo key
        /// </summary>
        [HttpGet("{key}")]
        public async Task<IActionResult> GetSettingByKey(string key)
        {
            try
            {
                var value = await _settingsService.GetSettingValueAsync(key);
                if (value == null)
                {
                    return NotFound(new { message = $"Setting '{key}' not found" });
                }

                return Ok(new { key, value });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting setting {key}");
                return StatusCode(500, new { message = "Có lỗi xảy ra" });
            }
        }

        /// <summary>
        /// Cập nhật cấu hình hệ thống
        /// </summary>
        [HttpPut("{key}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateSetting(string key, [FromBody] UpdateSettingDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                if (string.IsNullOrWhiteSpace(dto.Value))
                {
                    return BadRequest(new { message = "Setting value cannot be empty" });
                }

                var result = await _settingsService.UpdateSettingAsync(key, dto.Value);
                _logger.LogInformation("Setting '{Key}' updated by {User}", key, User.Identity?.Name ?? "System");

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating setting");
                return StatusCode(500, new { message = "Có lỗi xảy ra khi cập nhật cấu hình" });
            }
        }

        /// <summary>
        /// Khởi tạo settings mặc định
        /// </summary>
        [HttpPost("initialize-defaults")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> InitializeDefaults()
        {
            try
            {
                var result = await _settingsService.InitializeDefaultSettingsAsync();
                if (!result)
                {
                    return BadRequest(new { message = "Settings already initialized" });
                }

                _logger.LogInformation("Default settings initialized");
                return Ok(new { message = "Default settings initialized successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error initializing default settings");
                return StatusCode(500, new { message = "Có lỗi xảy ra khi khởi tạo cấu hình" });
            }
        }

        /// <summary>
        /// Lấy cấu hình hoàn tiền chi tiết
        /// </summary>
        [HttpGet("refund-info")]
        public async Task<IActionResult> GetRefundInfo()
        {
            try
            {
                var policy = await _settingsService.GetRefundPolicyAsync();
                var feePercent = await _settingsService.GetRefundFeePercentAsync();
                var cancelHours = await _settingsService.GetCancelHoursBeforeEventAsync();
                var autoRefund = await _settingsService.IsAutoRefundEnabledAsync();
                var autoReleaseSeat = await _settingsService.IsAutoReleaseSeatEnabledAsync();

                return Ok(new
                {
                    refundPolicy = policy.ToString(),
                    refundFeePercent = feePercent,
                    cancelHoursBeforeEvent = cancelHours,
                    autoRefund,
                    autoReleaseSeat
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting refund info");
                return StatusCode(500, new { message = "Có lỗi xảy ra" });
            }
        }
    }

    /// <summary>
    /// DTO để cập nhật một setting
    /// </summary>
    public class UpdateSettingDto
    {
        public string Value { get; set; } = string.Empty;
    }
}
