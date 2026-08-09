using System.ComponentModel.DataAnnotations;

namespace TicketSystem.Application.DTOs;

public class CheckInRequestDto
{
    public string QrCode { get; set; }
    public string GateName { get; set; }
}

public class CheckInResponseDto
{
    public bool Success { get; set; }
    public string Message { get; set; }
}

public class TicketResponseDto
{
    public Guid Id { get; set; }
    public string EventName { get; set; }
    public string TicketTypeName { get; set; }
    public string QrCode { get; set; }
    public int Status { get; set; } // 1=Active, 2=Checked In, 3=Cancelled
    public string StatusName { get; set; } // "Hoạt động", "Đã sử dụng", "Đã hủy"
    public DateTime CreatedAt { get; set; }
    public Guid EventId { get; set; }
    public Guid OrderId { get; set; }
    public int GroupSize { get; set; }
    public int RemainingSlots { get; set; }
    public int AccessType { get; set; } // 1 = ONE_TIME, 2 = DAILY_MULTI
    public DateOnly? LastCheckInDate { get; set; } // Vé nhiều ngày: ngày check-in gần nhất, dùng để tính đếm ngược ở FE
}

public class MyTicketsResponseDto
{
    public List<TicketResponseDto> Tickets { get; set; } = new();
    public int TotalCount { get; set; }
}
