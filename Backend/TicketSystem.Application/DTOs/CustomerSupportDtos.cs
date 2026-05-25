using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TicketSystem.Application.DTOs
{
    public class CustomerSupportRequestDto
    {
        [Required(ErrorMessage = "Câu hỏi không được bỏ trống")]
        [StringLength(1000, MinimumLength = 1, ErrorMessage = "Câu hỏi phải từ 1 đến 1000 ký tự")]
        public string Message { get; set; } = string.Empty;

        public List<CustomerSupportConversationTurnDto> History { get; set; } = new();
    }

    public class CustomerSupportConversationTurnDto
    {
        [Required]
        public string Role { get; set; } = string.Empty;

        [Required]
        public string Content { get; set; } = string.Empty;
    }

    public class CustomerSupportResponseDto
    {
        public bool IsSuccess { get; set; }
        public string ResponseType { get; set; } = "text";
        public string Answer { get; set; } = string.Empty;
        public object? Data { get; set; }
    }

    public class OpenSaleEventDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public string? Location { get; set; }
        public string? Description { get; set; }
        public List<OpenSaleTicketTypeDto> TicketTypes { get; set; } = new();
    }

    public class OpenSaleTicketTypeDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int RemainingQuantity { get; set; }
    }
}
