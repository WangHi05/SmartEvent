namespace TicketSystem.Application.DTOs;

public class GateTrafficDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int CurrentTraffic { get; set; }
    public int Capacity { get; set; }
    public string Status { get; set; } = string.Empty;
}