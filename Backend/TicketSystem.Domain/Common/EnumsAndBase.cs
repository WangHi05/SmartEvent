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
    }

    public enum UserRole
    {
        Admin = 1,
        Manager = 2,    // Quản lý
        Staff = 3       // Nhân viên soát vé
    }

    public enum TicketStatus
    {
        Pending = 0,    // Chờ thanh toán
        Paid = 1,       // Đã thanh toán
        Cancelled = 2,  // Đã hủy
        Refunded = 3,   // Đã hoàn tiền
        CheckedIn = 4,  // Đã vào cổng
        Expired = 5     // Hết hạn
    }

    public enum TicketType
    {
        Individual = 1, // Vé cá nhân
        Group = 2       // Vé đoàn
    }

    public enum QRCodeMode
    {
        SingleQRForGroup = 1, // Mode 1: Một mã QR tổng cho cả đoàn
        IndividualQRPerMember = 2 // Mode 2: Mỗi thành viên một mã QR riêng
    }
}