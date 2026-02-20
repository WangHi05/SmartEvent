using System;
using TicketSystem.Application.Interfaces;
using TicketSystem.Domain.Entities;

namespace TicketSystem.Application.Strategies
{
    /// <summary>
    /// Chính sách không hoàn tiền
    /// Áp dụng: Các sự kiện đặc biệt, vé khuyến mãi, hoặc vé miễn phí
    /// </summary>
    public class NoRefundStrategy : IRefundStrategy
    {
        public string PolicyName => "No Refund";
        public string PolicyDescription => "Không hoàn tiền trong bất kỳ trường hợp nào (vé đặc biệt hoặc khuyến mãi)";

        public decimal CalculateRefundAmount(Ticket ticket, DateTime cancellationTime)
        {
            // Luôn trả về 0 - không hoàn tiền
            return 0;
        }
    }
}
