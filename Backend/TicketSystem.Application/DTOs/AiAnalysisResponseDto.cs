using System;
using System.ComponentModel.DataAnnotations;
 
namespace TicketSystem.Application.DTOs
{
   public class AiAnalysisResponseDto
    {
        public string AnalysisContent { get; set; } = string.Empty;
        public bool IsSuccess { get; set; }
        public string ErrorMessage { get; set; } = string.Empty;
    }
}
