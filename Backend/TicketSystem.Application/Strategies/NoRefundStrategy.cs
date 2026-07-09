using System;
using TicketSystem.Domain.Entities;
using TicketSystem.Application.Interfaces;

namespace TicketSystem.Application.Strategies
{
    public class NoRefundStrategy : IRefundStrategy
    {
        public string StrategyType => "NoRefund";
        public string PolicyName => "Không hoàn tiền";
        public string PolicyDescription => "Vé khuyến mãi không áp dụng hoàn tiền.";

        public decimal CalculateRefundAmount(Ticket ticket, DateTime cancellationTime)
        {
            return 0; // Không trả lại đồng nào
        }
    }
}