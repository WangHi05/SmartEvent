using TicketSystem.Application.DTOs;

namespace TicketSystem.Application.Interfaces;

public interface IZaloNotificationService
{
    Task SendTicketConfirmationZaloAsync(TicketConfirmationDto dto);
}