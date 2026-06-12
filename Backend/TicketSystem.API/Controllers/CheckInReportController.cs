using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TicketSystem.Application.Interfaces;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace TicketSystem.API.Controllers
{
    [Route("api/checkin-report")]
    [ApiController]
    public class CheckInReportController : ControllerBase
    {
        private readonly IApplicationDbContext _context;

        public CheckInReportController(IApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetCheckInHistory(
            [FromQuery] Guid? eventId, 
            [FromQuery] int pageIndex = 1, 
            [FromQuery] int pageSize = 20)
        {
            var query = _context.CheckInLogs.AsQueryable();

            // Nếu có truyền EventId lên, thì lọc theo sự kiện đó
            if (eventId.HasValue && eventId.Value != Guid.Empty)
            {
                query = query.Where(x => x.EventId == eventId.Value);
            }

            // Tính toán số liệu thống kê tổng quan (Dashboard Summary)
            var totalCount = await query.CountAsync();
            var successCount = await query.CountAsync(x => x.CheckInResult == "Success");
            var failedCount = totalCount - successCount;
            var totalPeople = await query.Where(x => x.CheckInResult == "Success").SumAsync(x => x.PeopleCount);

            // Lấy dữ liệu chi tiết có phân trang
            var items = await query
                .OrderByDescending(x => x.CheckedAt)
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new 
                {
                    Id = x.Id,
                    CheckedAt = x.CheckedAt,
                    GateName = x.GateName,
                    CheckInResult = x.CheckInResult,
                    FailureReason = x.FailureReason,
                    PeopleCount = x.PeopleCount,
                    StaffId = x.StaffId,
                    TicketId = x.TicketId
                })
                .ToListAsync();

            return Ok(new 
            {
                TotalCount = totalCount,
                SuccessCount = successCount,
                FailedCount = failedCount,
                TotalPeople = totalPeople,
                Items = items
            });
        }
    }
}