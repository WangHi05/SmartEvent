using System;
using TicketSystem.Domain.Common;

namespace TicketSystem.Domain.Entities
{
    /// <summary>
    /// Cấu hình hệ thống cho chính sách hoàn tiền, hủy vé, v.v.
    /// </summary>
    public class SystemSettings : BaseEntity
    {
        public string SettingKey { get; set; } = string.Empty;
        public string SettingValue { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string DataType { get; set; } = "string"; // string, int, decimal, bool

        // Predefined setting keys
        public const string REFUND_POLICY = "RefundPolicy";
        public const string CANCEL_HOURS_BEFORE_EVENT = "CancelHoursBeforeEvent";
        public const string REFUND_FEE_PERCENT = "RefundFeePercent";
        public const string AUTO_REFUND = "AutoRefund";
        public const string AUTO_RELEASE_SEAT_WHEN_CANCEL = "AutoReleaseSeatWhenCancel";
        public const string ALLOW_CANCEL_WHEN_PENDING = "AllowCancelWhenPending";
        public const string MAX_CANCEL_PER_USER_PER_MONTH = "MaxCancelPerUserPerMonth";

        // Refund policy thresholds (in hours)
        public const string REFUND_THRESHOLD_7_DAYS = "RefundThreshold7Days";      // 168 hours = 7 days
        public const string REFUND_THRESHOLD_3_DAYS = "RefundThreshold3Days";      // 72 hours = 3 days
        public const string REFUND_THRESHOLD_1_DAY = "RefundThreshold1Day";        // 24 hours = 1 day

        // Refund percentages
        public const string REFUND_PERCENT_FULL = "RefundPercent100";              // 100%
        public const string REFUND_PERCENT_75 = "RefundPercent75";                 // 75%
        public const string REFUND_PERCENT_50 = "RefundPercent50";                 // 50%
        public const string REFUND_PERCENT_0 = "RefundPercent0";                   // 0%

        /// <summary>
        /// Factory method để tạo settings mặc định
        /// </summary>
        public static List<SystemSettings> GetDefaultSettings()
        {
            return new List<SystemSettings>
            {
                new SystemSettings
                {
                    Id = Guid.NewGuid(),
                    SettingKey = REFUND_POLICY,
                    SettingValue = "2", // PartialRefund = 2
                    DataType = "int",
                    Description = "Chính sách hoàn tiền (1=FullRefund, 2=PartialRefund, 3=NoRefund)",
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = "System"
                },
                new SystemSettings
                {
                    Id = Guid.NewGuid(),
                    SettingKey = CANCEL_HOURS_BEFORE_EVENT,
                    SettingValue = "24",
                    DataType = "int",
                    Description = "Số giờ tối thiểu trước sự kiện để cho phép hủy vé",
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = "System"
                },
                new SystemSettings
                {
                    Id = Guid.NewGuid(),
                    SettingKey = REFUND_FEE_PERCENT,
                    SettingValue = "2.5",
                    DataType = "decimal",
                    Description = "Phí xử lý hoàn tiền (%) để trừ khỏi số tiền hoàn",
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = "System"
                },
                new SystemSettings
                {
                    Id = Guid.NewGuid(),
                    SettingKey = AUTO_REFUND,
                    SettingValue = "true",
                    DataType = "bool",
                    Description = "Tự động hoàn tiền khi hủy vé",
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = "System"
                },
                new SystemSettings
                {
                    Id = Guid.NewGuid(),
                    SettingKey = AUTO_RELEASE_SEAT_WHEN_CANCEL,
                    SettingValue = "true",
                    DataType = "bool",
                    Description = "Tự động trả ghế khi hủy vé",
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = "System"
                },
                new SystemSettings
                {
                    Id = Guid.NewGuid(),
                    SettingKey = ALLOW_CANCEL_WHEN_PENDING,
                    SettingValue = "false",
                    DataType = "bool",
                    Description = "Cho phép hủy vé khi đơn đang chờ xử lý",
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = "System"
                },
                new SystemSettings
                {
                    Id = Guid.NewGuid(),
                    SettingKey = MAX_CANCEL_PER_USER_PER_MONTH,
                    SettingValue = "5",
                    DataType = "int",
                    Description = "Số lần hủy tối đa trên một người dùng trong một tháng",
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = "System"
                },
                new SystemSettings
                {
                    Id = Guid.NewGuid(),
                    SettingKey = REFUND_THRESHOLD_7_DAYS,
                    SettingValue = "168",
                    DataType = "int",
                    Description = "Ngưỡng 7 ngày (168 giờ) để hoàn 100% cho PartialRefund",
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = "System"
                },
                new SystemSettings
                {
                    Id = Guid.NewGuid(),
                    SettingKey = REFUND_THRESHOLD_3_DAYS,
                    SettingValue = "72",
                    DataType = "int",
                    Description = "Ngưỡng 3 ngày (72 giờ) để hoàn 75% cho PartialRefund",
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = "System"
                },
                new SystemSettings
                {
                    Id = Guid.NewGuid(),
                    SettingKey = REFUND_THRESHOLD_1_DAY,
                    SettingValue = "24",
                    DataType = "int",
                    Description = "Ngưỡng 1 ngày (24 giờ) để hoàn 50% cho PartialRefund",
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = "System"
                },
                new SystemSettings
                {
                    Id = Guid.NewGuid(),
                    SettingKey = REFUND_PERCENT_FULL,
                    SettingValue = "100",
                    DataType = "decimal",
                    Description = "Phần trăm hoàn tiền khi hủy > 7 ngày",
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = "System"
                },
                new SystemSettings
                {
                    Id = Guid.NewGuid(),
                    SettingKey = REFUND_PERCENT_75,
                    SettingValue = "75",
                    DataType = "decimal",
                    Description = "Phần trăm hoàn tiền khi hủy trong 3-7 ngày",
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = "System"
                },
                new SystemSettings
                {
                    Id = Guid.NewGuid(),
                    SettingKey = REFUND_PERCENT_50,
                    SettingValue = "50",
                    DataType = "decimal",
                    Description = "Phần trăm hoàn tiền khi hủy trong 1-3 ngày",
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = "System"
                },
                new SystemSettings
                {
                    Id = Guid.NewGuid(),
                    SettingKey = REFUND_PERCENT_0,
                    SettingValue = "0",
                    DataType = "decimal",
                    Description = "Phần trăm hoàn tiền khi hủy < 24 giờ",
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = "System"
                }
            };
        }
    }
}
