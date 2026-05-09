using TicketSystem.Application.Interfaces;
using TicketSystem.Application.DTOs; 
using TicketSystem.Application.Events; 
using TicketSystem.Domain.Common;
using TicketSystem.Domain.Entities; 
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using OtpNet;
using MediatR;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace TicketSystem.Application.Services
{
    public class TicketCheckInService : ITicketCheckInService
    {
        private readonly IApplicationDbContext _context;
        private readonly IMediator _mediator;
        private readonly IMemoryCache _cache; 
        
        public TicketCheckInService(IApplicationDbContext context, IMediator mediator, IMemoryCache cache)
        {
            _context = context;
            _mediator = mediator;
            _cache = cache;
        }

        public async Task<CheckInResponse> ManualCheckInAsync(Guid ticketId, int peopleCount, string staffId, string reason)
        {
            var ticket = await _context.Tickets
                .FirstOrDefaultAsync(t => t.Id == ticketId);

            if (ticket == null || ticket.Status != TicketStatus.ACTIVE)
                return new CheckInResponse { IsSuccess = false, Message = "Vé không tồn tại hoặc đã sử dụng hết." };

            var now = DateTime.Now;
            
            // DÙNG REMAINING SLOTS THAY VÌ SUM LOG
            if (ticket.RemainingSlots < peopleCount)
                return new CheckInResponse { IsSuccess = false, Message = $"Vượt quá giới hạn. Đoàn chỉ còn lại {ticket.RemainingSlots} chỗ trống." };

            ticket.RemainingSlots -= peopleCount;

            if (ticket.RemainingSlots == 0)
                ticket.Status = TicketStatus.CHECKED_IN;

            var log = new CheckInLog
            {
                Id = Guid.NewGuid(),
                TicketId = ticket.Id,
                CheckedAt = now,
                CheckinDate = DateOnly.FromDateTime(now),
                Type = ScanType.Entry, 
                PeopleCount = peopleCount,
                GateName = "Quầy Hỗ Trợ (Help Desk)",
                StaffId = staffId,
                Note = reason 
            };

            await _context.CheckInLogs.AddAsync(log);

            try
            {
                // BẮT LỖI OCC
                await _context.SaveChangesAsync(default);
            }
            catch (DbUpdateConcurrencyException)
            {
                return new CheckInResponse { IsSuccess = false, Message = "Vé này vừa được thao tác bởi một nhân viên khác. Vui lòng kiểm tra lại số lượng." };
            }
            
            return CheckInResponse.Success("Thành công", $"Đã check-in thủ công {peopleCount} người.");
        }

        public async Task<CheckInResponse> ProcessScanAsync(CheckInRequest request, string staffId)
        {
            var parts = request.QrPayload.Split('|');
            if (parts.Length != 2 || !Guid.TryParse(parts[0], out Guid ticketId))
            {
                return new CheckInResponse { IsSuccess = false, Message = "Định dạng QR không hợp lệ." };
            }

            // IDEMPOTENCY (TÍNH LŨY ĐẲNG - CHỐNG DOUBLE SCAN)
            string lockKey = $"checkin_lock_{ticketId}";
            if (_cache.TryGetValue(lockKey, out _))
            {
                return new CheckInResponse { IsSuccess = false, Message = "Hệ thống đang xử lý vé này, vui lòng chờ 3 giây để tránh quét trùng." };
            }
            _cache.Set(lockKey, true, TimeSpan.FromSeconds(3)); // Khóa vé trong 3 giây

            try
            {
                string clientOtp = parts[1];

                var ticket = await _context.Tickets
                    .Include(t => t.TicketType)
                    .Include(t => t.Order)
                        .ThenInclude(o => o.User)
                    .FirstOrDefaultAsync(t => t.Id == ticketId);

                if (ticket == null || ticket.Status != TicketStatus.ACTIVE)
                    return new CheckInResponse { IsSuccess = false, Message = "Vé không tồn tại hoặc đã hết chỗ." };

                // 1. Xác thực TOTP (Dynamic QR)
                var totp = new Totp(Base32Encoding.ToBytes(ticket.SecretKey));
                var window = new VerificationWindow(previous: 1, future: 1);
                if (!totp.VerifyTotp(clientOtp, out long timeStepMatched, window))
                {
                    return new CheckInResponse { IsSuccess = false, Message = "Mã QR đã hết hạn. Vui lòng làm mới mã trên ứng dụng." };
                }

                // 2. KIỂM TRA THỜI GIAN HIỆU LỰC
                var now = DateTime.Now; 
                if (now < ticket.ValidFrom || now > ticket.ValidTo)
                {
                    return new CheckInResponse { IsSuccess = false, Message = $"Vé ngoài giờ hiệu lực (từ {ticket.ValidFrom:dd/MM HH:mm} đến {ticket.ValidTo:dd/MM HH:mm})." };
                }

                // 3. Xử lý Cơ chế 3 (In thẻ B2B)
                bool triggerPrint = false;
                if (ticket.TicketType != null && ticket.TicketType.Name.Contains("B2B")) 
                {
                    if (ticket.IsBadgePrinted)
                        return new CheckInResponse { IsSuccess = false, Message = "Mã QR này đã được in thẻ tham quan." };
                    
                    ticket.IsBadgePrinted = true;
                    triggerPrint = true; 
                }

                // 4. KIỂM TRA SỐ LƯỢNG (VÀO MỘT PHẦN)
                if (request.PeopleCount <= 0)
                    return new CheckInResponse { IsSuccess = false, Message = "Số lượng người vào cổng không hợp lệ." };

                if (ticket.RemainingSlots < request.PeopleCount)
                {
                    return new CheckInResponse { IsSuccess = false, Message = $"Vượt quá giới hạn của đoàn. Chỉ còn lại {ticket.RemainingSlots} chỗ trống." };
                }

                // Trừ đi số vé sử dụng
                ticket.RemainingSlots -= request.PeopleCount;

                // Cập nhật trạng thái nếu dùng hết vé (Giả định AccessType dùng string hoặc config tùy em, tạm bỏ check AccessType rườm rà)
                if (ticket.RemainingSlots == 0)
                {
                    ticket.Status = TicketStatus.CHECKED_IN;
                }

                // 5. Ghi log
                var log = new CheckInLog
                {
                    Id = Guid.NewGuid(),
                    TicketId = ticket.Id,
                    CheckedAt = now,
                    CheckinDate = DateOnly.FromDateTime(now),
                    Type = triggerPrint ? ScanType.Print : ScanType.Entry,
                    PeopleCount = request.PeopleCount,
                    GateName = request.GateName,
                    StaffId = staffId,
                    CreatedAt = now,
                    CreatedBy = staffId
                };

                await _context.CheckInLogs.AddAsync(log);
                
                try
                {
                    // LƯU DB VÀ BẮT LỖI OCC
                    await _context.SaveChangesAsync(default);
                }
                catch (DbUpdateConcurrencyException)
                {
                    return new CheckInResponse { IsSuccess = false, Message = "Vé này vừa được quét tại một cổng khác cùng lúc. Vui lòng thử lại." };
                }

                if (ticket.TicketType != null)
                {
                    await _mediator.Publish(new TicketCheckedInEvent(
                        ticket.TicketType.EventId, 
                        request.PeopleCount, 
                        triggerPrint ? ScanType.Print : ScanType.Entry
                    ));
                }

                return CheckInResponse.Success(
                    ticket.Order?.User?.FullName ?? "Khách", 
                    $"Đã check-in {request.PeopleCount} vé. (Đoàn còn lại {ticket.RemainingSlots} chỗ)"
                );
            }
            catch (Exception ex)
            {
                return new CheckInResponse { IsSuccess = false, Message = "Lỗi hệ thống: " + ex.Message };
            }
            finally 
            {
                _cache.Remove(lockKey);
            }
        }
    }
}