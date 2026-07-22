using System;
using TicketSystem.Domain.Entities;

namespace TicketSystem.Application.Interfaces
{
    /// <summary>
    /// Strategy Pattern cho các chính sách hoàn tiền khác nhau.
    /// Mở rộng bằng cách thêm class mới (Open/Closed Principle).
    /// </summary>
    public interface IRefundStrategy
    {
        /// <summary>
        /// Tính toán số tiền hoàn lại dựa trên chính sách cụ thể.
        /// </summary>
        Task<RefundCalculationResult> CalculateRefundAsync(Order order, DateTime cancellationTime);

        string PolicyName { get; }
        string PolicyDescription { get; }
    }

    public class RefundCalculationResult
    {
        public decimal TotalPrice { get; set; }
        public decimal RefundPercentage { get; set; }
        public decimal RefundBeforeFee { get; set; }
        public decimal RefundFeePercent { get; set; }
        public decimal RefundFeeAmount { get; set; }
        public decimal FinalRefundAmount { get; set; }
        public string Reason { get; set; } = string.Empty;
    }
}