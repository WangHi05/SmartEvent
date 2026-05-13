using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TicketSystem.Application.DTOs;

namespace TicketSystem.Application.Interfaces
{
    public interface IDashboardService
    {
        Task<AdminOverviewDto> GetAdminOverviewAsync();
        Task<IEnumerable<RevenuePointDto>> GetAdminRevenueAsync(string period, DateTime? from, DateTime? to);
        Task<IEnumerable<TopEventDto>> GetAdminTopEventsAsync(int top = 10);
        Task<PaymentStatsDto> GetAdminPaymentStatsAsync();
        Task<IEnumerable<RecentOrderDto>> GetAdminRecentOrdersAsync(int limit = 20);

        Task<AdminOverviewDto> GetDirectorOverviewAsync(string userId);
        Task<IEnumerable<RevenuePointDto>> GetDirectorRevenueAsync(string userId, string period, DateTime? from, DateTime? to);
        Task<IEnumerable<TopEventDto>> GetDirectorTopEventsAsync(string userId, int top = 10);

        // Export methods
        Task<ExportReportDataDto> GetEventReportDataAsync(Guid eventId, string? userId = null);
        Task<ExportSummaryReportDataDto> GetDirectorSummaryReportDataAsync(string userId);
        Task<ExportSummaryReportDataDto> GetAdminSummaryReportDataAsync();
    }
}
