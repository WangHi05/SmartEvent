namespace TicketSystem.Application.DTOs
{
    public class SystemKnowledgeDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
    }
}