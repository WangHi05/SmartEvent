using System;
using TicketSystem.Application.Interfaces;
using TicketSystem.Domain.Entities;

namespace TicketSystem.Application.Strategies
{
    
    /// Chính sách hoàn tiền 100%
    /// Áp dụng: Hủy vé trước thời hạn quy định (ví dụ: trước 48h)
    
    public class FullRefundStrategy : IRefundStrategy
    {
        public string PolicyName => "Full Refund";
        public string PolicyDescription => "Hoàn lại 100% giá trị vé khi hủy trước thời hạn quy định";

        public decimal CalculateRefundAmount(Ticket ticket, DateTime cancellationTime)
        {
            if (ticket?.Event == null)
                throw new ArgumentNullException(nameof(ticket), "Ticket hoặc Event không được null");

            // Kiểm tra thời gian hủy so với deadline
            var deadlineTime = ticket.Event.StartTime.AddHours(-ticket.Event.CancellationDeadlineHours);
            
            if (cancellationTime <= deadlineTime)
            {
                // Đủ điều kiện hoàn 100%
                return ticket.Price;
            }

            // Quá hạn, không hoàn tiền
            return 0;
        }
    }
}
