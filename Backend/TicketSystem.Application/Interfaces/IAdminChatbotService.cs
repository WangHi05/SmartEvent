using System.Threading.Tasks;
using TicketSystem.Application.DTOs;

namespace TicketSystem.Application.Interfaces
{
    /// <summary>
    /// Giao diện xử lý logic cho Admin Chatbot (Sử dụng Agentic RAG)
    /// </summary>
    public interface IAdminChatbotService
    {
        /// <summary>
        /// Gửi câu hỏi của Admin tới AI và nhận câu trả lời.
        /// AI sẽ tự động quyết định việc tìm kiếm Vector (chính sách) hoặc gọi C# Function (số liệu thực tế).
        /// </summary>
        /// <param name="question">Câu hỏi từ giao diện React của Admin</param>
        /// <returns>Câu trả lời bằng ngôn ngữ tự nhiên từ AI</returns>
        Task<string> AskQuestionAsync(string question);

        /// <summary>
        /// (Tùy chọn) Hàm dùng để Admin cập nhật các quy định/tài liệu mới vào Database dưới dạng Vector
        /// </summary>
        /// <param name="title">Tiêu đề tài liệu</param>
        /// <param name="content">Nội dung chi tiết</param>
        Task IngestKnowledgeAsync(string title, string content);

        /// <summary>
        /// Lấy danh sách toàn bộ các chính sách/tài liệu đã nạp cho AI
        /// </summary>
        Task<List<SystemKnowledgeDto>> GetAllKnowledgeAsync();

        /// <summary>
        /// Xóa một tài liệu/chính sách khỏi Vector Database
        /// </summary>
        Task<bool> DeleteKnowledgeAsync(Guid id);
    }
}