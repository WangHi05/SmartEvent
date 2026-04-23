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

    public enum QRCodeMode
    {
        SingleQRForGroup = 1, // Mode 1: Một mã QR tổng cho cả đoàn
        IndividualQRPerMember = 2 // Mode 2: Mỗi thành viên một mã QR riêng
    }

     public enum EventStatus
    {
        Draft = 0,      // Đang soạn thảo, chưa hiển thị cho người dùng
        Active = 1,     // Đã xuất bản, có thể mua vé
        Ongoing = 2,    // Đang diễn ra
        Completed = 3,  // Đã kết thúc
        Cancelled = 4   // Đã hủy
    }
}