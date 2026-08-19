using System.ComponentModel;
using Microsoft.EntityFrameworkCore;
using Microsoft.SemanticKernel;
using TicketSystem.Application.Interfaces;
using TicketSystem.Domain.Common;
using System.Text.Json; 

namespace TicketSystem.Infrastructure.AI.Plugins
{
    /// <summary>
    /// Lớp này chứa các "Công cụ" (Functions) để AI có thể tự động gọi khi cần truy xuất dữ liệu có cấu trúc.
    /// </summary>
    public class SystemDataPlugin
    {
        private readonly IApplicationDbContext _context;

        public SystemDataPlugin(IApplicationDbContext context)
        {
            _context = context;
        }

        [KernelFunction("get_top_revenue_events")]
        [Description("Lấy danh sách các sự kiện có doanh thu cao nhất hoặc thông tin doanh thu của sự kiện.")]
        public async Task<string> GetTopRevenueEventsAsync(
            [Description("Số lượng sự kiện cần lấy, mặc định là 5")] int limit = 5)
        {
            var topEvents = await _context.Events
                .Select(e => new 
                {
                    e.Name,
                    TotalRevenue = _context.Orders
                        .Where(o => o.EventId == e.Id && o.OrderStatus == OrderStatus.Confirmed)
                        .Sum(o => o.TotalPrice) 
                })
                .OrderByDescending(x => x.TotalRevenue)
                .Take(limit)
                .ToListAsync();

            if (!topEvents.Any()) return "Hiện tại chưa có dữ liệu doanh thu.";

            var result = "Danh sách doanh thu:\n";
            foreach (var ev in topEvents)
            {
                result += $"- Sự kiện '{ev.Name}': {ev.TotalRevenue:N0} VNĐ\n";
            }
            return result;
        }

        [KernelFunction("get_top_customers")]
        [Description("Lấy danh sách những khách hàng mua nhiều vé nhất.")]
        public async Task<string> GetTopCustomersAsync(
            [Description("Số lượng khách hàng cần lấy, mặc định là 5")] int limit = 5)
        {
            try 
            {
                // Sử dụng Navigation Properties chuẩn của EF Core thay vì Join thủ công
                // TRỌNG TÂM FIX LỖI: Truy vấn trên tập _context.Customers thay vì _context.Users
                var topCustomers = await _context.Customers
                    .Select(c => new
                    {
                        FullName = c.FullName,
                        // Lọc các đơn hàng có trạng thái Confirmed và đếm tổng số vé (Tickets) bên trong
                        TicketCount = c.Orders
                            .Where(o => o.OrderStatus == OrderStatus.Confirmed)
                            .SelectMany(o => o.Tickets)
                            .Count()
                    })
                    // Chỉ lấy những khách hàng thực sự có vé
                    .Where(x => x.TicketCount > 0)
                    // Sắp xếp giảm dần theo số lượng vé
                    .OrderByDescending(x => x.TicketCount)
                    .Take(limit)
                    .ToListAsync();

                if (!topCustomers.Any()) 
                    return "Hiện tại chưa có khách hàng nào mua vé thành công trên hệ thống.";

                var result = "Dưới đây là danh sách Top khách hàng mua nhiều vé nhất:\n";

                foreach (var stat in topCustomers)
                {
                    // Xử lý chuỗi an toàn, dự phòng trường hợp FullName bị null
                    string displayName = !string.IsNullOrWhiteSpace(stat.FullName) 
                        ? stat.FullName 
                        : "Khách hàng Ẩn danh";
                    
                    result += $"- **{displayName}**: {stat.TicketCount} vé\n";
                }
                
                return result;
            }
            catch (Exception ex)
            {
                // Ghi nhận ngoại lệ an toàn để AI không bị sập (Exception Handling)
                return $"Lỗi khi truy xuất dữ liệu khách hàng: {ex.Message}";
            }
        }

        [KernelFunction("get_ongoing_events")]
        [Description("Lấy danh sách các sự kiện đang diễn ra hoặc sắp diễn ra (chưa kết thúc). Dùng khi Admin hỏi 'có sự kiện nào đang diễn ra', 'sự kiện sắp tới'.")]
        public async Task<string> GetOngoingEventsAsync(
            [Description("Số lượng sự kiện cần lấy, mặc định là 5")] int limit = 5)
        {
            var now = DateTime.UtcNow;
            
            // BƯỚC 1: Truy vấn Database (Server Evaluation) - KHÔNG dùng .ToString() ở đây
            var events = await _context.Events
                .Where(e => e.EndTime >= now) 
                .OrderBy(e => e.StartTime) // Đưa OrderBy lên trước để sort theo thời gian thực
                .Take(limit)
                .Select(e => new 
                {
                    e.Name,
                    e.Location,
                    e.StartTime, // Giữ nguyên kiểu DateTime
                    e.MaxCapacity,
                    CurrentOccupancy = _context.Tickets.Count(t => t.Order != null && t.Order.EventId == e.Id && (int)t.Status == 2)
                })
                .ToListAsync();

            if (!events.Any()) return "Hiện tại không có sự kiện nào đang hoặc sắp diễn ra.";

            // BƯỚC 2: Xử lý định dạng chuỗi trên RAM (Client Evaluation)
            var formattedEvents = events.Select(e => new 
            {
                e.Name,
                e.Location,
                StartTime = e.StartTime.ToString("dd/MM/yyyy HH:mm"),
                e.MaxCapacity,
                e.CurrentOccupancy
            });

            return JsonSerializer.Serialize(formattedEvents);
        }
        [KernelFunction("search_events_by_criteria")]
        [Description(
            "Tìm sự kiện phù hợp theo địa điểm, chủ đề, ngân sách tổng cộng, " +
            "số người và từ khóa cần loại trừ. Dùng khi người dùng muốn tìm hoặc " +
            "chọn sự kiện phù hợp với nhiều tiêu chí."
        )]
         public async Task<string> SearchEventsByCriteriaAsync(
            [Description("Địa điểm cần tìm, ví dụ: Hà Nội")]
            string? location = null, 

            [Description("Chủ đề hoặc từ khóa cần tìm, ví dụ: công nghệ, startup, bất động sản")]
            string? keyword = null,

            [Description("Số người tham gia. Nếu người dùng không nói rõ, mặc định truyền là 1")]
            int people = 1, 

            [Description("Tổng ngân sách tối đa cho tất cả người (VNĐ). CHỈ TRUYỀN khi người dùng nhắc đến tiền/ngân sách/giá rẻ. Nếu không, bắt buộc để trống (null)")]
            decimal? maxBudget = null, 

            [Description("Từ khóa cần loại trừ, ví dụ: âm nhạc, ca nhạc")]
            string? excludeKeyword = null)
        {
            Console.WriteLine(
                $"[AI TOOL] search_events_by_criteria CALLED | " +
                $"location={location} | keyword={keyword} | " +
                $"people={people} | budget={maxBudget} | " +
                $"exclude={excludeKeyword}");

            var query = _context.Events
                .AsNoTracking()
                .Where(e =>
                    e.Status != EventStatus.Archived &&
                    e.Status != EventStatus.Cancelled);

            // Địa điểm
            if (!string.IsNullOrWhiteSpace(location))
            {
                var loc = location.Trim().ToLower();

                query = query.Where(e =>
                    e.Location.ToLower().Contains(loc));
            }

            // Từ khóa bắt buộc phải có
            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var key = keyword.Trim().ToLower();

                query = query.Where(e =>
                    e.Name.ToLower().Contains(key) ||
                    e.Description.ToLower().Contains(key));
            }

            // Từ khóa phải loại trừ
            if (!string.IsNullOrWhiteSpace(excludeKeyword))
            {
                var excluded = excludeKeyword
                    .Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(x => x.Trim().ToLower())
                    .ToList();

                foreach (var word in excluded)
                {
                    query = query.Where(e =>
                        !e.Name.ToLower().Contains(word) &&
                        !e.Description.ToLower().Contains(word));
                }
            }

            var events = await query
                .Select(e => new
                {
                    e.Name,
                    e.Description,
                    e.Location,
                    e.StartTime,
                    e.EndTime,

                    TicketTypes = e.TicketTypes
                        .Where(t =>
                            t.IsActive &&
                            t.RemainingQuantity >= people)
                        .Select(t => new
                        {
                            t.Name,
                            t.Price,
                            t.RemainingQuantity
                        })
                        .ToList()
                })
                .ToListAsync();

            var result = events
                .Select(e => new
                {
                    e.Name,
                    e.Description,
                    e.Location,
                    e.StartTime,
                    e.EndTime,

                    TicketTypes = e.TicketTypes
                        .Where(t => maxBudget == null || (t.Price * people) <= maxBudget.Value)
                        .Select(t => new
                        {
                            t.Name,
                            PricePerPerson = t.Price,
                            TotalPrice = t.Price * people,
                            t.RemainingQuantity
                        })
                        .ToList()
                })
                .Where(e => e.TicketTypes.Any()) // Giữ lại sự kiện nếu còn ít nhất 1 loại vé pass qua bộ lọc
                .ToList();

            if (!result.Any())
            {
                return "Không tìm thấy sự kiện phù hợp với các tiêu chí đã cung cấp.";
            }

            return JsonSerializer.Serialize(result);
        }

        [KernelFunction("get_realtime_checkin_status")]
        [Description("Lấy tình trạng check-in theo thời gian thực và cảnh báo sức chứa của một sự kiện cụ thể.")]
        public async Task<string> GetRealtimeCheckinStatusAsync(
            [Description("Tên của sự kiện cần kiểm tra (Ví dụ: 'Lễ hội âm nhạc')")] string eventName)
        {
            var evt = await _context.Events
                .Where(e => e.Name.ToLower().Contains(eventName.ToLower()))
                .Select(e => new { e.Id, e.Name, e.MaxCapacity })
                .FirstOrDefaultAsync();

            if (evt == null) return $"Không tìm thấy sự kiện nào có tên chứa '{eventName}'.";

            var ticketStats = await _context.Tickets
                .Where(t => t.Order != null && t.Order.EventId == evt.Id)
                .GroupBy(t => t.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() })
                .ToListAsync();

            var checkedIn = ticketStats.Where(x => (int)x.Status == 2).Sum(x => x.Count);
            var notCheckedIn = ticketStats.Where(x => (int)x.Status == 1).Sum(x => x.Count); // 1 = Active (Chưa check-in)

            var result = new 
            {
                EventName = evt.Name,
                TotalCapacity = evt.MaxCapacity,
                TotalCheckedIn = checkedIn,
                TotalWaiting = notCheckedIn,
                WarningRisk = checkedIn >= evt.MaxCapacity * 0.9 ? "CẢNH BÁO: Sự kiện sắp quá tải (đã đạt >90% sức chứa)!" : "Mật độ an toàn, bình thường"
            };

            return JsonSerializer.Serialize(result);
        }
    }
}