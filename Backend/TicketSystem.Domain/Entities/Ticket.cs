using System;
using System.Collections.Generic;
using TicketSystem.Domain.Common;

namespace TicketSystem.Domain.Entities
{
    /// <summary>
    /// Thực thể chính quản lý thông tin vé (cá nhân hoặc vé đoàn)
    /// </summary>
    public class Ticket : BaseEntity
    {
        public Guid EventId { get; set; }
        public virtual Event? Event { get; set; }

        public Guid? UserId { get; set; } // Người mua vé / Đại diện đoàn
        public virtual User? User { get; set; }

        public string QRCodeData { get; set; } = string.Empty;
        public TicketStatus Status { get; set; } = TicketStatus.Pending;
        public TicketType Type { get; set; } = TicketType.Individual;
        public decimal Price { get; set; }

        // --- Logic cho vé đoàn (Group Tickets) ---
        public QRCodeMode? GroupMode { get; set; }
        
        // Dùng cho Mode 1: 1 QR tổng cho n người
        public int TotalQuantity { get; set; } = 1; 
        public int CheckedInCount { get; set; } = 0; 

        // Dùng cho Mode 2: n QR riêng lẻ (SubTickets)
        // Quan hệ 1-n giữa Ticket đoàn và các SubTicket
        public virtual ICollection<SubTicket> SubTickets { get; set; } = new List<SubTicket>();

        /// <summary>
        /// Kiểm tra điều kiện check-in cho vé lẻ hoặc vé đoàn Mode 1
        /// </summary>
        public bool CanCheckIn()
        {
            // Chỉ cho phép check-in nếu đã thanh toán hoặc đang trong quá trình check-in (với vé đoàn)
            if (Status != TicketStatus.Paid && Status != TicketStatus.CheckedIn) return false;
            
            // Vé cá nhân: Trạng thái phải là Paid
            if (Type == TicketType.Individual) return Status == TicketStatus.Paid;
            
            // Vé đoàn Mode 1: Kiểm tra số lượng người đã vào so với tổng số vé
            if (GroupMode == QRCodeMode.SingleQRForGroup)
            {
                return CheckedInCount < TotalQuantity;
            }

            return false;
        }

        /// <summary>
        /// Logic thực hiện check-in (Dành cho Mode 1)
        /// </summary>
        public void PerformCheckIn(int count = 1)
        {
            if (!CanCheckIn()) 
                throw new InvalidOperationException("Vé không hợp lệ hoặc đã hết lượt check-in.");
            
            if (GroupMode == QRCodeMode.SingleQRForGroup && (CheckedInCount + count) > TotalQuantity)
                throw new InvalidOperationException("Số lượng người vào vượt quá số lượng vé còn lại.");

            CheckedInCount += count;
            
            // Nếu đã vào đủ số lượng thì chuyển trạng thái sang CheckedIn
            if (CheckedInCount >= TotalQuantity)
            {
                Status = TicketStatus.CheckedIn;
            }
        }
    }

    /// <summary>
    /// Thực thể đại diện cho từng vé con trong một đoàn (Dùng cho Mode 2)
    /// </summary>
    public class SubTicket : BaseEntity
    {
        public Guid ParentTicketId { get; set; }
        public virtual Ticket? ParentTicket { get; set; }

        public string QRCodeData { get; set; } = string.Empty;
        public TicketStatus Status { get; set; } = TicketStatus.Paid;
        public DateTime? CheckInTime { get; set; }
        
        // Thông tin tùy chọn cho khách VIP/Truyền thông như yêu cầu trong tài liệu
        public string? GuestName { get; set; } 
        public string? Note { get; set; }

        public bool IsCheckedIn => Status == TicketStatus.CheckedIn;

        public void MarkAsUsed()
        {
            if (Status == TicketStatus.CheckedIn)
                throw new InvalidOperationException("Vé con này đã được sử dụng trước đó.");
            
            Status = TicketStatus.CheckedIn;
            CheckInTime = DateTime.UtcNow;
        }
    }
}