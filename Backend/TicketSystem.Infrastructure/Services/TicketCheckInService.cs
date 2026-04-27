using TicketSystem.Application.Interfaces;
using TicketSystem.Application.DTOs; 
using TicketSystem.Domain.Common;
using TicketSystem.Domain.Entities; 
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;

namespace TicketSystem.Infrastructure.Services
{
    public class TicketCheckInService : ITicketCheckInService
    {
        private readonly IApplicationDbContext _context;

        public TicketCheckInService(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<CheckInResponse> CheckInAsync(Guid ticketId)
        {
            try 
            {
                var ticket = await _context.Tickets
                    .Include(t => t.TicketType)
                    .FirstOrDefaultAsync(t => t.Id == ticketId);

                if (ticket == null) return CheckInResponse.Fail("Vé không tồn tại trên hệ thống.");

                // 1. Kiểm tra trạng thái thanh toán
                if (ticket.Status != TicketStatus.ACTIVE)
                    return CheckInResponse.Fail($"Trạng thái vé không hợp lệ: {ticket.Status}");

                // 2. Kiểm tra xem đã check-in chưa
                if (ticket.Status == TicketStatus.CHECKED_IN)
                    return CheckInResponse.Fail("Vé này đã được sử dụng trước đó.");

                // 3. Kiểm tra hết hạn - Load Event từ context
                var eventEntity = ticket.TicketType != null 
                    ? await _context.Events.FirstOrDefaultAsync(e => e.Id == ticket.TicketType.EventId)
                    : null;
                
                if (eventEntity != null && DateTime.UtcNow > eventEntity.EndTime.ToUniversalTime())
                    return CheckInResponse.Fail("Sự kiện đã kết thúc, vé không còn hiệu lực.");

                // 4. Cập nhật trạng thái
                ticket.Status = TicketStatus.CHECKED_IN;
                ticket.UpdatedAt = DateTime.UtcNow;
                ticket.UpdatedBy = "System_Scanner";
                
                // Khởi tạo ĐẦY ĐỦ các trường bắt buộc của BaseEntity
                var log = new CheckInLog
                {
                    Id = Guid.NewGuid(),
                    TicketId = ticket.Id,
                    CheckedAt = DateTime.Now,
                    CheckinDate = DateOnly.FromDateTime(DateTime.Now),
                    GateName = "Cổng chính",
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = "System_Scanner" 
                };

                // Ép kiểu an toàn để Add trực tiếp vào DB, tránh lỗi Navigation collection
                if (_context is DbContext dbContext)
                {
                    dbContext.Set<CheckInLog>().Add(log);
                }
                else
                {
                    ticket.CheckInLogs.Add(log);
                }

                // 4.5 Cập nhật sức chứa sự kiện
                if (eventEntity != null)
                {
                    eventEntity.CurrentOccupancy += 1;
                    eventEntity.UpdatedAt = DateTime.UtcNow;
                }

                // 4.6 Cập nhật số vé còn lại - Load TicketType từ context để đảm bảo tracking
                if (ticket.TicketType != null)
                {
                    var ticketTypeFromContext = await _context.TicketTypes.FirstOrDefaultAsync(tt => tt.Id == ticket.TicketType.Id);
                    if (ticketTypeFromContext != null)
                    {
                        ticketTypeFromContext.RemainingQuantity -= 1;
                        ticketTypeFromContext.UpdatedAt = DateTime.UtcNow;
                    }
                }

                // 5. LƯU DỮ LIỆU & XỬ LÝ LỖI CONCURRENCY (XUNG ĐỘT)
                try
                {
                    await _context.SaveChangesAsync();
                }
                catch (DbUpdateConcurrencyException ex)
                {
                    // Giải pháp: Ép EF Core đồng bộ lại token từ DB thật và lưu đè
                    foreach (var entry in ex.Entries)
                    {
                        if (entry.Entity is Ticket)
                        {
                            var databaseValues = await entry.GetDatabaseValuesAsync();
                            if (databaseValues != null)
                            {
                                entry.OriginalValues.SetValues(databaseValues);
                            }
                        }
                    }
                    
                    // Thử lưu lại lần 2
                    await _context.SaveChangesAsync();
                }

                // 6. Trả dữ liệu
                string customerName = "Khách hàng " + ticket.Id.ToString().Substring(0, 4); 
                string ticketTypeName = ticket.TicketType?.Name ?? "Không xác định";

                return CheckInResponse.Success(customerName, ticketTypeName);
            }
            catch (Exception ex)
            {
                // In lỗi ra màn hình Terminal để dễ Debug
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"\n[LỖI CHECK-IN] {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"[CHI TIẾT LỖI DB] {ex.InnerException.Message}");
                }
                Console.ResetColor();
                
                throw; 
            }
        }
    }
}