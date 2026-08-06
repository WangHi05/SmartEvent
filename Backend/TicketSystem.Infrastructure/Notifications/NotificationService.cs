using TicketSystem.Application.DTOs;
using TicketSystem.Application.Interfaces;

namespace TicketSystem.Infrastructure.Notifications;

public class NotificationService : INotificationService
{
    private readonly IEmailService _emailService;
    private readonly IZaloNotificationService _zaloService;

    public NotificationService(IEmailService emailService, IZaloNotificationService zaloService)
    {
        _emailService = emailService;
        _zaloService = zaloService;
    }

    public async Task SendTicketConfirmationAsync(TicketConfirmationDto dto)
    {
        // Gửi song song, không để cái nào chờ cái nào — cả 2 service đều tự bắt exception bên trong rồi
        var emailTask = _emailService.SendTicketConfirmationEmailAsync(dto);
        var zaloTask = _zaloService.SendTicketConfirmationZaloAsync(dto);

        await Task.WhenAll(emailTask, zaloTask);
    }
}