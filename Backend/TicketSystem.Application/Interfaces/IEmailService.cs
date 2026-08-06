using TicketSystem.Application.DTOs;

namespace TicketSystem.Application.Interfaces;

public interface IEmailService
{
    Task SendTicketConfirmationEmailAsync(TicketConfirmationDto dto);
}