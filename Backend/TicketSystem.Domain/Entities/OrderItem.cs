using System;
using TicketSystem.Domain.Common;

namespace TicketSystem.Domain.Entities
{
    /// <summary>
    /// Chi tiết từng loại vé trong 1 đơn hàng — cho phép 1 Order chứa nhiều loại vé khác nhau.
    /// </summary>
    public class OrderItem : BaseEntity
    {
        public Guid OrderId { get; set; }
        public Guid TicketTypeId { get; set; }
        public int Quantity { get; set; }
        public int MemberCount { get; set; } = 1; // Dùng cho vé đoàn (TicketMode = GROUP)
        public decimal UnitPrice { get; set; }
        public decimal Subtotal { get; set; }

        public virtual Order? Order { get; set; }
        public virtual TicketType? TicketType { get; set; }
    }
}