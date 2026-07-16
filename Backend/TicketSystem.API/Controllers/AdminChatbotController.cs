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

        public AdminChatbotController(IAdminChatbotService chatbotService)
        {
            _chatbotService = chatbotService;
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
    }
}