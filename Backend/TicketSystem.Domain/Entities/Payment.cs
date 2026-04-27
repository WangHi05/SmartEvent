using System;
using TicketSystem.Domain.Common;

namespace TicketSystem.Domain.Entities
{
    public class Payment : BaseEntity
    {
        public Guid OrderId { get; set; }
        public decimal Amount { get; set; }
        public PaymentMethod PaymentMethod { get; set; }
        public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Pending;
        public string TransactionReference { get; set; } = string.Empty; // Mã giao dịch từ cổng thanh toán
        public DateTime? PaidAt { get; set; }

        // Navigation properties
        public virtual Order Order { get; set; }
    }
}
