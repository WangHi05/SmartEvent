using System;
using System.Threading.Tasks;
using TicketSystem.Application.Interfaces;
using TicketSystem.Domain.Entities;

namespace TicketSystem.Application.Strategies
{
    public class FullRefundStrategy : IRefundStrategy
    {
        private readonly ISettingsService _settingsService;

        public FullRefundStrategy(ISettingsService settingsService)
        {
            _settingsService = settingsService;
        }

        public string PolicyName => "Hoàn tiền 100%";
        public string PolicyDescription => "Hoàn lại toàn bộ giá trị vé, chỉ trừ phí xử lý.";

        public async Task<RefundCalculationResult> CalculateRefundAsync(Order order, DateTime cancellationTime)
        {
            var feePercent = await _settingsService.GetRefundFeePercentAsync();
            var refundBeforeFee = order.TotalPrice;
            var feeAmount = (refundBeforeFee * feePercent) / 100;

            return new RefundCalculationResult
            {
                TotalPrice = order.TotalPrice,
                RefundPercentage = 100,
                RefundBeforeFee = refundBeforeFee,
                RefundFeePercent = feePercent,
                RefundFeeAmount = feeAmount,
                FinalRefundAmount = refundBeforeFee - feeAmount,
                Reason = "Full refund policy applied"
            };
        }
    }
}