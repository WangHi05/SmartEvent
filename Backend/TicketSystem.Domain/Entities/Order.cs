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

        // GIỮ LẠI để tương thích ngược (không xóa) — luôn = item đầu tiên trong OrderItems.
        // Các luồng cũ (HelpDesk, AIController, Seeder...) vẫn đọc đúng 1 loại vé chính của đơn.
        public int Quantity { get; set; }
        public Guid TicketTypeId { get; set; }

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

        /// <summary>
        /// Chi tiết đầy đủ các loại vé trong đơn (hỗ trợ mua nhiều loại vé cùng lúc).
        /// </summary>
        public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();

        public string? BuyerName { get; set; }
        public string? BuyerPhone { get; set; }
        public string? BuyerCccd { get; set; }

        public RefundStatus RefundStatus { get; set; } = RefundStatus.NotApplicable;
        public DateTime? RefundConfirmedAt { get; set; }
        public string? RefundConfirmedBy { get; set; }
    }
}