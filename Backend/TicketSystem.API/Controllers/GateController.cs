using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using TicketSystem.API.Hubs;
using TicketSystem.Application.Interfaces;
using System.Threading.Tasks;

namespace TicketSystem.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class GateController : ControllerBase
    {
        private readonly IHubContext<GateHub> _hubContext;
        private readonly IAiAnalysisService _aiService;

        public GateController(IHubContext<GateHub> hubContext, IAiAnalysisService aiService)
        {
            _hubContext = hubContext;
            _aiService = aiService;
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

            // Truyền mảng danh sách các cổng vào cho Gemini AI xử lý
            var aiResponse = await _aiService.GetGateCrowdAnalysisAsync(request.Gates);

            // Trả kết quả về cho Frontend (Có chứa AnalysisContent)
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

    public class GateTrafficDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int CurrentTraffic { get; set; }
        public int Capacity { get; set; }
        public string Status { get; set; } = string.Empty;
    }
}