using System;
using System.Collections.Generic;

namespace TicketSystem.Application.DTOs
{
    public class AdminOverviewDto
    {
        public decimal TotalRevenue { get; set; }
        public int TotalTicketsSold { get; set; }
        public int TotalOrders { get; set; }
        public int TotalEvents { get; set; }
        public int TotalCustomers { get; set; }
        public int TotalCheckinsToday { get; set; }
        public int UnusedTickets { get; set; }
        public double FillRate { get; set; }
        public double RevenueGrowthPercent { get; set; }
    }

    public class RevenuePointDto
    {
        public DateTime Period { get; set; }
        public decimal Revenue { get; set; }
    }

    public class TopEventDto
    {
        public Guid EventId { get; set; }
        public string EventName { get; set; } = string.Empty;
        public int TicketsSold { get; set; }
        public decimal Revenue { get; set; }
        public double CheckinRate { get; set; }
    }

    public class PaymentStatsDto
    {
        public decimal VnPayAmount { get; set; }
        public int VnPayCount { get; set; }
        public decimal QrAmount { get; set; }
        public int QrCount { get; set; }
        public decimal CounterAmount { get; set; }
        public int CounterCount { get; set; }
    }

    public class RecentOrderDto
    {
        public Guid OrderId { get; set; }
        public DateTime CreatedAt { get; set; }
        public decimal TotalPrice { get; set; }
        public string BuyerName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public string OrderStatus { get; set; } = string.Empty;
    }
}
