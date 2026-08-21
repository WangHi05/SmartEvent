using TicketSystem.Application.DTOs;

namespace TicketSystem.Application.Interfaces
{
    public interface ITicketCheckInService
    {
        // Trả về kết quả Check-in bao gồm thông báo thành công hoặc lỗi cụ thể
        Task<CheckInResponse> ProcessScanAsync(CheckInRequest request, string staffId);

        Task<CheckInResponse> ManualCheckInAsync(Guid ticketId, int peopleCount, string staffId, string reason);

        // MỚI: Hangfire job gọi mỗi phút để tự reset vé DAILY_MULTI sang ngày mới,
        // độc lập với việc có ai quét vé hay không.
        Task ResetDailyMultiTicketsAsync();
    }
}