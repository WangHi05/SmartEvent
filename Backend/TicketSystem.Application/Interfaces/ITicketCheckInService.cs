using TicketSystem.Application.DTOs;

namespace TicketSystem.Application.Interfaces
{
    public interface ITicketCheckInService
    {
        // Trả về kết quả Check-in bao gồm thông báo thành công hoặc lỗi cụ thể
        Task<CheckInResponse> CheckInAsync(Guid ticketId);
    }
}