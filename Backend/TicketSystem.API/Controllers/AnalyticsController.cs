using TicketSystem.Application.DTOs;
using TicketSystem.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace TicketSystem.API.Controllers
{
     [Route("api/[controller]")]
    [ApiController]
    public class AnalyticsController : ControllerBase
    {
        private readonly IAiAnalysisService _aiService;

        public AnalyticsController(IAiAnalysisService aiService)
        {
            _aiService = aiService;
        }

        [HttpPost("ai-report")]
        public async Task<IActionResult> GetAiReport([FromBody] AiReportRequest request)
        {
            if (request == null || request.Data == null)
            {
                return BadRequest(new { message = "Dữ liệu đầu vào không hợp lệ." });
            }

            // Map dữ liệu từ Overview của Frontend sang DTO của Backend
            var stats = new TicketStatisticsDto
            {
                EventName = "Tổng quan hệ thống", // Vì dashboard đang xem tổng quan
                CurrentTime = DateTime.Now.ToString("dd/MM/yyyy HH:mm"),
                TicketsSold = request.Data.TotalTicketsSold ?? 0,
                TicketsCheckedIn = request.Data.TotalCheckinsToday ?? 0,
                TotalRevenue = request.Data.TotalRevenue ?? 0m,
                TotalTickets = (request.Data.TotalTicketsSold ?? 0) + (request.Data.UnusedTickets ?? 0),
                CancelledTickets = 0 // Có thể bổ sung nếu overview của em có trường này
            };

            // Gọi AI Service
            var result = await _aiService.GetEventAnalysisAsync(stats);

            if (result.IsSuccess)
            {
                // Trả về JSON với key "analysisContent" khớp với Frontend
                return Ok(new { analysisContent = result.AnalysisContent });
            }

            return StatusCode(500, new { message = result.ErrorMessage });
        }
    }

    public class AiReportRequest
    {
        public OverviewDataDto? Data { get; set; }
    }

    public class OverviewDataDto
    {
        public decimal? TotalRevenue { get; set; }
        public int? TotalTicketsSold { get; set; }
        public int? TotalCheckinsToday { get; set; }
        public int? TotalEvents { get; set; }
        public decimal? FillRate { get; set; }
        public int? UnusedTickets { get; set; }
    }
}