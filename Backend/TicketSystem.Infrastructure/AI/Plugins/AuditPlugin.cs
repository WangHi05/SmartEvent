using System;
using System.ComponentModel;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.SemanticKernel;
using TicketSystem.Infrastructure.Data;

namespace TicketSystem.Infrastructure.AI.Plugins
{
    /// <summary>
    /// Plugin cung cấp khả năng điều tra, truy vết lịch sử Check-in và Audit Logs cho AI.
    /// Đáp ứng tiêu chí truy vết sự cố của Module 5.2.
    /// </summary>
    public class AuditPlugin
    {
        private readonly ApplicationDbContext _context;

        public AuditPlugin(ApplicationDbContext context)
        {
            _context = context;
        }

        [KernelFunction("investigate_checkin_logs")]
        [Description("Truy vết lịch sử soát vé (Check-in). BẮT BUỘC SỬ DỤNG hàm này khi Admin yêu cầu điều tra việc soát vé, xem nhân viên nào đã cho ai vào, hoặc kiểm tra lưu lượng soát vé của một cổng cụ thể.")]
        public async Task<string> InvestigateCheckInLogsAsync(
            [Description("Tên hoặc ID của cổng cần điều tra (Ví dụ: 'Cổng chính - Lối vào 1'). Nếu không cần lọc theo cổng, truyền chuỗi rỗng ''")] string gateName = "",
            [Description("Tên nhân viên soát vé cần điều tra. Nếu không cần, truyền chuỗi rỗng ''")] string staffName = "",
            [Description("Trạng thái soát vé: 'Success' hoặc 'Error'. Truyền rỗng nếu lấy tất cả.")] string status = "",
            [Description("Số lượng bản ghi tối đa cần lấy, ưu tiên các bản ghi mới nhất. Mặc định là 10.")] int limit = 10)
        {
            try
            {
                var query = _context.CheckInLogs.AsQueryable();

                // 1. Áp dụng các bộ lọc điều tra do AI quyết định
                if (!string.IsNullOrWhiteSpace(gateName))
                {
                    query = query.Where(l => l.GateName.Contains(gateName));
                }

                if (!string.IsNullOrWhiteSpace(staffName))
                {
                    query = query.Where(l => l.ScannedBy != null && l.ScannedBy.Contains(staffName));
                }

                if (!string.IsNullOrWhiteSpace(status))
                {
                    query = query.Where(l => l.CheckInResult == status);
                }

                // 2. Lấy dữ liệu mới nhất
                var logs = await query
                    .OrderByDescending(l => l.Timestamp)
                    .Take(limit)
                    .Select(l => new 
                    {
                        Time = l.Timestamp.ToString("dd/MM/yyyy HH:mm:ss"),
                        Gate = l.GateName,
                        Staff = l.ScannedBy,
                        Status = l.CheckInResult,
                        People = l.PeopleCount,
                        Message = l.ErrorMessage ?? "Thành công"
                    })
                    .ToListAsync();

                if (!logs.Any()) return "Không tìm thấy bất kỳ lịch sử check-in nào khớp với tiêu chí điều tra.";

                // 3. Trả về JSON để AI đọc hiểu và tổng hợp báo cáo cho Admin
                return JsonSerializer.Serialize(logs);
            }
            catch (Exception ex)
            {
                return $"Đã xảy ra lỗi khi truy xuất dữ liệu: {ex.Message}";
            }
        }
    }
}