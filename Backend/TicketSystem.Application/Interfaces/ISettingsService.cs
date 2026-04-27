using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TicketSystem.Domain.Common;
using TicketSystem.Domain.Entities;

namespace TicketSystem.Application.Interfaces
{
    /// <summary>
    /// Service để quản lý cấu hình hệ thống
    /// </summary>
    public interface ISettingsService
    {
        /// <summary>
        /// Lấy giá trị setting theo key
        /// </summary>
        Task<string?> GetSettingValueAsync(string key);

        /// <summary>
        /// Lấy giá trị setting dưới dạng int
        /// </summary>
        Task<int> GetSettingAsIntAsync(string key, int defaultValue = 0);

        /// <summary>
        /// Lấy giá trị setting dưới dạng decimal
        /// </summary>
        Task<decimal> GetSettingAsDecimalAsync(string key, decimal defaultValue = 0);

        /// <summary>
        /// Lấy giá trị setting dưới dạng bool
        /// </summary>
        Task<bool> GetSettingAsBoolAsync(string key, bool defaultValue = false);

        /// <summary>
        /// Lấy tất cả settings
        /// </summary>
        Task<List<SystemSettings>> GetAllSettingsAsync();

        /// <summary>
        /// Cập nhật setting
        /// </summary>
        Task<SystemSettings> UpdateSettingAsync(string key, string value);

        /// <summary>
        /// Khởi tạo settings mặc định nếu chưa có
        /// </summary>
        Task<bool> InitializeDefaultSettingsAsync();

        /// <summary>
        /// Lấy RefundPolicy enum từ setting
        /// </summary>
        Task<RefundPolicy> GetRefundPolicyAsync();

        /// <summary>
        /// Lấy số giờ hủy tối thiểu trước sự kiện
        /// </summary>
        Task<int> GetCancelHoursBeforeEventAsync();

        /// <summary>
        /// Lấy phí xử lý hoàn tiền (%)
        /// </summary>
        Task<decimal> GetRefundFeePercentAsync();

        /// <summary>
        /// Kiểm tra có tự động hoàn tiền hay không
        /// </summary>
        Task<bool> IsAutoRefundEnabledAsync();

        /// <summary>
        /// Kiểm tra có tự động trả ghế khi hủy hay không
        /// </summary>
        Task<bool> IsAutoReleaseSeatEnabledAsync();

        /// <summary>
        /// Kiểm tra có cho phép hủy vé khi đơn đang chờ xử lý hay không
        /// </summary>
        Task<bool> IsAllowCancelWhenPendingAsync();

        /// <summary>
        /// Lấy số lần hủy tối đa trên một người dùng trong một tháng
        /// </summary>
        Task<int> GetMaxCancelPerUserPerMonthAsync();
    }
}
