using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Interfaces;

namespace TicketSystem.Infrastructure.Notifications;

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;
    private readonly HttpClient _httpClient;

    private const string BrevoApiUrl = "https://api.brevo.com/v3/smtp/email";

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger, HttpClient httpClient)
    {
        _configuration = configuration;
        _logger = logger;
        _httpClient = httpClient;
    }

    public async Task SendTicketConfirmationEmailAsync(TicketConfirmationDto dto)
    {
        try
        {
            var apiKey = _configuration["Brevo:ApiKey"];
            var senderEmail = _configuration["Brevo:SenderEmail"];
            var senderName = _configuration["Brevo:SenderName"] ?? "SmartEvent";

            if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(senderEmail))
            {
                _logger.LogWarning("Brevo chưa được cấu hình, bỏ qua gửi email cho đơn {OrderId}", dto.OrderId);
                return;
            }

            var htmlBody = BuildHtmlBody(dto);

            var payload = new
            {
                sender = new { name = senderName, email = senderEmail },
                to = new[] { new { email = dto.Email, name = dto.CustomerName } },
                subject = $"🎉 Đặt vé thành công - {dto.EventName}",
                htmlContent = htmlBody
            };

            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            using var request = new HttpRequestMessage(HttpMethod.Post, BrevoApiUrl) { Content = content };
            request.Headers.Add("api-key", apiKey);
            request.Headers.Add("accept", "application/json");

            var response = await _httpClient.SendAsync(request);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Đã gửi email xác nhận vé cho đơn {OrderId} tới {Email}", dto.OrderId, dto.Email);
            }
            else
            {
                _logger.LogWarning("Gửi email thất bại cho đơn {OrderId}. Status: {Status}. Response: {Response}",
                    dto.OrderId, response.StatusCode, responseBody);
            }
        }
        catch (Exception ex)
        {
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