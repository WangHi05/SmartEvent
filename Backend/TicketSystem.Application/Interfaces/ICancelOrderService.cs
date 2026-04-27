using System;
using System.Threading.Tasks;
using TicketSystem.Application.DTOs;

namespace TicketSystem.Application.Interfaces
{
    /// <summary>
    /// Service để quản lý hủy đơn hàng và hoàn tiền
    /// </summary>
    public interface ICancelOrderService
    {
        /// <summary>
        /// Kiểm tra xem có thể hủy đơn hàng hay không
        /// </summary>
        Task<CancelValidationDto> ValidateCancelAsync(Guid orderId, Guid userId);

        /// <summary>
        /// Hủy đơn hàng và xử lý hoàn tiền
        /// </summary>
        Task<CancelOrderResponseDto> CancelOrderAsync(Guid orderId, Guid userId, string reason, string performedBy);

        /// <summary>
        /// Tính toán số tiền hoàn lại
        /// </summary>
        Task<CalculateRefundDto> CalculateRefundAsync(Guid orderId);

        /// <summary>
        /// Kiểm tra số lần hủy trong tháng hiện tại
        /// </summary>
        Task<int> GetUserCancelCountThisMonthAsync(Guid userId);
    }
}
