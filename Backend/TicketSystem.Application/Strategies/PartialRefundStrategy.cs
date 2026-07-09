using System;
using TicketSystem.Domain.Entities;
using TicketSystem.Application.Interfaces;

namespace TicketSystem.Application.Strategies
{
    // 1. Chiến lược Hoàn một phần (Ví dụ: Hoàn 50%)
    public class PartialRefundStrategy : IRefundStrategy
    {
        public string StrategyType => "PartialRefund";
        public string PolicyName => "Hoàn tiền một phần";
        public string PolicyDescription => "Hoàn lại 50% giá trị vé nếu hủy trước 24h.";

        public decimal CalculateRefundAmount(Ticket ticket, DateTime cancellationTime)
        {
            // Logic tạm thời: Giả sử giá vé lưu ở Order hoặc TicketType
            return 50000; // Trả về con số mô phỏng
        }
    }
}