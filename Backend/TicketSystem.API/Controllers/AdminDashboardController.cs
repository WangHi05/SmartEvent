using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using System;
using System.IO;
using TicketSystem.Application.Interfaces;
using TicketSystem.Domain.Common;
using ClosedXML.Excel;
using TicketSystem.Application.Common;

namespace TicketSystem.API.Controllers
{
    [ApiController]
    [Route("api/dashboard/admin")]
    [Authorize(Roles = RoleNames.Admin)]
    public class AdminDashboardController : ControllerBase
    {
        private readonly IDashboardService _dashboardService;

        public AdminDashboardController(IDashboardService dashboardService)
        {
            _dashboardService = dashboardService;
        }

        [HttpGet("overview")]
        public async Task<IActionResult> GetOverview()
        {
            var dto = await _dashboardService.GetAdminOverviewAsync();
            return Ok(dto);
        }

        [HttpGet("revenue")]
        public async Task<IActionResult> GetRevenue([FromQuery] string period = "day", [FromQuery] string? from = null, [FromQuery] string? to = null)
        {
            DateTime? f = null, t = null;
            if (!string.IsNullOrEmpty(from) && DateTime.TryParse(from, out var fv)) f = fv;
            if (!string.IsNullOrEmpty(to) && DateTime.TryParse(to, out var tv)) t = tv;
            var res = await _dashboardService.GetAdminRevenueAsync(period, f, t);
            return Ok(res);
        }

        [HttpGet("top-events")]
        public async Task<IActionResult> GetTopEvents()
        {
            var res = await _dashboardService.GetAdminTopEventsAsync(10);
            return Ok(res);
        }

        [HttpGet("payment-stats")]
        public async Task<IActionResult> GetPaymentStats()
        {
            var res = await _dashboardService.GetAdminPaymentStatsAsync();
            return Ok(res);
        }

        [HttpGet("recent-orders")]
        public async Task<IActionResult> GetRecentOrders()
        {
            var res = await _dashboardService.GetAdminRecentOrdersAsync(20);
            return Ok(res);
        }

        [HttpGet("export-event-report")]
        public async Task<IActionResult> ExportEventReport([FromQuery] Guid eventId)
        {
            try
            {
                // Admin can export any event
                var reportData = await _dashboardService.GetEventReportDataAsync(eventId);
                var stream = GenerateExcelFile(reportData);

                var fileName = $"BC_{reportData.EventName.Replace(" ", "_")}_{VietnamTime.Now:yyyyMMdd_HHmmss}.xlsx";
                return File(stream, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("export-summary-report")]
        public async Task<IActionResult> ExportSummaryReport()
        {
            try
            {
                var reportData = await _dashboardService.GetAdminSummaryReportDataAsync();
                var stream = GenerateExcelFileSummary(reportData);

                var fileName = $"BC_Tong_Hop_Doanh_Thu_{VietnamTime.Now:yyyyMMdd_HHmmss}.xlsx";
                return File(stream, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        private MemoryStream GenerateExcelFile(dynamic reportData)
        {
            using (var workbook = new XLWorkbook())
            {
                var worksheet = workbook.Worksheets.Add("Báo cáo");

                // Header section
                worksheet.Cell("A1").Value = "SMARTEVENT";
                worksheet.Cell("A1").Style.Font.Bold = true;
                worksheet.Cell("A1").Style.Font.FontSize = 14;

                worksheet.Cell("A2").Value = reportData.ReportName;
                worksheet.Cell("A2").Style.Font.Bold = true;
                worksheet.Cell("A2").Style.Font.FontSize = 12;

                worksheet.Cell("A3").Value = $"Ngày xuất: {reportData.ExportDate:dd/MM/yyyy HH:mm:ss}";
                worksheet.Cell("A3").Style.Font.FontSize = 10;

                // Data section
                var headerRow = 5;
                worksheet.Cell(headerRow, 1).Value = "STT";
                worksheet.Cell(headerRow, 2).Value = "Tên khách hàng";
                worksheet.Cell(headerRow, 3).Value = "Loại vé";
                worksheet.Cell(headerRow, 4).Value = "Giá vé";
                worksheet.Cell(headerRow, 5).Value = "Trạng thái thanh toán";
                worksheet.Cell(headerRow, 6).Value = "Thời gian Check-in";

                // Format header
                for (int col = 1; col <= 6; col++)
                {
                    worksheet.Cell(headerRow, col).Style.Font.Bold = true;
                    worksheet.Cell(headerRow, col).Style.Fill.BackgroundColor = XLColor.LightGray;
                }

                // Data rows
                int dataRow = headerRow + 1;
                foreach (var line in reportData.Lines)
                {
                    worksheet.Cell(dataRow, 1).Value = line.STT;
                    worksheet.Cell(dataRow, 2).Value = line.CustomerName;
                    worksheet.Cell(dataRow, 3).Value = line.TicketType;
                    worksheet.Cell(dataRow, 4).Value = line.TicketPrice;
                    worksheet.Cell(dataRow, 4).Style.NumberFormat.Format = "#,##0";
                    worksheet.Cell(dataRow, 5).Value = line.PaymentStatus;
                    worksheet.Cell(dataRow, 6).Value = line.CheckinTime ?? "";
                    dataRow++;
                }

                // Set column widths
                worksheet.Column(1).Width = 5;
                worksheet.Column(2).Width = 20;
                worksheet.Column(3).Width = 15;
                worksheet.Column(4).Width = 12;
                worksheet.Column(5).Width = 20;
                worksheet.Column(6).Width = 20;

                var stream = new MemoryStream();
                workbook.SaveAs(stream);
                stream.Position = 0;
                return stream;
            }
        }

        private MemoryStream GenerateExcelFileSummary(dynamic reportData)
        {
            using (var workbook = new XLWorkbook())
            {
                var worksheet = workbook.Worksheets.Add("Báo cáo");

                // Header section
                worksheet.Cell("A1").Value = "SMARTEVENT";
                worksheet.Cell("A1").Style.Font.Bold = true;
                worksheet.Cell("A1").Style.Font.FontSize = 14;

                worksheet.Cell("A2").Value = reportData.ReportName;
                worksheet.Cell("A2").Style.Font.Bold = true;
                worksheet.Cell("A2").Style.Font.FontSize = 12;

                worksheet.Cell("A3").Value = $"Ngày xuất: {reportData.ExportDate:dd/MM/yyyy HH:mm:ss}";
                worksheet.Cell("A3").Style.Font.FontSize = 10;

                // Data section
                var headerRow = 5;
                worksheet.Cell(headerRow, 1).Value = "STT";
                worksheet.Cell(headerRow, 2).Value = "Tên sự kiện";
                worksheet.Cell(headerRow, 3).Value = "Tổng đơn hàng";
                worksheet.Cell(headerRow, 4).Value = "Tổng vé";
                worksheet.Cell(headerRow, 5).Value = "Doanh thu";
                worksheet.Cell(headerRow, 6).Value = "Thanh toán hoàn tất";
                worksheet.Cell(headerRow, 7).Value = "Thanh toán chờ xử lý";

                // Format header
                for (int col = 1; col <= 7; col++)
                {
                    worksheet.Cell(headerRow, col).Style.Font.Bold = true;
                    worksheet.Cell(headerRow, col).Style.Fill.BackgroundColor = XLColor.LightGray;
                }

                // Data rows
                int dataRow = headerRow + 1;
                foreach (var line in reportData.Lines)
                {
                    worksheet.Cell(dataRow, 1).Value = line.STT;
                    worksheet.Cell(dataRow, 2).Value = line.EventName;
                    worksheet.Cell(dataRow, 3).Value = line.TotalOrders;
                    worksheet.Cell(dataRow, 4).Value = line.TotalTickets;
                    worksheet.Cell(dataRow, 5).Value = line.TotalRevenue;
                    worksheet.Cell(dataRow, 5).Style.NumberFormat.Format = "#,##0";
                    worksheet.Cell(dataRow, 6).Value = line.CompletedPayments;
                    worksheet.Cell(dataRow, 7).Value = line.PendingPayments;
                    dataRow++;
                }

                // Set column widths
                worksheet.Column(1).Width = 5;
                worksheet.Column(2).Width = 25;
                worksheet.Column(3).Width = 15;
                worksheet.Column(4).Width = 10;
                worksheet.Column(5).Width = 15;
                worksheet.Column(6).Width = 18;
                worksheet.Column(7).Width = 18;

                var stream = new MemoryStream();
                workbook.SaveAs(stream);
                stream.Position = 0;
                return stream;
            }
        }
    }
}
