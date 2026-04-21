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
