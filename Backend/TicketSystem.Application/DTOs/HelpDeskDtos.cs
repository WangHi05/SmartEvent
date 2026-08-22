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
        public int RemainingSlots { get; set; }
    }

    public class RevokeAndReissueRequestDto
    {
        [Required]
        public string Reason { get; set; } = string.Empty; 
        
        [Required]
        public string ActionBy { get; set; } = string.Empty;
    }

    public class ManualCheckInRequestDto
    {
        [Required(ErrorMessage = "Lý do là bắt buộc để ghi Audit Log.")]
        public string Reason { get; set; } = string.Empty;
        
        [Required(ErrorMessage = "Người thực hiện không được để trống.")]
        public string ActionBy { get; set; } = string.Empty;

        // Validation chặn số lượng <= 0, hỗ trợ an toàn dữ liệu từ vòng ngoài
        [Range(1, 1000, ErrorMessage = "Số lượng check-in phải từ 1 trở lên.")]
        public int PeopleCount { get; set; } = 1; 
    }
}