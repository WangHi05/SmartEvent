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
        /// Kiểm tra xem có thể hủy đơn hàng (hoặc 1 vé cụ thể trong đơn) hay không.
        /// ticketId = null: kiểm tra hủy CẢ đơn (hành vi cũ).
        /// ticketId có giá trị: kiểm tra hủy RIÊNG vé đó trong đơn.
        /// </summary>
        Task<CancelValidationDto> ValidateCancelAsync(Guid orderId, Guid userId, Guid? ticketId = null);

        /// <summary>
        /// Hủy đơn hàng (hoặc 1 vé cụ thể trong đơn) và xử lý hoàn tiền.
        /// ticketId = null: hủy CẢ đơn (hành vi cũ).
        /// ticketId có giá trị: chỉ hủy vé đó, các vé khác trong đơn không đổi.
        /// </summary>
        Task<CancelOrderResponseDto> CancelOrderAsync(Guid orderId, Guid userId, string reason, string performedBy, Guid? ticketId = null);

        /// <summary>
        /// Tính toán số tiền hoàn lại
        /// </summary>
        Task<CalculateRefundDto> CalculateRefundAsync(Guid orderId);

        /// <summary>
        /// Kiểm tra số lần hủy trong tháng hiện tại
        /// </summary>
        Task<int> GetUserCancelCountThisMonthAsync(Guid userId);

        /// <summary>
        /// NV/Admin xác nhận đã hoàn tiền cho khách (hoàn thủ công ngoài hệ thống)
        /// </summary>
        Task<bool> ConfirmRefundCompletedAsync(Guid orderId, string confirmedBy);
    }
}