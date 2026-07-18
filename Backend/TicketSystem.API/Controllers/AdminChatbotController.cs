using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TicketSystem.Application.Interfaces;

namespace TicketSystem.API.Controllers
{
    [ApiController]
    [Route("api/admin/chatbot")]
    [Authorize(Roles = "Admin")] 
    public class AdminChatbotController : ControllerBase
    {
        private readonly IAdminChatbotService _chatbotService;
        private readonly IAuditLogService _auditLogService;
        
        public AdminChatbotController(IAdminChatbotService chatbotService, IAuditLogService auditLogService)
        {
            _chatbotService = chatbotService;
            _auditLogService = auditLogService;
        }

        public class ChatRequestDto { public string Question { get; set; } = string.Empty; }
        public class IngestRequestDto { public string Title { get; set; } = string.Empty; public string Content { get; set; } = string.Empty; }

        [HttpPost("ask")]
        public async Task<IActionResult> Ask([FromBody] ChatRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.Question)) return BadRequest("Câu hỏi không được để trống.");
            var answer = await _chatbotService.AskQuestionAsync(request.Question);
            return Ok(new { Answer = answer });
        }

        [HttpPost("ingest")]
        public async Task<IActionResult> IngestKnowledge([FromBody] IngestRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Content))
                return BadRequest("Tiêu đề và nội dung không được trống.");
            await _chatbotService.IngestKnowledgeAsync(request.Title, request.Content);
            return Ok(new { Message = "Đã nạp kiến thức thành công." });
        }

         [HttpGet("knowledge")]
        public async Task<IActionResult> GetAllKnowledge()
        {
            var data = await _chatbotService.GetAllKnowledgeAsync();
            return Ok(data);
        }

        [HttpDelete("knowledge/{id}")]
        public async Task<IActionResult> DeleteKnowledge(Guid id)
        {
            var success = await _chatbotService.DeleteKnowledgeAsync(id);
            if (!success) return NotFound(new { Message = "Không tìm thấy tài liệu này trong hệ thống." });
            
            return Ok(new { Message = "Xóa tài liệu thành công." });
        }

        [HttpPost("execute-action")]
        public async Task<IActionResult> ExecuteAction(
            [FromBody] ExecuteActionDto request, 
            [FromServices] IGateNotificationService notificationService)
        {
            if (string.IsNullOrEmpty(request.GateName) || string.IsNullOrEmpty(request.Message))
                return BadRequest("Dữ liệu lệnh không hợp lệ.");

            try
            {
                // 1. Phát tín hiệu SignalR thời gian thực xuống cổng của Nhân viên soát vé
                await notificationService.SendAlertAsync(request.GateName, request.Message);

                // 2. Trích xuất thông tin định danh Admin thực hiện từ JWT Token
                var adminUser = User.Identity?.Name ?? "Admin_Collaborator";
                
                // Trích xuất IP Client thao tác
                var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();

                // 3. Ghi nhận log truy vết bảo mật (Module 1 Audit Trail)
                var details = $"[Human-In-The-Loop AI Suggestion] Admin đã duyệt và thực thi kịch bản điều phối xuống {request.GateName} với nội dung: '{request.Message}'";
                
                await _auditLogService.LogAsync(
                    action: "AI_ExecuteAction",
                    entityType: "GateControl",
                    entityId: Guid.Empty, // Thiết lập Guid.Empty đối với các thao tác toàn cục hệ thống
                    performedBy: adminUser,
                    details: details,
                    ipAddress: ipAddress
                );

                return Ok(new { Message = $"Đã phát lệnh thành công xuống {request.GateName}!" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = $"Lỗi hệ thống: {ex.Message}" });
            }
        }

        public class ExecuteActionDto
        {
            public string GateName { get; set; } = string.Empty;
            public string Message { get; set; } = string.Empty;
        }
    }
}