using System;
using System.Threading.Tasks;
using TicketSystem.Application.Interfaces;
using TicketSystem.Domain.Entities;

namespace TicketSystem.Application.Strategies
{
    public class NoRefundStrategy : IRefundStrategy
    {
        public string PolicyName => "Không hoàn tiền";
        public string PolicyDescription => "Không hoàn tiền trong mọi trường hợp hủy.";

        public Task<RefundCalculationResult> CalculateRefundAsync(Order order, DateTime cancellationTime)
        {
            return Task.FromResult(new RefundCalculationResult
            {
                TotalPrice = order.TotalPrice,
                RefundPercentage = 0,
                RefundBeforeFee = 0,
                RefundFeePercent = 0,
                RefundFeeAmount = 0,
                FinalRefundAmount = 0,
                Reason = "No refund policy applied"
            });
        }
    }
}