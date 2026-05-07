using TicketSystem.Application.DTOs;

namespace TicketSystem.Application.Interfaces
{
    public interface ITicketCheckInService
    {
        // Trả về kết quả Check-in bao gồm thông báo thành công hoặc lỗi cụ thể
        Task<CheckInResponse> ProcessScanAsync(CheckInRequest request, string staffId);

        Task<CheckInResponse> ManualCheckInAsync(Guid ticketId, int peopleCount, string staffId, string reason);
    }
}