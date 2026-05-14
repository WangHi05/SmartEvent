using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;
using TicketSystem.Application.Interfaces;
using TicketSystem.Domain.Common;
using TicketSystem.Domain.Entities;

namespace TicketSystem.Application.Services
{
    public class ClaimTicketRequestDto
    {
        public Guid TicketId { get; set; }
        public string ShareToken { get; set; } = string.Empty;
        // Có thể bổ sung GuestName, GuestPhone nếu muốn thu thập thêm data
    }

    public class ClaimTicketResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public string SecretKey { get; set; } = string.Empty;
        public string EventName { get; set; } = string.Empty;
    }

    public interface ITicketShareService
    {
        Task<string> GenerateShareLinkAsync(Guid ticketId, Guid ownerUserId);
        Task<ClaimTicketResponseDto> ClaimTicketAsync(ClaimTicketRequestDto request);
    }

    public class TicketShareService : ITicketShareService
    {
        private readonly IApplicationDbContext _context;

        public TicketShareService(IApplicationDbContext context)
        {
            _context = context;
        }

        // 1. Trưởng đoàn gọi hàm này để lấy Link chia sẻ
        public async Task<string> GenerateShareLinkAsync(Guid ticketId, Guid ownerUserId)
        {
            var ticket = await _context.Tickets
                .Include(t => t.Order)
                .FirstOrDefaultAsync(t => t.Id == ticketId);

            if (ticket == null) throw new Exception("Không tìm thấy vé.");
            if (ticket.Order?.UserId != ownerUserId) throw new Exception("Bạn không phải chủ sở hữu vé này.");
            if (ticket.Status != TicketStatus.ACTIVE) throw new Exception("Chỉ vé chưa sử dụng mới được chia sẻ.");
            
            // LƯU Ý: Em cần bổ sung 2 trường IsClaimed (bool) và ShareToken (string?) vào bảng Tickets trong DB
            if (ticket.IsClaimed) throw new Exception("Vé này đã được chuyển nhượng/xác nhận bởi người khác.");

            // Sinh mã Token dùng 1 lần (Có thể giới hạn thời gian sống nếu cần)
            ticket.ShareToken = Guid.NewGuid().ToString("N");
            ticket.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Trả về Token để Frontend tự ghép thành URL (Frontend url thường là biến môi trường)
            return ticket.ShareToken; 
        }

        // 2. Bạn bè (Guest) gọi hàm này khi bấm nút "Xác nhận nhận vé"
        public async Task<ClaimTicketResponseDto> ClaimTicketAsync(ClaimTicketRequestDto request)
        {
            var ticket = await _context.Tickets
                .Include(t => t.TicketType)
                .ThenInclude(tt => tt.Event)
                .FirstOrDefaultAsync(t => t.Id == request.TicketId);

            if (ticket == null) 
                return new ClaimTicketResponseDto { Success = false, Message = "Vé không tồn tại." };

            if (ticket.Status != TicketStatus.ACTIVE)
                return new ClaimTicketResponseDto { Success = false, Message = "Vé đã được sử dụng hoặc bị hủy." };

            // BẢO MẬT CỐT LÕI: Kiểm tra Token và Trạng thái Claim
            if (ticket.IsClaimed || string.IsNullOrEmpty(ticket.ShareToken) || ticket.ShareToken != request.ShareToken)
            {
                return new ClaimTicketResponseDto 
                { 
                    Success = false, 
                    Message = "Đường link chia sẻ không hợp lệ hoặc vé đã được người khác nhận trước đó." 
                };
            }

            // Đánh dấu vé đã được Claim, HỦY TOKEN (One-time use)
            ticket.IsClaimed = true;
            ticket.ShareToken = null; // Hủy token để không ai dùng lại được đường link này
            ticket.UpdatedAt = DateTime.UtcNow;

            // Ghi Audit Log cho hệ thống
            _context.AuditLogs.Add(new Domain.Entities.AuditLog
            {
                Id = Guid.NewGuid(),
                Action = "ClaimTicket",
                EntityType = "Ticket",
                EntityId = ticket.Id,
                PerformedBy = "Guest User", // Hoặc IP thiết bị
                Details = "Vé đã được khách mời xác nhận nhận thành công qua link chia sẻ."
            });

            await _context.SaveChangesAsync();

            return new ClaimTicketResponseDto
            {
                Success = true,
                Message = "Xác nhận nhận vé thành công!",
                SecretKey = ticket.SecretKey, // Chỉ trả về SecretKey khi đã Claim thành công
                EventName = ticket.TicketType?.Event?.Name ?? "Sự kiện"
            };
        }
    }
}