using System;
using System.ComponentModel.DataAnnotations;
using TicketSystem.Application.Common;
 
namespace TicketSystem.Application.DTOs
{
    public class TicketStatisticsDto
    {
        public string EventName { get; set; } = string.Empty;
        public int TotalTickets { get; set; }
        public int TicketsSold { get; set; }
        public int TicketsCheckedIn { get; set; }
        public decimal TotalRevenue { get; set; }
        public int CancelledTickets { get; set; }
        public string CurrentTime { get; set; } = VietnamTime.Now.ToString("dd/MM/yyyy HH:mm");
    }
}