using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using TicketSystem.API.Hubs;
using TicketSystem.Application.Interfaces;
using TicketSystem.Application.DTOs; 
using System.Collections.Generic;
using System.Threading.Tasks;

namespace TicketSystem.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class GateController : ControllerBase
    {
        private readonly IHubContext<GateHub> _hubContext;
        private readonly IAiAnalysisService _aiService;
        private readonly IGateService _gateService;

        public GateController(
            IHubContext<GateHub> hubContext, 
            IAiAnalysisService aiService,
            IGateService gateService)
        {
            _hubContext = hubContext;
            _aiService = aiService;
            _gateService = gateService;
        }

        [HttpGet("status")]
        public async Task<IActionResult> GetGateStatus()
        {
            var gates = await _gateService.GetGateTrafficStatusAsync();
            return Ok(gates);
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