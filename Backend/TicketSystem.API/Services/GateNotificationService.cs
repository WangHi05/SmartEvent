using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using TicketSystem.API.Hubs;
using TicketSystem.Application.Interfaces;

namespace TicketSystem.API.Services
{
    // Class này nằm ở tầng API, thực thi Interface của tầng Application
    public class GateNotificationService : IGateNotificationService
    {
        private readonly IHubContext<GateHub> _hubContext;

        public GateNotificationService(IHubContext<GateHub> hubContext)
        {
            _hubContext = hubContext;
        }

        public async Task SendAlertAsync(string gateName, string message)
        {
            // Bắn thông báo xuống giao diện React của nhân viên trực cổng
            await _hubContext.Clients.Group(gateName).SendAsync("ReceiveGateAlert", message);
        }
    }
}