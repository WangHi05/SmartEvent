using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Interfaces;

namespace TicketSystem.Infrastructure.Notifications;

public class ZaloZnsService : IZaloNotificationService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<ZaloZnsService> _logger;
    private readonly HttpClient _httpClient;

    private const string ZnsApiUrl = "https://business.openapi.zalo.me/message/template";

    public ZaloZnsService(IConfiguration configuration, ILogger<ZaloZnsService> logger, HttpClient httpClient)
    {
        _configuration = configuration;
        _logger = logger;
        _httpClient = httpClient;
    }

    public async Task SendTicketConfirmationZaloAsync(TicketConfirmationDto dto)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(dto.Phone))
            {
                return;
            }

            var enabled = _configuration.GetValue<bool>("ZaloZns:Enabled");
            if (!enabled)
            {
                _logger.LogInformation(
                    "[ZaloZNS-STUB] Sẽ gửi thông báo tới SĐT {Phone} cho đơn {OrderId} (Zalo ZNS chưa được bật config)",
                    dto.Phone, dto.OrderId);
                return;
            }

            var accessToken = _configuration["ZaloZns:AccessToken"];
            var templateId = _configuration["ZaloZns:TemplateId"];

            if (string.IsNullOrWhiteSpace(accessToken) || string.IsNullOrWhiteSpace(templateId))
            {
                _logger.LogWarning("Zalo ZNS được bật nhưng thiếu AccessToken/TemplateId, bỏ qua gửi cho đơn {OrderId}", dto.OrderId);
                return;
            }

            var normalizedPhone = NormalizePhone(dto.Phone);

            // Cấu trúc payload chuẩn theo tài liệu Zalo ZNS.
            // Tên các key trong "template_data" (customer_name, event_name, ticket_link...)
            // PHẢI khớp với các biến đã khai báo khi tạo Template trên Zalo Business Manager.
            var payload = new
            {
                phone = normalizedPhone,
                template_id = templateId,
                template_data = new
                {
                    customer_name = dto.CustomerName,
                    event_name = dto.EventName,
                    order_id = dto.OrderId.ToString(),
                    ticket_link = dto.TicketLink
                }
            };

            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            using var request = new HttpRequestMessage(HttpMethod.Post, ZnsApiUrl) { Content = content };
            request.Headers.Add("access_token", accessToken);

            var response = await _httpClient.SendAsync(request);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Đã gửi Zalo ZNS cho đơn {OrderId} tới {Phone}", dto.OrderId, normalizedPhone);
            }
            else
            {
                _logger.LogWarning("Gửi Zalo ZNS thất bại cho đơn {OrderId}. Response: {Response}", dto.OrderId, responseBody);
            }
        }
        catch (Exception ex)
        {
            // Không throw ra ngoài — gửi Zalo thất bại không được làm hỏng luồng xác nhận thanh toán
            _logger.LogError(ex, "Lỗi khi gửi Zalo ZNS cho đơn {OrderId}", dto.OrderId);
        }
    }

    private static string NormalizePhone(string phone)
    {
        // Zalo ZNS yêu cầu định dạng 84xxxxxxxxx (không có dấu +, không có số 0 đầu)
        var digits = new string(phone.Where(char.IsDigit).ToArray());
        if (digits.StartsWith("0"))
        {
            digits = "84" + digits.Substring(1);
        }
        else if (!digits.StartsWith("84"))
        {
            digits = "84" + digits;
        }
        return digits;
    }
}