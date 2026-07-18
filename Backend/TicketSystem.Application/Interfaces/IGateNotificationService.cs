using System.Threading.Tasks;

namespace TicketSystem.Application.Interfaces
{
    /// <summary>
    // Cầu nối để AI gửi lệnh điều phối xuống cổng
    /// </summary>
    public interface IGateNotificationService
    {
        Task SendAlertAsync(string gateName, string message);
    }
}