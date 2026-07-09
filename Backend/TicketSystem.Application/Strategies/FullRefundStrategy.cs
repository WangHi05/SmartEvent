using System;
using TicketSystem.Domain.Entities;
using TicketSystem.Application.Interfaces;

namespace TicketSystem.Application.Strategies
{
    public class FullRefundStrategy : IRefundStrategy
    {
        public string StrategyType => "FullRefund";
        public string PolicyName => "Hoàn tiền 100%";
        public string PolicyDescription => "Hoàn lại toàn bộ giá trị vé.";

        public decimal CalculateRefundAmount(Ticket ticket, DateTime cancellationTime)
        {
            return 100000; // Mô phỏng
        }
    }
}