using System;
using System.Collections.Generic;
using TicketSystem.Domain.Common;

namespace TicketSystem.Domain.Entities
{
    public class Order : BaseEntity
    {
        public Guid CustomerId { get; set; }
        public Guid EventId { get; set; }
        public decimal TotalPrice { get; set; }
        public OrderStatus OrderStatus { get; set; } = OrderStatus.Pending;
        public int Quantity { get; set; } // Số vé đặt
        public Guid TicketTypeId { get; set; } // Loại vé

        // Cancel + Refund related fields
        public DateTime? CancelRequestAt { get; set; }
        public DateTime? RefundedAt { get; set; }
        public decimal? RefundAmount { get; set; }
        public DateTime? ConfirmedAt { get; set; }
        public string? ConfirmedBy { get; set; }

        // Navigation properties
        public virtual Customer Customer { get; set; }
        public virtual Event Event { get; set; }
        public virtual Domain.Entities.TicketType TicketType { get; set; }
        public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();
        public virtual ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();

        public string? BuyerName { get; set; }
        public string? BuyerPhone { get; set; }
        public string? BuyerCccd { get; set; }

        public RefundStatus RefundStatus { get; set; } = RefundStatus.NotApplicable;
        public DateTime? RefundConfirmedAt { get; set; }
        public string? RefundConfirmedBy { get; set; }
    }
}