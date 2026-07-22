using System;
using System.Threading.Tasks;
using TicketSystem.Application.Interfaces;
using TicketSystem.Application.Common;
using TicketSystem.Domain.Entities;

namespace TicketSystem.Application.Strategies
{
    public class PartialRefundStrategy : IRefundStrategy
    {
        private readonly ISettingsService _settingsService;

        public PartialRefundStrategy(ISettingsService settingsService)
        {
            _settingsService = settingsService;
        }

        public string PolicyName => "Hoàn tiền một phần theo thời gian";
        public string PolicyDescription => "Hoàn theo mốc: >7 ngày 100%, 3-7 ngày 75%, 1-3 ngày 50%, <24h 0%.";

        public async Task<RefundCalculationResult> CalculateRefundAsync(Order order, DateTime cancellationTime)
        {
            if (order.Event == null)
            {
                return new RefundCalculationResult
                {
                    TotalPrice = order.TotalPrice,
                    RefundPercentage = 0,
                    FinalRefundAmount = 0,
                    Reason = "Event not found"
                };
            }

            var hoursBeforeEvent = (VietnamTime.ToVietnamTime(order.Event.StartTime) - VietnamTime.Now).TotalHours;

            var threshold7Days = await _settingsService.GetSettingAsIntAsync(SystemSettings.REFUND_THRESHOLD_7_DAYS, 168);
            var threshold3Days = await _settingsService.GetSettingAsIntAsync(SystemSettings.REFUND_THRESHOLD_3_DAYS, 72);
            var threshold1Day = await _settingsService.GetSettingAsIntAsync(SystemSettings.REFUND_THRESHOLD_1_DAY, 24);

            var percent100 = await _settingsService.GetSettingAsDecimalAsync(SystemSettings.REFUND_PERCENT_FULL, 100);
            var percent75 = await _settingsService.GetSettingAsDecimalAsync(SystemSettings.REFUND_PERCENT_75, 75);
            var percent50 = await _settingsService.GetSettingAsDecimalAsync(SystemSettings.REFUND_PERCENT_50, 50);
            var percent0 = await _settingsService.GetSettingAsDecimalAsync(SystemSettings.REFUND_PERCENT_0, 0);

            decimal refundPercentage;
            string reason;

            if (hoursBeforeEvent > threshold7Days) { refundPercentage = percent100; reason = "Refund 100% (>7 days before event)"; }
            else if (hoursBeforeEvent > threshold3Days) { refundPercentage = percent75; reason = "Refund 75% (3-7 days before event)"; }
            else if (hoursBeforeEvent > threshold1Day) { refundPercentage = percent50; reason = "Refund 50% (1-3 days before event)"; }
            else { refundPercentage = percent0; reason = "No refund (<24 hours before event)"; }

            var feePercent = await _settingsService.GetRefundFeePercentAsync();
            var refundBeforeFee = (order.TotalPrice * refundPercentage) / 100;
            var feeAmount = (refundBeforeFee * feePercent) / 100;

            return new RefundCalculationResult
            {
                TotalPrice = order.TotalPrice,
                RefundPercentage = refundPercentage,
                RefundBeforeFee = refundBeforeFee,
                RefundFeePercent = feePercent,
                RefundFeeAmount = feeAmount,
                FinalRefundAmount = refundBeforeFee - feeAmount,
                Reason = reason
            };
        }
    }
}