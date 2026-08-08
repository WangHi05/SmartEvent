using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using TicketSystem.Domain.Common;

namespace TicketSystem.Domain.Entities;

public enum TicketStatus
{
    ACTIVE = 1,
    CHECKED_IN = 2,
    CANCELLED = 3,
    REVOKED = 4
}
public enum ScanType
{
    Entry = 1,  
    Exit = 2,   
    Print = 3  
}

public enum CheckInResultType
{
    Success = 1,
    Failed = 2
}

public class Ticket : BaseEntity
{
    public Guid TicketTypeId { get; init; }
    public Guid? OrderId { get; init; } // Foreign key to Order
    public required string SecretKey { get; init; }
    public TicketStatus Status { get; set; } = TicketStatus.ACTIVE;
    
    // --- CÁC TRƯỜNG MỚI BỔ SUNG CHO ĐẶC TẢ V2 ---
    public DateTime ValidFrom { get; set; }
    public DateTime ValidTo { get; set; }
    public bool IsBadgePrinted { get; set; } = false; // Phục vụ Cơ chế 3: In thẻ tham quan
    // Trong Ticket.cs
    public string? LastUsedOtp { get; set; }
    public DateTime? LastUsedOtpAt { get; set; }
    
    // Hỗ trợ vé đoàn (Mode 1 & Mode 2)
    public int GroupSize { get; set; } = 1; // Mặc định là 1 (vé cá nhân)
    
    [ConcurrencyCheck]
    public int RemainingSlots { get; set; } = 1; // Số vé chưa checkin 

    // Cancel + Refund related fields
    public DateTime? CancelledAt { get; set; }
    public decimal? RefundAmount { get; set; }
    public string? CancelReason { get; set; }
    public bool IsCheckedIn { get; set; } = false; // True nếu vé đã check-in

    // Relationships
    public virtual TicketType? TicketType { get; set; }
    public virtual Order? Order { get; set; }
    public virtual ICollection<CheckInLog> CheckInLogs { get; set; } = new List<CheckInLog>();

     // Đánh dấu vé đã được Khách mời (Guest) xác nhận nhận hay chưa
    [ConcurrencyCheck]
    public bool IsClaimed { get; set; } = false;
        
    // Chuỗi Token dùng 1 lần (One-time token) để gửi qua link chia sẻ
    public string? ShareToken { get; set; }

    // Constructor để đảm bảo tính toàn vẹn dữ liệu
    public Ticket()
    {
        // Tự động sinh SecretKey độ dài 16 ký tự (Base32 format) khi khởi tạo vé
        SecretKey = GenerateSecretKey();
    }

    private string GenerateSecretKey()
    {
        // Sinh chuỗi ngẫu nhiên làm SecretKey (Ví dụ: JBSWY3DPEHPK3PXP)
        // Trong thực tế, em nên dùng RandomNumberGenerator của System.Security.Cryptography
        return Guid.NewGuid().ToString("N").Substring(0, 16).ToUpper();
    }
}

public class CheckInLog : BaseEntity
{
    public Guid TicketId { get; set; }
    public Guid EventId { get; set; }
    public Guid? GateId { get; set; }
    public DateTime CheckedAt { get; set; }
    public DateOnly CheckinDate { get; set; }
    // Bổ sung các trường truy vết
    public ScanType Type { get; set; } = ScanType.Entry;
    public int PeopleCount { get; set; } = 1; // Số người vào (dành cho Mode 1 quét vé đoàn)
    public string? GateName { get; set; }
    public string? StaffId { get; set; } // Nhân viên thao tác
    public string? Note { get; set; }    // Ghi chú (ví dụ: "Check-in thủ công")
    public string CheckInResult { get; set; } = "Success";
    public string? FailureReason { get; set; }
    public string? QRCodeData { get; set; }

    // Relationships
    public virtual Ticket? Ticket { get; set; }
}
