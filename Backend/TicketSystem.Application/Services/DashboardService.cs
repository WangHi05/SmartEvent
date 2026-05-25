using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TicketSystem.Application.Common;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Interfaces;
using TicketSystem.Domain.Entities;
using TicketSystem.Domain.Common;

namespace TicketSystem.Application.Services
{
    public class DashboardService : IDashboardService
    {
        private readonly IApplicationDbContext _db;

        private enum RevenueGranularity
        {
            Day,
            Month,
            Year
        }

        private static DateTime GetEffectivePaymentTime(DateTime? paidAt, DateTime? updatedAt, DateTime createdAt)
        {
            return paidAt ?? updatedAt ?? createdAt;
        }

        private static RevenueGranularity ResolveRevenueGranularity(string? period)
        {
            return period?.ToLowerInvariant() switch
            {
                "month" => RevenueGranularity.Month,
                "year" => RevenueGranularity.Year,
                _ => RevenueGranularity.Day
            };
        }

        private static DateTime NormalizeRevenueBucket(DateTime value, RevenueGranularity granularity)
        {
            return granularity switch
            {
                RevenueGranularity.Month => new DateTime(value.Year, value.Month, 1),
                RevenueGranularity.Year => new DateTime(value.Year, 1, 1),
                _ => value.Date
            };
        }

        private static DateTime AdvanceRevenueBucket(DateTime value, RevenueGranularity granularity)
        {
            return granularity switch
            {
                RevenueGranularity.Month => value.AddMonths(1),
                RevenueGranularity.Year => value.AddYears(1),
                _ => value.AddDays(1)
            };
        }

        private static (DateTime Start, DateTime EndExclusive) ResolveRevenueWindow(RevenueGranularity granularity, DateTime? from, DateTime? to)
        {
            var now = DateTime.UtcNow;
            var start = from ?? granularity switch
            {
                RevenueGranularity.Month => now.AddMonths(-11),
                RevenueGranularity.Year => now.AddYears(-4),
                _ => now.AddDays(-6)
            };

            var end = to ?? now;

            start = NormalizeRevenueBucket(start, granularity);
            end = NormalizeRevenueBucket(end, granularity);

            if (end < start)
            {
                (start, end) = (end, start);
            }

            return (start, AdvanceRevenueBucket(end, granularity));
        }

        private static List<RevenuePointDto> BuildContinuousRevenueSeries(
            IEnumerable<RevenuePointDto> groupedPoints,
            RevenueGranularity granularity,
            DateTime start,
            DateTime end)
        {
            var revenueByPeriod = groupedPoints.ToDictionary(
                point => NormalizeRevenueBucket(point.Period, granularity),
                point => point.Revenue);

            var result = new List<RevenuePointDto>();
            for (var cursor = start; cursor <= end; cursor = AdvanceRevenueBucket(cursor, granularity))
            {
                result.Add(new RevenuePointDto
                {
                    Period = cursor,
                    Revenue = revenueByPeriod.TryGetValue(cursor, out var revenue) ? revenue : 0m
                });
            }

            return result;
        }

        private async Task<List<RevenuePointDto>> GetRevenueSeriesAsync(IQueryable<Payment> query, string? period, DateTime? from, DateTime? to)
        {
            var granularity = ResolveRevenueGranularity(period);
            var (start, endExclusive) = ResolveRevenueWindow(granularity, from, to);

            query = query.Where(p => (p.PaidAt ?? p.UpdatedAt ?? p.CreatedAt) >= start && (p.PaidAt ?? p.UpdatedAt ?? p.CreatedAt) < endExclusive);

            var list = await query.ToListAsync();
            var points = list.Select(p => new
            {
                PaidAt = GetEffectivePaymentTime(p.PaidAt, p.UpdatedAt, p.CreatedAt),
                p.Amount
            });

            var grouped = granularity switch
            {
                RevenueGranularity.Month => points.GroupBy(p => new DateTime(p.PaidAt.Year, p.PaidAt.Month, 1))
                    .Select(g => new RevenuePointDto { Period = g.Key, Revenue = g.Sum(x => x.Amount) })
                    .ToList(),
                RevenueGranularity.Year => points.GroupBy(p => new DateTime(p.PaidAt.Year, 1, 1))
                    .Select(g => new RevenuePointDto { Period = g.Key, Revenue = g.Sum(x => x.Amount) })
                    .ToList(),
                _ => points.GroupBy(p => p.PaidAt.Date)
                    .Select(g => new RevenuePointDto { Period = g.Key, Revenue = g.Sum(x => x.Amount) })
                    .ToList()
            };

            return BuildContinuousRevenueSeries(grouped, granularity, start, AdvanceRevenueBucket(endExclusive, granularity).AddTicks(-1));
        }

        public DashboardService(IApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<AdminOverviewDto> GetAdminOverviewAsync()
        {
            var totalRevenue = await _db.Payments
                .Where(p => p.PaymentStatus == PaymentStatus.Completed)
                .SumAsync(p => (decimal?)p.Amount) ?? 0m;

            var totalTicketsSold = await _db.Orders
                .Where(o => o.OrderStatus != OrderStatus.Cancelled)
                .SumAsync(o => (int?)o.Quantity) ?? 0;

            var totalOrders = await _db.Orders.CountAsync();
            var totalEvents = await _db.Events.CountAsync();
            var totalCustomers = await _db.Users.CountAsync(u => u.Role == UserRole.Customer);

            var today = DateOnly.FromDateTime(VietnamTime.Now);
            var totalCheckinsToday = await _db.CheckInLogs
                .Where(c => c.CheckinDate == today)
                .SumAsync(c => (int?)c.PeopleCount) ?? 0;

            var unusedTickets = await _db.Tickets
                .Where(t => t.RemainingSlots > 0)
                .SumAsync(t => (int?)t.RemainingSlots) ?? 0;

            var totalCapacity = await _db.Events.SumAsync(e => (int?)e.MaxCapacity) ?? 0;
            double fillRate = 0;
            if (totalCapacity > 0)
                fillRate = (double)totalTicketsSold / totalCapacity * 100.0;

            // revenue growth: compare last 30 days vs previous 30 days
            var now = VietnamTime.Now;
            var curFrom = now.AddDays(-30);
            var prevFrom = now.AddDays(-60);
            var prevTo = curFrom;

            var curRevenue = await _db.Payments
                .Where(p => p.PaymentStatus == PaymentStatus.Completed && (p.PaidAt ?? p.UpdatedAt ?? p.CreatedAt) >= curFrom && (p.PaidAt ?? p.UpdatedAt ?? p.CreatedAt) <= now)
                .SumAsync(p => (decimal?)p.Amount) ?? 0m;

            var prevRevenue = await _db.Payments
                .Where(p => p.PaymentStatus == PaymentStatus.Completed && (p.PaidAt ?? p.UpdatedAt ?? p.CreatedAt) >= prevFrom && (p.PaidAt ?? p.UpdatedAt ?? p.CreatedAt) < prevTo)
                .SumAsync(p => (decimal?)p.Amount) ?? 0m;

            double revenueGrowthPercent = 0;
            if (prevRevenue > 0)
                revenueGrowthPercent = (double)((curRevenue - prevRevenue) / prevRevenue * 100.0m);

            return new AdminOverviewDto
            {
                TotalRevenue = totalRevenue,
                TotalTicketsSold = totalTicketsSold,
                TotalOrders = totalOrders,
                TotalEvents = totalEvents,
                TotalCustomers = totalCustomers,
                TotalCheckinsToday = totalCheckinsToday,
                UnusedTickets = unusedTickets,
                FillRate = Math.Round(fillRate, 2),
                RevenueGrowthPercent = Math.Round(revenueGrowthPercent, 2)
            };
        }

        public async Task<IEnumerable<RevenuePointDto>> GetAdminRevenueAsync(string period, DateTime? from, DateTime? to)
        {
            var q = _db.Payments.Where(p => p.PaymentStatus == PaymentStatus.Completed);
            return await GetRevenueSeriesAsync(q, period, from, to);
        }

        public async Task<IEnumerable<TopEventDto>> GetAdminTopEventsAsync(int top = 10)
        {
            var events = await _db.Events
                .Include(e => e.Orders)
                .ThenInclude(o => o.Payments)
                .Include(e => e.Orders)
                .ThenInclude(o => o.Tickets)
                .ThenInclude(t => t.CheckInLogs)
                .ToListAsync();

            var result = events.Select(e =>
            {
                var ticketsSold = e.Orders.Where(o => o.OrderStatus != OrderStatus.Cancelled).Sum(o => o.Quantity);
                var revenue = e.Orders.SelectMany(o => o.Payments).Where(p => p.PaymentStatus == PaymentStatus.Completed).Sum(p => p.Amount);
                var totalPossible = e.MaxCapacity;
                var checkins = e.Orders.SelectMany(o => o.Tickets).SelectMany(t => t.CheckInLogs).Sum(c => c.PeopleCount);
                double checkinRate = totalPossible > 0 ? (double)checkins / totalPossible * 100.0 : 0.0;

                return new TopEventDto
                {
                    EventId = e.Id,
                    EventName = e.Name,
                    TicketsSold = ticketsSold,
                    Revenue = revenue,
                    CheckinRate = Math.Round(checkinRate, 2)
                };
            })
            .OrderByDescending(e => e.Revenue)
            .ThenByDescending(e => e.TicketsSold)
            .Take(top)
            .ToList();

            return result;
        }

        public async Task<PaymentStatsDto> GetAdminPaymentStatsAsync()
        {
            var q = _db.Payments.Where(p => p.PaymentStatus == PaymentStatus.Completed);
            var vn = await q.Where(p => p.PaymentMethod == PaymentMethod.VNPAY).ToListAsync();
            var qr = await q.Where(p => p.PaymentMethod == PaymentMethod.QRPayment).ToListAsync();
            var ct = await q.Where(p => p.PaymentMethod == PaymentMethod.Counter).ToListAsync();

            return new PaymentStatsDto
            {
                VnPayAmount = vn.Sum(p => p.Amount),
                VnPayCount = vn.Count,
                QrAmount = qr.Sum(p => p.Amount),
                QrCount = qr.Count,
                CounterAmount = ct.Sum(p => p.Amount),
                CounterCount = ct.Count
            };
        }

        public async Task<IEnumerable<RecentOrderDto>> GetAdminRecentOrdersAsync(int limit = 20)
        {
            var orders = await _db.Orders
                .Include(o => o.Payments)
                .OrderByDescending(o => o.CreatedAt)
                .Take(limit)
                .ToListAsync();

            return orders.Select(o => new RecentOrderDto
            {
                OrderId = o.Id,
                CreatedAt = o.CreatedAt,
                TotalPrice = o.TotalPrice,
                BuyerName = o.BuyerName ?? string.Empty,
                Quantity = o.Quantity,
                PaymentMethod = o.Payments.FirstOrDefault()?.PaymentMethod.ToString() ?? string.Empty,
                OrderStatus = o.OrderStatus.ToString()
            }).ToList();
        }

        // Director versions - filter by CreatedBy on Event
        public async Task<AdminOverviewDto> GetDirectorOverviewAsync(string userId)
        {
            var events = _db.Events.Where(e => e.CreatedBy == userId);

            var totalRevenue = await _db.Payments
                .Where(p => p.PaymentStatus == PaymentStatus.Completed && events.Any(e => e.Id == p.Order.EventId))
                .SumAsync(p => (decimal?)p.Amount) ?? 0m;

            var totalTicketsSold = await _db.Orders
                .Where(o => events.Any(e => e.Id == o.EventId) && o.OrderStatus != OrderStatus.Cancelled)
                .SumAsync(o => (int?)o.Quantity) ?? 0;

            var totalEvents = await events.CountAsync();
            var totalOrders = await _db.Orders.CountAsync(o => events.Any(e => e.Id == o.EventId));
            var totalCustomers = await _db.Orders.Where(o => events.Any(e => e.Id == o.EventId)).Select(o => o.UserId).Distinct().CountAsync();

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var totalCheckinsToday = await _db.CheckInLogs
                .Where(c => c.CheckinDate == today && _db.Tickets.Any(t => t.Id == c.TicketId && events.Any(e => e.Id == t.TicketTypeId)))
                .SumAsync(c => (int?)c.PeopleCount) ?? 0;

            var unusedTickets = await _db.Tickets
                .Where(t => t.RemainingSlots > 0 && events.Any(e => e.Id == t.TicketType.EventId))
                .SumAsync(t => (int?)t.RemainingSlots) ?? 0;

            var totalCapacity = await events.SumAsync(e => (int?)e.MaxCapacity) ?? 0;
            double fillRate = 0;
            if (totalCapacity > 0)
                fillRate = (double)totalTicketsSold / totalCapacity * 100.0;

            return new AdminOverviewDto
            {
                TotalRevenue = totalRevenue,
                TotalTicketsSold = totalTicketsSold,
                TotalOrders = totalOrders,
                TotalEvents = totalEvents,
                TotalCustomers = totalCustomers,
                TotalCheckinsToday = totalCheckinsToday,
                UnusedTickets = unusedTickets,
                FillRate = Math.Round(fillRate, 2),
                RevenueGrowthPercent = 0 // For brevity, keep 0; can reuse admin logic with date ranges
            };
        }

        public async Task<IEnumerable<RevenuePointDto>> GetDirectorRevenueAsync(string userId, string period, DateTime? from, DateTime? to)
        {
            var events = _db.Events.Where(e => e.CreatedBy == userId);
            var q = _db.Payments.Where(p => p.PaymentStatus == PaymentStatus.Completed && events.Any(e => e.Id == p.Order.EventId));
            return await GetRevenueSeriesAsync(q, period, from, to);
        }

        public async Task<IEnumerable<TopEventDto>> GetDirectorTopEventsAsync(string userId, int top = 10)
        {
            var events = await _db.Events
                .Where(e => e.CreatedBy == userId)
                .Include(e => e.Orders)
                .ThenInclude(o => o.Payments)
                .Include(e => e.Orders)
                .ThenInclude(o => o.Tickets)
                .ThenInclude(t => t.CheckInLogs)
                .ToListAsync();

            var result = events.Select(e =>
            {
                var ticketsSold = e.Orders.Where(o => o.OrderStatus != OrderStatus.Cancelled).Sum(o => o.Quantity);
                var revenue = e.Orders.SelectMany(o => o.Payments).Where(p => p.PaymentStatus == PaymentStatus.Completed).Sum(p => p.Amount);
                var totalPossible = e.MaxCapacity;
                var checkins = e.Orders.SelectMany(o => o.Tickets).SelectMany(t => t.CheckInLogs).Sum(c => c.PeopleCount);
                double checkinRate = totalPossible > 0 ? (double)checkins / totalPossible * 100.0 : 0.0;

                return new TopEventDto
                {
                    EventId = e.Id,
                    EventName = e.Name,
                    TicketsSold = ticketsSold,
                    Revenue = revenue,
                    CheckinRate = Math.Round(checkinRate, 2)
                };
            })
            .OrderByDescending(e => e.Revenue)
            .ThenByDescending(e => e.TicketsSold)
            .Take(top)
            .ToList();

            return result;
        }

        public async Task<ExportReportDataDto> GetEventReportDataAsync(Guid eventId, string? userId = null)
        {
            var eventEntity = await _db.Events
                .Include(e => e.Orders)
                .ThenInclude(o => o.Payments)
                .Include(e => e.Orders)
                .ThenInclude(o => o.User)
                .Include(e => e.Orders)
                .ThenInclude(o => o.Tickets)
                .ThenInclude(t => t.TicketType)
                .Include(e => e.Orders)
                .ThenInclude(o => o.Tickets)
                .ThenInclude(t => t.CheckInLogs)
                .FirstOrDefaultAsync(e => e.Id == eventId);

            if (eventEntity == null)
                throw new Exception("Sự kiện không tồn tại");

            // Permission check: Admins and Directors can export any event
            // No need to check CreatedBy - authenticated Director/Admin users can export any event
            if (!string.IsNullOrEmpty(userId) && !Guid.TryParse(userId, out _))
                throw new Exception("User ID không hợp lệ");

            var lines = new List<ExportReportLineDto>();
            int stt = 1;

            foreach (var order in eventEntity.Orders.Where(o => o.OrderStatus != OrderStatus.Cancelled))
            {
                var payment = order.Payments.FirstOrDefault();
                var paymentStatus = payment?.PaymentStatus.ToString() ?? "Chưa thanh toán";

                foreach (var ticket in order.Tickets)
                {
                    var checkinLog = ticket.CheckInLogs.FirstOrDefault();
                    var checkinTime = checkinLog?.CheckedAt.ToString("dd/MM/yyyy HH:mm:ss") ?? "";

                    lines.Add(new ExportReportLineDto
                    {
                        STT = stt++,
                        CustomerName = order.BuyerName ?? order.User?.FullName ?? "Không rõ",
                        TicketType = ticket.TicketType?.Name ?? "Không xác định",
                        TicketPrice = ticket.TicketType?.Price ?? 0,
                        PaymentStatus = GetPaymentStatusDisplay(paymentStatus),
                        CheckinTime = checkinTime
                    });
                }
            }

            return new ExportReportDataDto
            {
                ReportName = $"Báo cáo chi tiết - {eventEntity.Name}",
                EventName = eventEntity.Name,
                ExportDate = DateTime.UtcNow,
                Lines = lines
            };
        }

        public async Task<ExportSummaryReportDataDto> GetDirectorSummaryReportDataAsync(string userId)
        {
            var events = await _db.Events
                .Where(e => e.CreatedBy == userId)
                .Include(e => e.Orders)
                .ThenInclude(o => o.Payments)
                .Include(e => e.Orders)
                .ThenInclude(o => o.Tickets)
                .ThenInclude(t => t.CheckInLogs)
                .ToListAsync();

            var lines = new List<EventSummaryLineDto>();
            int stt = 1;

            foreach (var eventEntity in events.OrderByDescending(e => e.CreatedAt))
            {
                var orders = eventEntity.Orders.Where(o => o.OrderStatus != OrderStatus.Cancelled).ToList();
                var totalOrders = orders.Count;
                var totalTickets = orders.Sum(o => o.Quantity);
                var totalRevenue = orders.SelectMany(o => o.Payments)
                    .Where(p => p.PaymentStatus == PaymentStatus.Completed)
                    .Sum(p => p.Amount);
                var completedPayments = orders.SelectMany(o => o.Payments)
                    .Count(p => p.PaymentStatus == PaymentStatus.Completed);
                var pendingPayments = orders.SelectMany(o => o.Payments)
                    .Count(p => p.PaymentStatus == PaymentStatus.Pending);

                lines.Add(new EventSummaryLineDto
                {
                    STT = stt++,
                    EventName = eventEntity.Name,
                    TotalOrders = totalOrders,
                    TotalTickets = totalTickets,
                    TotalRevenue = totalRevenue,
                    CompletedPayments = completedPayments,
                    PendingPayments = pendingPayments
                });
            }

            return new ExportSummaryReportDataDto
            {
                ReportName = "Báo cáo tổng hợp doanh thu - Giám đốc",
                ExportDate = DateTime.UtcNow,
                Lines = lines
            };
        }

        public async Task<ExportSummaryReportDataDto> GetAdminSummaryReportDataAsync()
        {
            var events = await _db.Events
                .Include(e => e.Orders)
                .ThenInclude(o => o.Payments)
                .Include(e => e.Orders)
                .ThenInclude(o => o.Tickets)
                .ThenInclude(t => t.CheckInLogs)
                .ToListAsync();

            var lines = new List<EventSummaryLineDto>();
            int stt = 1;

            foreach (var eventEntity in events.OrderByDescending(e => e.CreatedAt))
            {
                var orders = eventEntity.Orders.Where(o => o.OrderStatus != OrderStatus.Cancelled).ToList();
                var totalOrders = orders.Count;
                var totalTickets = orders.Sum(o => o.Quantity);
                var totalRevenue = orders.SelectMany(o => o.Payments)
                    .Where(p => p.PaymentStatus == PaymentStatus.Completed)
                    .Sum(p => p.Amount);
                var completedPayments = orders.SelectMany(o => o.Payments)
                    .Count(p => p.PaymentStatus == PaymentStatus.Completed);
                var pendingPayments = orders.SelectMany(o => o.Payments)
                    .Count(p => p.PaymentStatus == PaymentStatus.Pending);

                lines.Add(new EventSummaryLineDto
                {
                    STT = stt++,
                    EventName = eventEntity.Name,
                    TotalOrders = totalOrders,
                    TotalTickets = totalTickets,
                    TotalRevenue = totalRevenue,
                    CompletedPayments = completedPayments,
                    PendingPayments = pendingPayments
                });
            }

            return new ExportSummaryReportDataDto
            {
                ReportName = "Báo cáo tổng hợp doanh thu - Admin",
                ExportDate = DateTime.UtcNow,
                Lines = lines
            };
        }

        private string GetPaymentStatusDisplay(string status)
        {
            return status switch
            {
                "Completed" => "Đã thanh toán",
                "Pending" => "Chưa thanh toán",
                "Failed" => "Thanh toán thất bại",
                "Cancelled" => "Đã hủy",
                _ => "Chưa thanh toán"
            };
        }
    }
}
