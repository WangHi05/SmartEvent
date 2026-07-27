using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TicketSystem.Application.DTOs;

namespace TicketSystem.Application.Interfaces
{
    /// <summary>
    /// Giao diện xử lý logic cho Admin Chatbot (Sử dụng Agentic RAG)
    /// </summary>
    public interface IAdminChatbotService
    {
        Task<string> AskQuestionAsync(string question);

        Task IngestKnowledgeAsync(string title, string content);

        Task<List<SystemKnowledgeDto>> GetAllKnowledgeAsync();

        Task<bool> DeleteKnowledgeAsync(Guid id);

        /// <summary>
        /// Cập nhật tiêu đề/nội dung tài liệu đã có, đồng thời tính lại vector embedding mới
        /// </summary>
        Task<bool> UpdateKnowledgeAsync(Guid id, string title, string content);
    }
}