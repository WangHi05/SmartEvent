using System;
using System.Collections.Generic;
using TicketSystem.Domain.Common;

namespace TicketSystem.Domain.Entities
{
    // Ticket access type: ONE_TIME = 1 (chỉ vào một lần), DAILY_MULTI = 2 (vào nhiều lần theo từng ngày)
    public enum TicketAccessType
    {
        ONE_TIME = 1,           // Check-in một lần duy nhất
        DAILY_MULTI = 2         // Check-in được nhiều lần, mỗi ngày tối đa 1 lần
    }

    // Thực thể quản lý các loại vé trong một sự kiện
    // Mỗi loại vé có giá, sức chứa, thời gian bán riêng biệt
    public class TicketType : BaseEntity
    {
        // ID của sự kiện mà loại vé này thuộc về
        public Guid EventId { get; set; }
        public virtual Event? Event { get; set; }

        // Tên loại vé (VD: "VIP", "Student", "Normal") - dùng để xác định chính sách hoàn tiền
        public string Name { get; set; } = string.Empty;

        // Giá vé (đơn vị: VND)
        public decimal Price { get; set; }

        // Sức chứa tối đa - tổng của tất cả TicketTypes không được vượt Event.MaxCapacity
        public int MaxCapacity { get; set; }

        // Sức chứa còn lại (cập nhật khi mua vé) - ban đầu = MaxCapacity
        public int RemainingCapacity { get; set; }

        // Tối đa số vé mỗi người có thể mua - phải > 0
        public int MaxPerPerson { get; set; }

        // Thời điểm bắt đầu bán
        public DateTime SaleStartTime { get; set; }

        // Thời điểm kết thúc bán - phải sau SaleStartTime và không được sau Event.StartTime
        public DateTime SaleEndTime { get; set; }

        // Thứ tự hiển thị trên giao diện
        public int DisplayOrder { get; set; }

        // Kiểu vé: ONE_TIME (1) hoặc DAILY_MULTI (2)
        public TicketAccessType AccessType { get; set; } = TicketAccessType.ONE_TIME;

        // Trạng thái hoạt động - khi false không thể mua vé loại này
        public bool IsActive { get; set; } = true;

        // Danh sách vé thuộc loại vé này
        public virtual ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();

        // Xác định chính sách hoàn tiền dựa trên tên loại vé
        // - Tên chứa "vip" → FullRefund
        // - Tên chứa "student" → NoRefund
        // - Còn lại → PartialRefund
        public RefundPolicy GetRefundPolicy()
        {
            var lowerName = Name.ToLower();
            if (lowerName.Contains("vip"))
                return RefundPolicy.FullRefund;
            if (lowerName.Contains("student"))
                return RefundPolicy.NoRefund;
            return RefundPolicy.PartialRefund;
        }

        // Trừ sức chứa khi có người mua vé - ném exception nếu sức chứa không đủ
        public void ReserveCapacity(int count)
        {
            if (count <= 0)
                throw new InvalidOperationException("Số lượng phải lớn hơn 0");

            if (RemainingCapacity < count)
                throw new InvalidOperationException(
                    $"Không đủ sức chứa. Còn lại: {RemainingCapacity}, yêu cầu: {count}");

            RemainingCapacity -= count;
        }

        // Cộng lại sức chứa khi hủy đơn/hoàn vé - không được vượt MaxCapacity
        public void ReleaseCapacity(int count)
        {
            if (count <= 0)
                throw new InvalidOperationException("Số lượng phải lớn hơn 0");

            RemainingCapacity += count;
            
            if (RemainingCapacity > MaxCapacity)
                RemainingCapacity = MaxCapacity;
        }
    }

    // Enum xác định chính sách hoàn tiền
    public enum RefundPolicy
    {
        FullRefund = 0,      // Hoàn toàn bộ số tiền
        PartialRefund = 1,   // Hoàn một phần (50-80%)
        NoRefund = 2         // Không hoàn tiền
    }
}
