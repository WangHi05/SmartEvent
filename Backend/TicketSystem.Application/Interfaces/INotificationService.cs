using TicketSystem.Application.DTOs;

namespace TicketSystem.Application.Interfaces;

public interface INotificationService
{
    Task SendTicketConfirmationAsync(TicketConfirmationDto dto);
}