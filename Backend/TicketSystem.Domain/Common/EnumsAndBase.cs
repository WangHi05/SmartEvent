using System;

namespace TicketSystem.Domain.Common
{
    // Lớp cơ sở để các Entity khác kế thừa, giúp giảm lặp code (DRY Principle)
    public abstract class BaseEntity
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        public string? CreatedBy { get; set; }
        public string? UpdatedBy { get; set; }
    }

    public enum UserRole
    {
        Admin = 0,
        Manager = 1,    
        Staff = 2,      
        Customer = 3
    }

    public enum TicketType
    {
        Individual = 1, // Vé cá nhân
        Group = 2       // Vé đoàn
    }


     public enum EventStatus
    {
        Draft = 0,      // Đang soạn thảo, chưa hiển thị cho người dùng
        Active = 1,     // Đã xuất bản, có thể mua vé
        Ongoing = 2,    // Đang diễn ra
        Completed = 3,  // Đã kết thúc
        Cancelled = 4   // Đã hủy
    }

    public enum PaymentMethod
    {
        VNPAY = 1,      // Thanh toán qua VNPay
        QRPayment = 2,  // Thanh toán QR (ảo)
        Counter = 3     // Thanh toán tại quầy
    }

    public enum PaymentStatus
    {
        Pending = 0,    // Chờ thanh toán
        Completed = 1,  // Đã thanh toán
        Failed = 2,     // Thanh toán thất bại
        Cancelled = 3   // Đã hủy
    }

    public enum OrderStatus
    {
        Pending = 0,    // Chờ xử lý
        Confirmed = 1,  // Đã xác nhận
        Cancelled = 2   // Đã hủy
    }

    public enum RefundPolicy
    {
        FullRefund = 1,      // Hoàn 100%
        PartialRefund = 2,   // Hoàn một phần tùy theo thời gian
        NoRefund = 3         // Không hoàn tiền
    }
}