using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MimeKit;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Interfaces;

namespace TicketSystem.Infrastructure.Notifications;

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendTicketConfirmationEmailAsync(TicketConfirmationDto dto)
    {
        try
        {
            var host = _configuration["Smtp:Host"];
            var port = int.Parse(_configuration["Smtp:Port"] ?? "587");
            var user = _configuration["Smtp:User"];
            var pass = _configuration["Smtp:Pass"];
            var from = _configuration["Smtp:From"] ?? user;

            if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(user))
            {
                _logger.LogWarning("Smtp chưa được cấu hình, bỏ qua gửi email cho đơn {OrderId}", dto.OrderId);
                return;
            }

            var message = new MimeMessage();
            message.From.Add(MailboxAddress.Parse(from));
            message.To.Add(MailboxAddress.Parse(dto.Email));
            message.Subject = $"🎉 Đặt vé thành công - {dto.EventName}";

            var htmlBody = BuildHtmlBody(dto);
            message.Body = new TextPart("html") { Text = htmlBody };

            using var client = new SmtpClient();
            await client.ConnectAsync(host, port, SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(user, pass);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            _logger.LogInformation("Đã gửi email xác nhận vé cho đơn {OrderId} tới {Email}", dto.OrderId, dto.Email);
        }
        catch (Exception ex)
        {
            // Không throw ra ngoài — gửi mail thất bại không được làm hỏng luồng xác nhận thanh toán
            _logger.LogError(ex, "Lỗi khi gửi email xác nhận vé cho đơn {OrderId}", dto.OrderId);
        }
    }

    private static string BuildHtmlBody(TicketConfirmationDto dto)
    {
        return $@"
<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;'>
    <div style='background: linear-gradient(135deg, #f97316, #ea580c); padding: 32px; text-align: center;'>
        <h1 style='color: #ffffff; margin: 0; font-size: 24px;'>SmartEvent</h1>
    </div>
    <div style='padding: 32px; color: #1f2937;'>
        <h2 style='margin-top: 0;'>Xin chào {dto.CustomerName},</h2>
        <p style='font-size: 15px; line-height: 1.6;'>
            Cảm ơn bạn đã đặt vé sự kiện <b>{dto.EventName}</b> trên SmartEvent!
            Thanh toán của bạn đã được xác nhận thành công.
        </p>
        <table style='width: 100%; border-collapse: collapse; margin: 20px 0;'>
            <tr>
                <td style='padding: 8px 0; color: #6b7280;'>Mã đơn hàng</td>
                <td style='padding: 8px 0; text-align: right; font-weight: bold;'>{dto.OrderId}</td>
            </tr>
            <tr>
                <td style='padding: 8px 0; color: #6b7280;'>Tổng tiền</td>
                <td style='padding: 8px 0; text-align: right; font-weight: bold; color: #ea580c;'>{dto.TotalPrice:N0} đ</td>
            </tr>
        </table>
        <div style='text-align: center; margin: 32px 0;'>
            <a href='{dto.TicketLink}' style='display: inline-block; padding: 14px 32px; 
               background: #f97316; color: #ffffff; text-decoration: none; 
               border-radius: 8px; font-weight: bold; font-size: 15px;'>
                Xem vé của tôi
            </a>
        </div>
        <p style='font-size: 13px; color: #9ca3af; line-height: 1.6;'>
            Nếu nút trên không hoạt động, bạn có thể copy đường dẫn sau vào trình duyệt:<br/>
            <a href='{dto.TicketLink}' style='color: #f97316;'>{dto.TicketLink}</a>
        </p>
    </div>
    <div style='background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af;'>
        © 2026 SmartEvent. Mọi thắc mắc liên hệ support@smartevent.vn
    </div>
</div>";
    }
}