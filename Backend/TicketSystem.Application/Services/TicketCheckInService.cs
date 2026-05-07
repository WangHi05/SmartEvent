using TicketSystem.Application.Interfaces;
using TicketSystem.Application.DTOs; 
using TicketSystem.Application.Events; 
using TicketSystem.Domain.Common;
using TicketSystem.Domain.Entities; 
using Microsoft.EntityFrameworkCore;
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
        private const int ANTI_PASSBACK_MINUTES = 2; 

        public TicketCheckInService(IApplicationDbContext context, IMediator mediator)
        {
            _context = context;
            _mediator = mediator;
        }

        public async Task<CheckInResponse> ManualCheckInAsync(Guid ticketId, int peopleCount, string staffId, string reason)
        {
            // API này chỉ dành cho Role Admin/Quầy hỗ trợ (Bỏ qua bước quét mã TOTP)
            var ticket = await _context.Tickets
                .Include(t => t.TicketType)
                .Include(t => t.CheckInLogs)
                .FirstOrDefaultAsync(t => t.Id == ticketId);

            if (ticket == null || ticket.Status != TicketStatus.ACTIVE)
                return new CheckInResponse { IsSuccess = false, Message = "Vé không tồn tại hoặc không thể sử dụng." };

            var now = DateTime.Now;
            
            var totalEntered = ticket.CheckInLogs.Sum(l => l.PeopleCount);
            if (totalEntered + peopleCount > ticket.GroupSize)
                return new CheckInResponse { IsSuccess = false, Message = $"Vượt quá giới hạn. Chỉ còn lại {ticket.GroupSize - totalEntered} lượt." };

            var log = new CheckInLog
            {
                TicketId = ticket.Id,
                CheckedAt = now,
                CheckinDate = DateOnly.FromDateTime(now),
                Type = ScanType.Entry, 
                PeopleCount = peopleCount,
                GateName = "Quầy Hỗ Trợ (Help Desk)",
                StaffId = staffId,
                Note = reason // Ghi chú: "Mất điện thoại", "Không có mạng"...
            };

            await _context.CheckInLogs.AddAsync(log);

            if (totalEntered + peopleCount >= ticket.GroupSize)
                ticket.Status = TicketStatus.CHECKED_IN;

            await _context.SaveChangesAsync(default);
            return CheckInResponse.Success("Thành công", $"Đã check-in thủ công {peopleCount} người.");
        }

        public async Task<CheckInResponse> ProcessScanAsync(CheckInRequest request, string staffId)
        {
            var parts = request.QrPayload.Split('|');
            if (parts.Length != 2 || !Guid.TryParse(parts[0], out Guid ticketId))
            {
                return new CheckInResponse { IsSuccess = false, Message = "Định dạng QR không hợp lệ." };
            }
            
            string clientOtp = parts[1];

            try
            {
                var ticket = await _context.Tickets
                    .Include(t => t.TicketType)
                    .Include(t => t.CheckInLogs)
                    .Include(t => t.Order)
                        .ThenInclude(o => o.User)
                    .FirstOrDefaultAsync(t => t.Id == ticketId);

                if (ticket == null || ticket.Status != TicketStatus.ACTIVE)
                    return new CheckInResponse { IsSuccess = false, Message = "Vé không tồn tại hoặc đã bị hủy." };

                // 1. Xác thực TOTP (Dynamic QR)
                var totp = new Totp(Base32Encoding.ToBytes(ticket.SecretKey));
                var window = new VerificationWindow(previous: 1, future: 1);
                bool isOtpValid = totp.VerifyTotp(clientOtp, out long timeStepMatched, window);
                
                if (!isOtpValid)
                {
                    return new CheckInResponse { IsSuccess = false, Message = "Mã QR đã hết hạn. Vui lòng làm mới mã trên ứng dụng." };
                }

                // 2. KIỂM TRA THỜI GIAN HIỆU LỰC (Chuẩn hóa)
                // Lỗi "Bất đồng bộ dữ liệu" (Data Inconsistency)
                // Khi Admin đổi ngày Event, nếu hệ thống không có Domain Event cập nhật lại Ticket.ValidFrom, vé cũ sẽ bị lỗi.
                // Ở đây ta dùng DateTime.Now để test tiện lợi theo Local Time của máy chủ.
                var now = DateTime.Now; 
                
                if (now < ticket.ValidFrom || now > ticket.ValidTo)
                {
                    string fromStr = ticket.ValidFrom.ToString("dd/MM/yyyy HH:mm");
                    string toStr = ticket.ValidTo.ToString("dd/MM/yyyy HH:mm");
                    
                    // Thông báo lỗi thân thiện, chuyên nghiệp cho người dùng
                    return new CheckInResponse 
                    { 
                        IsSuccess = false, 
                        Message = $"Vé chỉ có hiệu lực từ {fromStr} đến {toStr}. Vui lòng kiểm tra lại thông tin sự kiện." 
                    };
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

                // 4. Kiểm tra Anti-passback & Giới hạn
                var lastEntry = ticket.CheckInLogs.OrderByDescending(l => l.CheckedAt).FirstOrDefault();
                if (lastEntry != null && (now - lastEntry.CheckedAt).TotalMinutes < ANTI_PASSBACK_MINUTES)
                {
                    return new CheckInResponse { IsSuccess = false, Message = $"Quét quá nhanh. Vui lòng đợi {ANTI_PASSBACK_MINUTES} phút." };
                }

                var totalEnteredToday = ticket.CheckInLogs.Where(l => l.CheckedAt.Date == now.Date).Sum(l => l.PeopleCount);
                if (totalEnteredToday + request.PeopleCount > ticket.GroupSize)
                {
                    return new CheckInResponse { IsSuccess = false, Message = $"Vượt quá giới hạn của đoàn. Còn lại: {ticket.GroupSize - totalEnteredToday} lượt." };
                }

                // 5. Cập nhật và lưu DB
                var log = new CheckInLog
                {
                    TicketId = ticket.Id,
                    CheckedAt = now,
                    CheckinDate = DateOnly.FromDateTime(now),
                    Type = triggerPrint ? ScanType.Print : ScanType.Entry,
                    PeopleCount = request.PeopleCount,
                    GateName = request.GateName,
                    StaffId = staffId
                };

                await _context.CheckInLogs.AddAsync(log);
                
                if (totalEnteredToday + request.PeopleCount >= ticket.GroupSize && ticket.TicketType.AccessType == TicketAccessType.ONE_TIME)
                {
                    ticket.Status = TicketStatus.CHECKED_IN;
                }

                await _context.SaveChangesAsync(default);

                if (ticket.TicketType != null)
                {
                    await _mediator.Publish(new TicketCheckedInEvent(
                        ticket.TicketType.EventId, 
                        request.PeopleCount, 
                        triggerPrint ? ScanType.Print : ScanType.Entry
                    ));
                }

                return CheckInResponse.Success(ticket.Order?.User?.FullName ?? "Khách", ticket.TicketType?.Name ?? "Vé");
            }
            catch (Exception ex)
            {
                return new CheckInResponse { IsSuccess = false, Message = "Lỗi hệ thống: " + ex.Message };
            }
        }
    }
}