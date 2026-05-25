using Microsoft.AspNetCore.SignalR;
using System;
using System.Threading.Tasks;
using TicketSystem.Application.Common;

namespace TicketSystem.API.Hubs
{
    public class GateHub : Hub
    {
        // 1. Dành cho Admin: Tham gia nhóm "Admins" để nghe báo cáo xác nhận
        public async Task JoinAdminGroup()
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, "Admins");
        }

        // 2. Dành cho Nhân viên: Tham gia cổng
        public async Task JoinGateGroup(string gateName)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, gateName);
        }

        // 3. Dành cho Nhân viên: Rời cổng cũ khi chọn cổng khác trong Dropdown
        public async Task LeaveGateGroup(string gateName)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, gateName);
        }

        // 4. Dành cho Nhân viên: Xác nhận đã đọc lệnh
        public async Task ConfirmAlert(string gateName, string staffName)
        {
            var time = VietnamTime.Now.ToString("HH:mm:ss");
            // Bắn thông báo ngược lại cho nhóm "Admins"
            await Clients.Group("Admins").SendAsync("ReceiveConfirmation", gateName, staffName, time);
        }
    }
}