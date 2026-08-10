using Microsoft.EntityFrameworkCore;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Interfaces;
using TicketSystem.Domain.Entities;
using TicketSystem.Domain.Common; 
using TicketSystem.Application.Common;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace TicketSystem.Application.Services
{
    public interface IHelpDeskService
    {
        Task<List<HelpDeskTicketResponseDto>> SearchTicketsAsync(string keyword);
        Task<HelpDeskTicketResponseDto> RevokeAndReissueAsync(Guid oldTicketId, RevokeAndReissueRequestDto request);
        Task<bool> ManualCheckInAsync(Guid ticketId, string reason, string actionBy);
    }

    public class HelpDeskService : IHelpDeskService
    {
        private readonly IApplicationDbContext _context;
        private readonly MediatR.IMediator _mediator;

        public HelpDeskService(IApplicationDbContext context, MediatR.IMediator mediator)
        {
            _context = context;
            _mediator = mediator;
        }

        public async Task<List<HelpDeskTicketResponseDto>> SearchTicketsAsync(string keyword)
        {
            if (string.IsNullOrWhiteSpace(keyword)) return new List<HelpDeskTicketResponseDto>();

            keyword = keyword.ToLower().Trim();

            var query = _context.Tickets
                .Include(t => t.Order)
                .ThenInclude(o => o.Event) 
                .Include(t => t.TicketType)
                .Where(t => 
                    (t.Order != null && t.Order.BuyerCccd != null && t.Order.BuyerCccd.Contains(keyword)) ||
                    (t.Order != null && t.Order.BuyerPhone != null && t.Order.BuyerPhone.Contains(keyword)) ||
                    (t.Order != null && t.Order.BuyerName != null && t.Order.BuyerName.ToLower().Contains(keyword)) ||
                    t.SecretKey.ToLower().Contains(keyword)
                )
                .OrderByDescending(t => t.CreatedAt);

            var tickets = await query.ToListAsync();

            return tickets.Select(t => new HelpDeskTicketResponseDto
            {
                TicketId = t.Id,
                SecretKey = t.SecretKey,
                TicketStatus = t.Status.ToString(),
                BuyerName = t.Order?.BuyerName ?? "Không rõ",
                BuyerPhone = t.Order?.BuyerPhone ?? string.Empty,
                BuyerCccd = t.Order?.BuyerCccd,
                EventId = t.Order?.EventId ?? Guid.Empty,
                EventName = t.Order?.Event?.Name ?? "Không rõ",
                TicketTypeName = t.TicketType?.Name ?? "Không rõ"
            }).ToList();
        }

        public async Task<HelpDeskTicketResponseDto> RevokeAndReissueAsync(Guid oldTicketId, RevokeAndReissueRequestDto request)
        {
                var oldTicket = await _context.Tickets
                    .Include(t => t.Order)
                    .ThenInclude(o => o.Event)
                    .Include(t => t.TicketType)
                    .FirstOrDefaultAsync(t => t.Id == oldTicketId);

                if (oldTicket == null) throw new Exception("Không tìm thấy vé.");
    
                if (oldTicket.Status == TicketStatus.REVOKED) throw new Exception("Vé này đã bị thu hồi trước đó.");

                // Bước 1: Thu hồi
                oldTicket.Status = TicketStatus.REVOKED;
                oldTicket.UpdatedAt = DateTime.UtcNow;
                oldTicket.UpdatedBy = request.ActionBy;

                // Bước 2: Cấp mã mới
                var newTicketId = Guid.NewGuid();
                var newTicket = new Ticket
                {
                    Id = newTicketId,
                    TicketTypeId = oldTicket.TicketTypeId,
                    OrderId = oldTicket.OrderId,
                    ValidFrom = oldTicket.ValidFrom,
                    ValidTo = oldTicket.ValidTo,
                    SecretKey = TicketSystem.Application.Utils.Base32Generator.Generate(16), 
                    
                    Status = TicketStatus.ACTIVE,
                    
                    GroupSize = oldTicket.GroupSize,
                    RemainingSlots = oldTicket.RemainingSlots,
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = request.ActionBy
                };
                
                _context.Tickets.Add(newTicket);

                // Ghi Audit Log
                _context.AuditLogs.Add(new AuditLog
                {
                    Id = Guid.NewGuid(),
                    Action = "Cancel", 
                    EntityType = "Ticket",
                    EntityId = oldTicketId,
                    PerformedBy = request.ActionBy,
                    Timestamp = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = request.ActionBy,
                    Details = $"HelpDesk: Thu hồi vé. Lý do: {request.Reason}. Vé mới cấp: {newTicketId}"
                });

                await _context.SaveChangesAsync();

                return new HelpDeskTicketResponseDto
                {
                    TicketId = newTicket.Id,
                    SecretKey = newTicket.SecretKey,
                    TicketStatus = newTicket.Status.ToString(),
                    
                    BuyerName = oldTicket.Order?.BuyerName ?? string.Empty,
                    BuyerPhone = oldTicket.Order?.BuyerPhone ?? string.Empty,
                    BuyerCccd = oldTicket.Order?.BuyerCccd,
                    EventName = oldTicket.Order?.Event?.Name ?? string.Empty,
                    TicketTypeName = oldTicket.TicketType?.Name ?? string.Empty
                };
        }

        public async Task<bool> ManualCheckInAsync(Guid ticketId, string reason, string actionBy)
        {
            var ticket = await _context.Tickets
                .Include(t => t.TicketType)
                .FirstOrDefaultAsync(t => t.Id == ticketId);
            
            if (ticket == null) throw new Exception("Không tìm thấy vé.");

            if (ticket.TicketType?.AccessType == TicketAccessType.DAILY_MULTI)
            {
                var today = VietnamTime.Today;
                if (ticket.LastCheckInDate == null || ticket.LastCheckInDate.Value < today)
                {
                    ticket.RemainingSlots = ticket.GroupSize;
                    ticket.Status = TicketStatus.ACTIVE;
                    ticket.IsCheckedIn = false;
                }
            }
            
            if (ticket.Status != TicketStatus.ACTIVE) throw new Exception("Vé không ở trạng thái hoạt động.");

            var now = VietnamTime.Now;

            if (now < VietnamTime.ToVietnamTime(ticket.ValidFrom))
                throw new Exception("Sự kiện chưa bắt đầu, chưa thể check-in.");

            if (now > VietnamTime.ToVietnamTime(ticket.ValidTo))
                throw new Exception("Sự kiện đã kết thúc, không thể check-in.");

            if (ticket.RemainingSlots <= 0)
                throw new Exception("Vé đã được sử dụng hết, không thể check-in thêm.");

            const int peopleCount = 1;
            ticket.RemainingSlots -= peopleCount;
            ticket.LastCheckInDate = VietnamTime.Today;

            if (ticket.RemainingSlots == 0)
            {
                ticket.Status = TicketStatus.CHECKED_IN;
                ticket.IsCheckedIn = true;
            }

            ticket.UpdatedAt = DateTime.UtcNow;
            ticket.UpdatedBy = actionBy;

            var eventId = ticket.TicketType?.EventId ?? Guid.Empty;

            // THÊM MỚI: Ghi CheckInLog cho lượt check-in thủ công này.
            // Thiếu bước này khiến trang Kiểm soát cổng (group theo CheckInLogs.GateName)
            // không bao giờ thấy được số liệu check-in từ Help Desk.
            _context.CheckInLogs.Add(new CheckInLog
            {
                Id = Guid.NewGuid(),
                TicketId = ticket.Id,
                EventId = eventId,
                CheckedAt = now,
                CheckinDate = DateOnly.FromDateTime(now),
                Type = ScanType.Entry,
                PeopleCount = peopleCount,
                GateName = "Quầy Hỗ Trợ (Help Desk)",
                StaffId = actionBy,
                Note = reason,
                CheckInResult = "Success",
                FailureReason = null,
                QRCodeData = null,
                CreatedAt = now,
                CreatedBy = actionBy
            });

            _context.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                Action = "CheckIn", 
                EntityType = "Ticket",
                EntityId = ticketId,
                PerformedBy = actionBy,
                Timestamp = now,
                CreatedAt = now,
                CreatedBy = actionBy,
                Details = $"HelpDesk: Check-in thủ công. Lý do: {reason}"
            });

            await _context.SaveChangesAsync();

            if (ticket.TicketType != null)
            {
                await _mediator.Publish(new TicketSystem.Application.Events.TicketCheckedInEvent(
                    ticket.TicketType.EventId,
                    peopleCount,
                    ScanType.Entry
                ));
            }

            return true;
        }
    }
}