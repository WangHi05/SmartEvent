using MediatR;
using Microsoft.AspNetCore.SignalR;
using System.Threading;
using System.Threading.Tasks;
using TicketSystem.API.Hubs;
using TicketSystem.Application.Events;


namespace TicketSystem.API.Controllers
{
    // Class này tự động được chạy mỗi khi _mediator.Publish(new TicketCheckedInEvent) được gọi
    public class RealtimeTicketCheckedInHandler : INotificationHandler<TicketCheckedInEvent>
    {
        private readonly IHubContext<GateHub> _hubContext;

        // Tiêm SignalR Hub vào đây
        public RealtimeTicketCheckedInHandler(IHubContext<GateHub> hubContext)
        {
            _hubContext = hubContext;
        }

        public async Task Handle(TicketCheckedInEvent notification, CancellationToken cancellationToken)
        {
            // Bắn tín hiệu "RefreshGateData" tới tất cả người dùng trong nhóm "Admins"
            await _hubContext.Clients.Group("Admins").SendAsync("RefreshGateData", cancellationToken: cancellationToken);
        }
    }
}