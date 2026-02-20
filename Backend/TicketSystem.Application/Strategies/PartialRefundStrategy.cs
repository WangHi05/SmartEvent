using System;
using TicketSystem.Application.Interfaces;
using TicketSystem.Domain.Entities;

namespace TicketSystem.Application.Strategies
{
    /// <summary>
    /// Chính sách hoàn tiền một phần (theo bậc thang thời gian)
    /// Áp dụng: Hoàn tiền theo % khác nhau tùy thời điểm hủy
    /// </summary>
    public class PartialRefundStrategy : IRefundStrategy
    {
        public string PolicyName => "Partial Refund";
        public string PolicyDescription => "Hoàn tiền theo tỷ lệ dựa trên thời điểm hủy (VD: 75% nếu >48h, 50% nếu 24-48h, 25% nếu <24h)";

        public decimal CalculateRefundAmount(Ticket ticket, DateTime cancellationTime)
        {
            if (ticket?.Event == null)
                throw new ArgumentNullException(nameof(ticket), "Ticket hoặc Event không được null");

            var hoursBeforeEvent = (ticket.Event.StartTime - cancellationTime).TotalHours;

            // Bậc thang hoàn tiền
            if (hoursBeforeEvent >= 48)
            {
                return ticket.Price * 0.75m; // Hoàn 75%
            }
            else if (hoursBeforeEvent >= 24)
            {
                return ticket.Price * 0.50m; // Hoàn 50%
            }
            else if (hoursBeforeEvent >= 6)
            {
                return ticket.Price * 0.25m; // Hoàn 25%
            }
            else
            {
                return 0; // Không hoàn tiền nếu hủy quá gần giờ diễn ra
            }
        }
    }
}
