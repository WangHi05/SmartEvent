using System;
using System.ComponentModel.DataAnnotations;

namespace TicketSystem.Application.DTOs
{
    public class HelpDeskTicketResponseDto
    {
        public Guid TicketId { get; set; }
        public string SecretKey { get; set; } = string.Empty;
        public string TicketStatus { get; set; } = string.Empty;
        
        public string BuyerName { get; set; } = string.Empty;
        public string BuyerPhone { get; set; } = string.Empty;
        public string? BuyerCccd { get; set; }
        
        public Guid EventId { get; set; }
        public string EventName { get; set; } = string.Empty;
        public string TicketTypeName { get; set; } = string.Empty;
    }

    public class RevokeAndReissueRequestDto
    {
        [Required]
        public string Reason { get; set; } = string.Empty; 
        
        [Required]
        public string ActionBy { get; set; } = string.Empty;
    }
}