using System;
using System.Threading.Tasks;
using TicketSystem.Application.Interfaces;
using TicketSystem.Application.Common;
using TicketSystem.Domain.Entities;

namespace TicketSystem.Application.Strategies
{
    /// <summary>
    /// Chính sách hoàn tiền cố định (hardcode), không phụ thuộc cấu hình SystemSettings:
    /// - Hủy trước hơn 7 ngày: hoàn 100%
    /// - Hủy trong khoảng 3-7 ngày: hoàn 50%
    /// - Hủy dưới 3 ngày: KHÔNG được hủy (chặn ở bước validate, không tới đây)
    /// </summary>
    public class PartialRefundStrategy : IRefundStrategy
    {
        private const int ThresholdSevenDaysHours = 168; // 7 ngày
        private const int ThresholdThreeDaysHours = 72;  // 3 ngày

        public string PolicyName => "Hoàn tiền theo thời gian hủy";
        public string PolicyDescription => "Hủy trước >7 ngày: hoàn 100%. Hủy trong 3-7 ngày: hoàn 50%. Dưới 3 ngày: không được hủy.";

        public Task<RefundCalculationResult> CalculateRefundAsync(Order order, DateTime cancellationTime)
        {
            if (order.Event == null)
            {
                return Task.FromResult(new RefundCalculationResult
                {
                    TotalPrice = order.TotalPrice,
                    RefundPercentage = 0,
                    FinalRefundAmount = 0,
                    Reason = "Event not found"
                });
            }

            var hoursBeforeEvent = (VietnamTime.ToVietnamTime(order.Event.StartTime) - VietnamTime.Now).TotalHours;

            decimal refundPercentage;
            string reason;

            if (hoursBeforeEvent >= ThresholdSevenDaysHours)
            {
                refundPercentage = 100;
                reason = "Hủy trước hơn 7 ngày so với sự kiện — hoàn 100% giá trị vé";
            }
            else if (hoursBeforeEvent >= ThresholdThreeDaysHours)
            {
                refundPercentage = 50;
                reason = "Hủy trong khoảng 3-7 ngày trước sự kiện — hoàn 50% giá trị vé";
            }
            else
            {
                // Về lý thuyết không tới được đây vì đã chặn ở ValidateCancelConditions,
                // nhưng vẫn giữ để an toàn (defensive).
                refundPercentage = 0;
                reason = "Hủy trong vòng 3 ngày trước sự kiện — không được hủy/hoàn tiền";
            }

            var refundBeforeFee = (order.TotalPrice * refundPercentage) / 100;

            return Task.FromResult(new RefundCalculationResult
            {
                TotalPrice = order.TotalPrice,
                RefundPercentage = refundPercentage,
                RefundBeforeFee = refundBeforeFee,
                RefundFeePercent = 0, // Không áp dụng phí xử lý — hoàn đúng % công bố
                RefundFeeAmount = 0,
                FinalRefundAmount = refundBeforeFee,
                Reason = reason
            });
        }
    }
}