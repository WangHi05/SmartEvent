using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using TicketSystem.Application.Interfaces;
using TicketSystem.Infrastructure.Data; // Chứa ApplicationDbContext

namespace TicketSystem.Infrastructure.Services
{
    /// <summary>
    /// Lớp thực thi tương tác trực tiếp với Database.
    /// Thuộc Layer: Infrastructure
    /// </summary>
    public class DatabaseManagementService : IDatabaseManagementService
    {
        // FIX LỖI DI: Đổi DbContext thành ApplicationDbContext
        private readonly ApplicationDbContext _context;
        private readonly ILogger<DatabaseManagementService> _logger;

        public DatabaseManagementService(ApplicationDbContext context, ILogger<DatabaseManagementService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task ClearAllMockDataAsync()
        {
            _logger.LogWarning("⚠️ BẮT ĐẦU XÓA TOÀN BỘ DỮ LIỆU TRONG CÁC BẢNG...");

            try
            {
                // Lệnh TRUNCATE ... CASCADE đặc thù của PostgreSQL (Neon)
                // Lưu ý bọc tên bảng trong dấu ngoặc kép "" để tránh lỗi phân biệt hoa/thường.
                var sql = @"
                    TRUNCATE TABLE 
                        ""AuditLogs"", 
                        ""CheckInLogs"", 
                        ""Tickets"", 
                        ""Payments"", 
                        ""OrderItems"", 
                        ""Orders"", 
                        ""TicketTypes"", 
                        ""Events"", 
                        ""Customers"" 
                    CASCADE;";

                await _context.Database.ExecuteSqlRawAsync(sql);
                
                _logger.LogInformation("✅ ĐÃ XÓA TRẮNG DỮ LIỆU THÀNH CÔNG.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ LỖI KHI TRUNCATE DATABASE.");
                throw; 
            }
        }
    }
}