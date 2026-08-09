using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using TicketSystem.API.Hubs;
using TicketSystem.Application.Interfaces;
using TicketSystem.Application.DTOs; 
using TicketSystem.Domain.Common;
using TicketSystem.Domain.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;
using System;

namespace TicketSystem.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class GateController : ControllerBase
    {
        private readonly IHubContext<GateHub> _hubContext;
        private readonly IAiAnalysisService _aiService;
        private readonly IGateService _gateService;
        // THÊM: Inject DbContext để truy vấn trực tiếp và chuẩn xác
        private readonly IApplicationDbContext _context; 

        public GateController(
            IHubContext<GateHub> hubContext, 
            IAiAnalysisService aiService,
            IGateService gateService,
            IApplicationDbContext context)
        {
            _hubContext = hubContext;
            _aiService = aiService;
            _gateService = gateService;
            _context = context;
        }

        [HttpGet("status")]
        public async Task<IActionResult> GetGateStatus([FromQuery] Guid? eventId)
        {
            var query = _context.Events.AsQueryable();

            if (eventId.HasValue && eventId.Value != Guid.Empty)
            {
                query = query.Where(e => e.Id == eventId.Value);
            }
            else
            {
                query = query.Where(e => e.Status == EventStatus.Ongoing);
            }

            var evt = await query.FirstOrDefaultAsync();

            if (evt == null)
            {
                return Ok(new List<object>());
            }

            var gateStats = await _context.CheckInLogs
                .Where(log => log.EventId == evt.Id)
                .GroupBy(log => log.GateName)
                .Select(g => new 
                {
                    Name = g.Key,
                    CurrentTraffic = g.Where(x => x.Type == ScanType.Entry && x.CheckInResult == "Success").Sum(x => x.PeopleCount),
                    FailedAttempts = g.Count(x => x.CheckInResult == "Failed")
                })
                .ToListAsync();

            // THÊM MỚI: "Quầy Hỗ Trợ (Help Desk)" - nơi nhân viên Help Desk check-in thủ công
            // (khớp đúng GateName hardcode trong TicketCheckInService.ManualCheckInAsync)
            var defaultGates = new List<string> { "Cổng chính - Lối vào 1", "Cổng phụ - Lối vào 2", "Cổng VIP", "Quầy Hỗ Trợ (Help Desk)" };
            
            var result = defaultGates.Select(gateName => {
                var stat = gateStats.FirstOrDefault(g => g.Name == gateName);
                
                // Phân bổ sức chứa (Capacity) tự động dựa vào tên cổng
                // THÊM MỚI: Help Desk là quầy hỗ trợ thủ công, không phải cổng vào chính,
                // nên gán sức chứa nhỏ và tách riêng khỏi 3 nhánh phân bổ % cũ.
                int gateCapacity = gateName.Contains("Help Desk") ? 100 :
                                gateName.Contains("chính") ? evt.MaxCapacity : 
                                gateName.Contains("phụ") ? (int)(evt.MaxCapacity * 0.4) : 
                                (int)(evt.MaxCapacity * 0.1);
                                
                int currentTraffic = stat?.CurrentTraffic ?? 0;

                return new 
                {
                    Id = gateName,
                    Name = gateName,
                    CurrentTraffic = currentTraffic,
                    Capacity = gateCapacity,
                    Status = (currentTraffic > gateCapacity * 0.8) ? "Quá tải" : "Bình thường"
                };
            }).ToList();

            return Ok(result);
        }

        [HttpPost("notify")]
        public async Task<IActionResult> NotifyGate([FromBody] GateNotificationRequest request)
        {
            await _hubContext.Clients.Group(request.GateName).SendAsync("ReceiveGateAlert", request.Message);
            return Ok(new { success = true, message = "Đã gửi thông báo đến cổng thành công!" });
        }

        [HttpPost("ai-predict")]
        public async Task<IActionResult> PredictGateTraffic([FromBody] AiPredictRequest request)
        {
            if (request == null || request.Gates == null || request.Gates.Count == 0)
            {
                return BadRequest(new { message = "Dữ liệu cổng không hợp lệ hoặc trống." });
            }

            var aiResponse = await _aiService.GetGateCrowdAnalysisAsync(request.Gates);

            if (aiResponse.IsSuccess)
            {
                return Ok(aiResponse);
            }
            else
            {
                return StatusCode(500, new { message = aiResponse.ErrorMessage });
            }
        }
    }

    public class GateNotificationRequest
    {
        public string GateName { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
    }

    public class AiPredictRequest
    {
        public List<GateTrafficDto> Gates { get; set; } = new List<GateTrafficDto>();
    }
}