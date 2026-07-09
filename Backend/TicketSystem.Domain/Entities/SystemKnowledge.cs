using System;
using Pgvector;

namespace TicketSystem.Domain.Entities
{
    public class SystemKnowledge
    {
        public Guid Id { get; set; }
        
        // Tiêu đề của tài liệu (VD: "Chính sách hoàn vé 2026")
        public string Title { get; set; }
        
        // Nội dung chi tiết của tài liệu để AI đọc
        public string Content { get; set; }
        
        // Vector toán học sinh ra từ Content (Dùng cho Semantic Kernel & Gemini)
        public Vector Embedding { get; set; }
    }
}