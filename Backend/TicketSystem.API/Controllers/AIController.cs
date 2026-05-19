using Microsoft.AspNetCore.Mvc;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Interfaces;
using TicketSystem.Domain.Common;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TicketSystem.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AIController : ControllerBase
    {
        private readonly IGeminiService _geminiService;
        private readonly IEventService _eventService;
        private readonly ITicketTypeService _ticketTypeService;
        private readonly ISettingsService _settingsService;
        private readonly ILogger<AIController> _logger;

        public AIController(
            IGeminiService geminiService,
            IEventService eventService,
            ITicketTypeService ticketTypeService,
            ISettingsService settingsService,
            ILogger<AIController> logger)
        {
            _geminiService = geminiService;
            _eventService = eventService;
            _ticketTypeService = ticketTypeService;
            _settingsService = settingsService;
            _logger = logger;
        }

        [HttpPost("customer-support")]
        public async Task<ActionResult<CustomerSupportResponseDto>> CustomerSupport(
            [FromBody] CustomerSupportRequestDto request)
        {
            try
            {
                // 1. Validate input
                if (request == null || string.IsNullOrWhiteSpace(request.Message))
                {
                    return Ok(new CustomerSupportResponseDto
                    {
                        IsSuccess = false,
                        Answer = "Vui lòng nhập câu hỏi để tôi có thể hỗ trợ.",
                        ErrorMessage = "Câu hỏi trống"
                    });
                }

                var userMessage = request.Message.Trim();
                var messageLower = userMessage.ToLowerInvariant();

                // 2. Lấy danh sách sự kiện (dùng cho quick-actions)
                var eventsResult = await _eventService.GetEventsAsync(1, 100);
                var allEvents = eventsResult?.Items ?? new List<EventResponseDto>();

                // 3. Xây dựng context dữ liệu từ Events
                var contextBuilder = new StringBuilder();
                
                if (allEvents.Count == 0)
                {
                    contextBuilder.AppendLine("Hiện tại hệ thống không có sự kiện nào.");
                }
                else
                {
                    contextBuilder.AppendLine("=== DANH SÁCH SỰ KIỆN ===\n");

                    foreach (var evt in allEvents)
                    {
                        contextBuilder.AppendLine($"Sự kiện: {evt.Name}");
                        contextBuilder.AppendLine($"Thời gian: {evt.StartTime:dd/MM/yyyy HH:mm} - {evt.EndTime:dd/MM/yyyy HH:mm}");
                        contextBuilder.AppendLine($"Địa điểm: {evt.Location}");
                        contextBuilder.AppendLine($"Mô tả: {evt.Description}");

                        // Lấy loại vé cho sự kiện này
                        var ticketTypes = await _ticketTypeService.GetTicketTypesByEventAsync(evt.Id);
                        if (ticketTypes.Any())
                        {
                            contextBuilder.AppendLine("Loại vé có sẵn:");
                            foreach (var ticketType in ticketTypes.Where(t => t.RemainingQuantity > 0))
                            {
                                contextBuilder.AppendLine(
                                    $"  - {ticketType.Name}: {ticketType.Price:N0} VNĐ " +
                                    $"(Còn {ticketType.RemainingQuantity}/{ticketType.Quantity} vé)");
                            }
                        }
                        contextBuilder.AppendLine();
                    }
                }

                // 4. Lấy chính sách hủy/hoàn tiền từ settings
                    var refundSetting = await _settingsService.GetSettingValueAsync(
                    TicketSystem.Domain.Entities.SystemSettings.REFUND_POLICY);
                var cancelHoursBeforeEvent = await _settingsService.GetSettingAsIntAsync(
                    TicketSystem.Domain.Entities.SystemSettings.CANCEL_HOURS_BEFORE_EVENT, 48);

                contextBuilder.AppendLine("=== CHÍNH SÁCH HỦY/HOÀN TIỀN ===\n");
                contextBuilder.AppendLine($"Hủy vé phải được thực hiện {cancelHoursBeforeEvent} giờ trước giờ bắt đầu sự kiện.");
                    contextBuilder.AppendLine($"Chính sách hoàn tiền: Mã chính sách {refundSetting}");
                contextBuilder.AppendLine(
                    "Để biết chi tiết hơn về chính sách hoàn tiền, vui lòng liên hệ với nhân viên hỗ trợ.\n");

                // 5. Build System Prompt
                var systemPrompt = @"Bạn là trợ lý CSKH của hệ thống SmartEvent - một nền tảng bán vé sự kiện online.
Nhiệm vụ của bạn là trả lời các câu hỏi của khách hàng về:
- Danh sách sự kiện đang diễn ra
- Loại vé có sẵn, giá vé
- Chính sách hủy/hoàn tiền
- Cách đặt vé, thanh toán

NGUYÊN TẮC TRỌNG YẾU:
1. Chỉ dựa vào dữ liệu được cung cấp dưới đây. KHÔNG bịa sự kiện, giá vé hoặc trạng thái đơn hàng.
2. Nếu thiếu thông tin, hãy hướng dẫn khách liên hệ nhân viên hỗ trợ qua email: support@smartevent.vn hoặc hotline: 1900 1234.
3. Trả lời ngắn gọn (3-4 câu), lịch sự, thân thiện bằng tiếng Việt.
4. Nếu câu hỏi ngoài phạm vi hỗ trợ (không liên quan đến vé/sự kiện), hãy từ chối lịch sự.";

                // Quick-action handlers (deterministic, data-backed answers)
                // 1) Các sự kiện đang mở bán
                if (messageLower.Contains("mở bán") || messageLower.Contains("moi ban") || messageLower.Contains("mở bán") || messageLower.Contains("sự kiện đang mở bán") || messageLower.Contains("sự kiện đang bán"))
                {
                    var now = DateTime.UtcNow;
                    var matching = new List<OpenSaleEventDto>();
                    var candidateEvents = allEvents
                        .Where(evt => evt.EndTime >= now)
                        .OrderBy(evt => evt.StartTime)
                        .ThenBy(evt => evt.EndTime);

                    foreach (var evt in candidateEvents)
                    {
                        var ticketTypes = (await _ticketTypeService.GetTicketTypesByEventAsync(evt.Id)).ToList();
                        var available = ticketTypes.Where(t => t.IsActive && t.RemainingQuantity > 0 && t.SaleStartTime <= now && t.SaleEndTime >= now).ToList();
                        if (available.Any())
                        {
                            matching.Add(new OpenSaleEventDto
                            {
                                Id = evt.Id,
                                Name = evt.Name,
                                StartTime = evt.StartTime,
                                EndTime = evt.EndTime,
                                Location = evt.Location,
                                Description = evt.Description,
                                TicketTypes = available.Take(5).Select(tt => new OpenSaleTicketTypeDto
                                {
                                    Id = tt.Id,
                                    Name = tt.Name,
                                    Price = tt.Price,
                                    RemainingQuantity = tt.RemainingQuantity
                                }).ToList()
                            });
                        }
                    }

                    var body = matching.Any()
                        ? $"Tôi tìm thấy {matching.Count} sự kiện đang mở bán."
                        : "Hiện tại không có sự kiện nào đang mở bán vé. Vui lòng kiểm tra lại sau hoặc liên hệ hỗ trợ.";

                    return Ok(new CustomerSupportResponseDto
                    {
                        IsSuccess = true,
                        Answer = body,
                        ResponseType = "open_sales",
                        Events = matching,
                        Timestamp = DateTime.UtcNow
                    });
                }

                // 2) Giá vé và loại vé
                if (messageLower.Contains("giá vé") || messageLower.Contains("loại vé") || (messageLower.Contains("giá") && messageLower.Contains("vé")))
                {
                    var now = DateTime.UtcNow;
                    var sb = new StringBuilder();

                    // Lọc các event đang diễn ra hoặc sắp diễn ra (EndTime >= now)
                    var candidateEvents = allEvents
                        .Where(evt => evt.EndTime >= now)
                        .OrderBy(evt => evt.StartTime)
                        .ThenBy(evt => evt.EndTime)
                        .Take(20);

                    var priceEvents = new List<OpenSaleEventDto>();
                    foreach (var evt in candidateEvents)
                    {
                        var ticketTypes = (await _ticketTypeService.GetTicketTypesByEventAsync(evt.Id)).ToList();
                        // Chọn những loại vé còn hàng và đang active (bao gồm cả các loại chưa bắt đầu bán lại)
                        var available = ticketTypes
                            .Where(t => t.RemainingQuantity > 0 && t.IsActive)
                            .ToList();

                        if (!available.Any()) continue;

                        var ticketStrings = available
                            .Select(tt => $"{tt.Name} {tt.Price:N0} VNĐ (Còn {tt.RemainingQuantity})");

                        // Hiển thị 1 dòng cho mỗi event: Tên sự kiện - [Loại vé 1; Loại vé 2; ...]
                        sb.AppendLine($"{evt.Name} - {string.Join("; ", ticketStrings)}");

                        priceEvents.Add(new OpenSaleEventDto
                        {
                            Id = evt.Id,
                            Name = evt.Name,
                            StartTime = evt.StartTime,
                            EndTime = evt.EndTime,
                            Location = evt.Location,
                            Description = evt.Description,
                            TicketTypes = available.Select(tt => new OpenSaleTicketTypeDto
                            {
                                Id = tt.Id,
                                Name = tt.Name,
                                Price = tt.Price,
                                RemainingQuantity = tt.RemainingQuantity
                            }).ToList()
                        });
                    }

                    var body = sb.Length > 0 ? sb.ToString() : "Không tìm thấy loại vé/giá vé nào.";
                    return Ok(new CustomerSupportResponseDto { IsSuccess = true, Answer = body, ResponseType = "price_list", Events = priceEvents, Timestamp = DateTime.UtcNow });
                }

                // 3) Thanh toán
                if (messageLower.Contains("thanh toán") || messageLower.Contains("payment") || messageLower.Contains("vnpay"))
                {
                    // Try to read configured payment-related settings
                    var methods = new List<string>();
                    // VnPay config exists in appsettings; assume VnPay available
                    methods.Add("VNPAY (thanh toán online)");
                    methods.Add("Thanh toán tại quầy / đối tác (trả tiền mặt)");
                    methods.Add("QR Pay (nếu có cấu hình)");

                    var body = "Hệ thống hỗ trợ các phương thức thanh toán sau: " + string.Join(", ", methods) + ".\nĐể thanh toán, chọn phương thức khi hoàn tất đặt vé hoặc liên hệ hỗ trợ để được hướng dẫn chi tiết.";
                    return Ok(new CustomerSupportResponseDto { IsSuccess = true, Answer = body, Timestamp = DateTime.UtcNow });
                }

                // 4) Chính sách hủy/hoàn tiền
                if (messageLower.Contains("hủy") || messageLower.Contains("hoàn tiền") || messageLower.Contains("chính sách"))
                {
                    var cancelHours = await _settingsService.GetCancelHoursBeforeEventAsync();
                    var refundPolicy = await _settingsService.GetRefundPolicyAsync();
                    var policyText = refundPolicy switch
                    {
                        TicketSystem.Domain.Common.RefundPolicy.FullRefund => "Hoàn tiền 100% nếu hủy trước ngưỡng quy định.",
                        TicketSystem.Domain.Common.RefundPolicy.PartialRefund => "Hoàn một phần theo chính sách trên hệ thống.",
                        _ => "Không hoàn tiền nếu hủy sát ngày sự kiện."
                    };

                    var body = $"Chính sách hủy/hoàn tiền: {policyText}\nVui lòng hủy ít nhất {cancelHours} giờ trước giờ bắt đầu sự kiện để đủ điều kiện. Liên hệ nhân viên hỗ trợ để biết chi tiết và quy trình hoàn tiền.";
                    return Ok(new CustomerSupportResponseDto { IsSuccess = true, Answer = body, Timestamp = DateTime.UtcNow });
                }

                // 5) Vé của tôi / xem vé
                if (messageLower.Contains("vé của tôi") || messageLower.Contains("xem vé") || messageLower.Contains("đã thanh toán"))
                {
                    var body = "Để xem vé đã mua, vui lòng đăng nhập và vào mục 'Vé của tôi' trên trang khách hàng. Nếu bạn đã thanh toán nhưng không thấy vé, thử làm mới trang hoặc liên hệ hỗ trợ kèm mã giao dịch.";
                    return Ok(new CustomerSupportResponseDto { IsSuccess = true, Answer = body, Timestamp = DateTime.UtcNow });
                }

                // 1.b Stricter ambiguous / too-short guidance
                // Only trigger when the user input is extremely short (single word or <=3 chars)
                var wordCount = userMessage.Split(new[] { ' ', '\t', '\n' }, StringSplitOptions.RemoveEmptyEntries).Length;
                if (userMessage.Length <= 3 || wordCount <= 1)
                {
                    var guidance = "Bạn muốn hỏi về nội dung nào của vé? Bạn có thể hỏi rõ hơn như:\n- Vé VIP còn không?\n- Giá vé Music Festival là bao nhiêu?\n- Tôi đã mua vé rồi thì xem vé ở đâu?\n- Hủy vé có được hoàn tiền không?";
                    return Ok(new CustomerSupportResponseDto
                    {
                        IsSuccess = true,
                        Answer = guidance,
                        Timestamp = DateTime.UtcNow
                    });
                }

                // 6. Kết hợp system prompt + context + user message
                var fullPrompt = $@"{systemPrompt}

{contextBuilder}

Câu hỏi từ khách: {request.Message}

Hãy trả lời câu hỏi trên dựa vào dữ liệu được cung cấp:";

                // 7. Gọi Gemini AI (polish / Vietnamese formatting) - last resort
                var answer = await _geminiService.GenerateContentAsync(fullPrompt);

                return Ok(new CustomerSupportResponseDto
                {
                    IsSuccess = true,
                    Answer = answer,
                    Timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in CustomerSupport endpoint: {Message}", ex.Message);

                // Return detailed error message in development to help debugging
                return StatusCode(500, new CustomerSupportResponseDto
                {
                    IsSuccess = false,
                    ErrorMessage = ex.Message ?? "Xin lỗi, có lỗi xảy ra khi xử lý câu hỏi của bạn. Vui lòng thử lại sau."
                });
            }
        }
    }
}
