using System.ComponentModel;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.SemanticKernel;
using TicketSystem.Application.Interfaces;
using TicketSystem.Domain.Common;
using TicketSystem.Domain.Entities;

namespace TicketSystem.Infrastructure.AI.Plugins
{
    /// <summary>
    /// Bộ công cụ (tools) dành riêng cho Chatbot CSKH của KHÁCH HÀNG.
    ///
    /// KHÁC với SystemDataPlugin (dành cho Admin):
    /// - Không có bất kỳ hàm nào cho phép AI tự chọn userId để truy vấn.
    /// - userId của khách đang đăng nhập được bind SẴN vào instance này ngay khi tạo Kernel
    ///   cho request đó (xem AIController.CustomerSupport). AI chỉ có thể gọi "get_my_orders"/
    ///   "get_my_tickets" và luôn luôn nhận về dữ liệu của CHÍNH khách đang chat, không có tham
    ///   số nào để đổi sang userId khác -> loại bỏ hoàn toàn nguy cơ rò rỉ dữ liệu chéo giữa
    ///   các khách hàng kể cả khi bị prompt injection.
    /// - Không có hàm nào trả về dữ liệu doanh thu, thống kê toàn hệ thống, thông tin của khách
    ///   hàng khác, hoặc audit log — những hàm đó CHỈ tồn tại trong SystemDataPlugin (Admin).
    /// </summary>
    public class CustomerAiPlugin
    {
        private readonly IApplicationDbContext _context;
        private readonly Guid? _authenticatedUserId;
        private readonly ILogger _logger;

        public CustomerAiPlugin(IApplicationDbContext context, Guid? authenticatedUserId, ILogger logger)
        {
            _context = context;
            _authenticatedUserId = authenticatedUserId;
            _logger = logger;
        }

        [KernelFunction("search_events_by_criteria")]
        [Description(
            "Tìm sự kiện CÔNG KHAI đang/sắp mở bán vé, phù hợp theo địa điểm, chủ đề/từ khóa, " +
            "số người tham gia và ngân sách tối đa. Dùng khi khách hàng muốn tìm hoặc so sánh " +
            "sự kiện theo nhiều tiêu chí. Không bao giờ được tự bịa sự kiện hoặc giá vé — luôn " +
            "gọi hàm này để lấy dữ liệu thật.")]
        public async Task<string> SearchEventsByCriteriaAsync(
            [Description("Địa điểm cần tìm, ví dụ: Hà Nội. Để trống nếu không lọc theo địa điểm.")]
            string? location,

            [Description("Chủ đề hoặc từ khóa cần tìm, ví dụ: công nghệ, startup, âm nhạc. Để trống nếu không lọc.")]
            string? keyword,

            [Description("Số người tham gia, mặc định 1 nếu khách không nói rõ.")]
            int people = 1,

            [Description("Tổng ngân sách tối đa cho tất cả người, tính bằng VNĐ. Để 0 nếu không giới hạn.")]
            decimal maxBudget = 0,

            [Description("Từ khóa cần loại trừ, phân tách bằng dấu phẩy nếu có nhiều từ.")]
            string? excludeKeyword = null)
        {
            _logger.LogInformation(
                "[CustomerAI TOOL] search_events_by_criteria | location={Location} | keyword={Keyword} | people={People} | budget={Budget}",
                location, keyword, people, maxBudget);

            var effectiveBudget = maxBudget > 0 ? maxBudget : decimal.MaxValue;
            var effectivePeople = people > 0 ? people : 1;

            var query = _context.Events
                .AsNoTracking()
                .Where(e => e.Status != EventStatus.Archived && e.Status != EventStatus.Cancelled);

            if (!string.IsNullOrWhiteSpace(location))
            {
                var loc = location.Trim().ToLower();
                query = query.Where(e => e.Location.ToLower().Contains(loc));
            }

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var key = keyword.Trim().ToLower();
                query = query.Where(e => e.Name.ToLower().Contains(key) || e.Description.ToLower().Contains(key));
            }

            if (!string.IsNullOrWhiteSpace(excludeKeyword))
            {
                var excluded = excludeKeyword
                    .Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(x => x.Trim().ToLower())
                    .ToList();

                foreach (var word in excluded)
                {
                    query = query.Where(e => !e.Name.ToLower().Contains(word) && !e.Description.ToLower().Contains(word));
                }
            }

            var now = DateTime.UtcNow;

            var events = await query
                .Where(e => e.EndTime >= now)
                .OrderBy(e => e.StartTime)
                .Take(30)
                .Select(e => new
                {
                    e.Id,
                    e.Name,
                    e.Description,
                    e.Location,
                    e.StartTime,
                    e.EndTime,
                    TicketTypes = e.TicketTypes
                        .Where(t => t.IsActive && (t.RemainingQuantity > 0 || t.RemainingCapacity > 0))
                        .Select(t => new
                        {
                            t.Id,
                            t.Name,
                            t.Price,
                            RemainingQuantity = t.RemainingQuantity > 0 ? t.RemainingQuantity : t.RemainingCapacity,
                            t.SaleStartTime,
                            t.SaleEndTime
                        })
                        .ToList()
                })
                .ToListAsync();

            var result = events
                .Select(e => new
                {
                    e.Id,
                    e.Name,
                    e.Description,
                    e.Location,
                    e.StartTime,
                    e.EndTime,
                    TicketTypes = e.TicketTypes
                        .Where(t => t.Price * effectivePeople <= effectiveBudget)
                        .Select(t => new
                        {
                            t.Id,
                            t.Name,
                            PricePerPerson = t.Price,
                            TotalPriceForGroup = t.Price * effectivePeople,
                            t.RemainingQuantity,
                            t.SaleStartTime,
                            t.SaleEndTime
                        })
                        .ToList()
                })
                .Where(e => e.TicketTypes.Any())
                .ToList();

            if (!result.Any())
            {
                return "Không tìm thấy sự kiện nào phù hợp với các tiêu chí đã cung cấp.";
            }

            return JsonSerializer.Serialize(result);
        }

        [KernelFunction("get_open_sale_events")]
        [Description(
            "Lấy danh sách các sự kiện CÔNG KHAI đang mở bán vé hoặc sắp diễn ra, không cần tiêu chí lọc cụ thể. " +
            "Dùng khi khách hỏi chung chung kiểu 'có sự kiện nào đang mở bán không', 'sự kiện sắp diễn ra'.")]
        public async Task<string> GetOpenSaleEventsAsync(
            [Description("Số lượng sự kiện tối đa cần lấy, mặc định 10")] int limit = 10)
        {
            var now = DateTime.UtcNow;

            var events = await _context.Events
                .AsNoTracking()
                .Where(e => e.Status != EventStatus.Archived && e.Status != EventStatus.Cancelled)
                .Where(e => e.EndTime >= now)
                .OrderBy(e => e.StartTime)
                .Take(limit)
                .Select(e => new
                {
                    e.Id,
                    e.Name,
                    e.Location,
                    e.StartTime,
                    e.EndTime,
                    TicketTypes = e.TicketTypes
                        .Where(t => t.IsActive && (t.RemainingQuantity > 0 || t.RemainingCapacity > 0))
                        .Select(t => new
                        {
                            t.Name,
                            t.Price,
                            RemainingQuantity = t.RemainingQuantity > 0 ? t.RemainingQuantity : t.RemainingCapacity
                        })
                        .ToList()
                })
                .ToListAsync();

            if (!events.Any())
            {
                return "Hiện tại chưa có sự kiện nào đang mở bán hoặc sắp diễn ra.";
            }

            return JsonSerializer.Serialize(events);
        }

        [KernelFunction("get_my_orders")]
        [Description(
            "Lấy danh sách ĐƠN HÀNG của CHÍNH khách hàng đang chat (tối đa 5 đơn gần nhất). " +
            "Hàm này KHÔNG nhận tham số userId — luôn tự động trả về đơn hàng của người đang đăng nhập. " +
            "Dùng khi khách hỏi về đơn hàng, trạng thái thanh toán, hóa đơn của họ.")]
        public async Task<string> GetMyOrdersAsync()
        {
            if (_authenticatedUserId is null)
            {
                return "Khách hàng chưa đăng nhập nên không thể tra cứu đơn hàng. Hãy đề nghị khách đăng nhập trước.";
            }

            var userId = _authenticatedUserId.Value;

            var orders = await _context.Orders
                .AsNoTracking()
                .Include(o => o.Event)
                .Include(o => o.TicketType)
                .Include(o => o.Payments)
                .Where(o => o.CustomerId == userId) // BẮT BUỘC filter theo user đã xác thực
                .OrderByDescending(o => o.CreatedAt)
                .Take(5)
                .ToListAsync();

            if (!orders.Any())
            {
                return "Khách hàng chưa có đơn hàng nào.";
            }

            var result = orders.Select(o =>
            {
                var latestPayment = o.Payments.OrderByDescending(p => p.CreatedAt).FirstOrDefault();
                return new
                {
                    o.Id,
                    EventName = o.Event?.Name ?? string.Empty,
                    TicketTypeName = o.TicketType?.Name ?? string.Empty,
                    OrderStatus = o.OrderStatus.ToString(),
                    o.TotalPrice,
                    o.Quantity,
                    o.BuyerName,
                    o.ConfirmedAt,
                    o.CreatedAt,
                    PaymentStatus = latestPayment?.PaymentStatus.ToString(),
                    PaymentMethod = latestPayment?.PaymentMethod.ToString(),
                    latestPayment?.PaidAt
                };
            });

            return JsonSerializer.Serialize(result);
        }

        [KernelFunction("get_my_tickets")]
        [Description(
            "Lấy danh sách VÉ của CHÍNH khách hàng đang chat (tối đa 5 vé gần nhất). " +
            "Hàm này KHÔNG nhận tham số userId — luôn tự động trả về vé của người đang đăng nhập. " +
            "Dùng khi khách hỏi về vé đã mua, trạng thái check-in, mã vé.")]
        public async Task<string> GetMyTicketsAsync()
        {
            if (_authenticatedUserId is null)
            {
                return "Khách hàng chưa đăng nhập nên không thể tra cứu vé. Hãy đề nghị khách đăng nhập trước.";
            }

            var userId = _authenticatedUserId.Value;

            var tickets = await _context.Tickets
                .AsNoTracking()
                .Include(t => t.TicketType)
                    .ThenInclude(tt => tt!.Event)
                .Include(t => t.Order)
                .Where(t => t.Order != null && t.Order.CustomerId == userId) // BẮT BUỘC filter theo user đã xác thực
                .OrderByDescending(t => t.CreatedAt)
                .Take(5)
                .ToListAsync();

            if (!tickets.Any())
            {
                return "Khách hàng chưa có vé nào.";
            }

            var result = tickets.Select(t => new
            {
                t.Id,
                EventName = t.TicketType?.Event?.Name ?? string.Empty,
                TicketTypeName = t.TicketType?.Name ?? string.Empty,
                TicketStatus = t.Status.ToString(),
                t.IsCheckedIn,
                t.IsClaimed,
                t.ValidFrom,
                t.ValidTo
            });

            return JsonSerializer.Serialize(result);
        }

        [KernelFunction("get_refund_policy")]
        [Description("Lấy chính sách hủy vé / hoàn tiền chính thức hiện hành của hệ thống. Luôn gọi hàm này thay vì tự đoán quy định.")]
        public Task<string> GetRefundPolicyAsync()
        {
            // Khớp với CancelOrderService / PartialRefundStrategy: hủy khi còn hơn 72h trước giờ
            // sự kiện diễn ra thì được hủy và hoàn tiền, không thu phí xử lý; dưới 72h thì không
            // được hủy. Nếu Admin có cập nhật chính sách chi tiết hơn trong KnowledgeBase (RAG),
            // AIController sẽ ưu tiên nội dung đó khi build prompt.
            var policy = new
            {
                CancelHoursBeforeEvent = 72,
                Rule = "Khách chỉ được hủy vé và yêu cầu hoàn tiền khi còn hơn 72 giờ (3 ngày) trước giờ bắt đầu sự kiện. Dưới 72 giờ thì không thể hủy hoặc hoàn tiền.",
                RefundFeePercent = 0,
                Note = "Không thu phí xử lý hoàn tiền. Yêu cầu hủy cần được Admin xác nhận, không tự động hoàn tiền ngay lập tức."
            };

            return Task.FromResult(JsonSerializer.Serialize(policy));
        }

        [KernelFunction("get_payment_methods")]
        [Description("Lấy danh sách các phương thức thanh toán mà hệ thống đang hỗ trợ.")]
        public Task<string> GetPaymentMethodsAsync()
        {
            var methods = Enum.GetNames<PaymentMethod>();
            return Task.FromResult(JsonSerializer.Serialize(methods));
        }
    }
}