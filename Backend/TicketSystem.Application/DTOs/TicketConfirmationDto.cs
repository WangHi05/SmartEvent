namespace TicketSystem.Application.DTOs;

public class TicketConfirmationDto
{
    public string CustomerName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public Guid OrderId { get; set; }
    public string EventName { get; set; } = string.Empty;
    public decimal TotalPrice { get; set; }
    public string TicketLink { get; set; } = string.Empty;
}