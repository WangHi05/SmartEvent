namespace TicketSystem.Application.DTOs;

public class TicketTypeDto
{
    public Guid Id { get; set; }
    public Guid EventId { get; set; }
    public string Name { get; set; }
    public decimal Price { get; set; }
    public int MaxCapacity { get; set; }
    public int RemainingCapacity { get; set; }
    public int MaxPerUser { get; set; }
    public DateTime SaleStartTime { get; set; }
    public DateTime SaleEndTime { get; set; }
    public int DisplayOrder { get; set; }
    public int AccessType { get; set; } // 1=ONE_TIME, 2=DAILY_MULTI
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public string CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
}

public class CreateTicketTypeDto
{
    public string Name { get; set; }
    public decimal Price { get; set; }
    public int MaxCapacity { get; set; }
    public int MaxPerUser { get; set; }
    public DateTime SaleStartTime { get; set; }
    public DateTime SaleEndTime { get; set; }
    public int DisplayOrder { get; set; }
    public int AccessType { get; set; } = 1;
    public bool IsActive { get; set; } = true;
}

public class UpdateTicketTypeDto
{
    public string Name { get; set; }
    public decimal Price { get; set; }
    public int MaxCapacity { get; set; }
    public int MaxPerUser { get; set; }
    public DateTime SaleStartTime { get; set; }
    public DateTime SaleEndTime { get; set; }
    public int DisplayOrder { get; set; }
    public int AccessType { get; set; }
    public bool IsActive { get; set; }
}

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
