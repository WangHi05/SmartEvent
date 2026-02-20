using System;
using TicketSystem.Domain.Entities;

namespace TicketSystem.Application.Interfaces
{
    /// <summary>
    /// Interface Strategy Pattern cho các chính sách hoàn tiền khác nhau
    /// Tuân thủ Open/Closed Principle: Mở rộng bằng cách thêm class mới, không sửa code cũ
    /// </summary>
    public interface IRefundStrategy
    {
        /// <summary>
        /// Tính toán số tiền hoàn lại dựa trên chính sách cụ thể
        /// </summary>
        /// <param name="ticket">Thông tin vé cần hoàn tiền</param>
        /// <param name="cancellationTime">Thời điểm hủy vé</param>
        /// <returns>Số tiền được hoàn lại</returns>
        decimal CalculateRefundAmount(Ticket ticket, DateTime cancellationTime);

        /// <summary>
        /// Tên của chính sách (để hiển thị UI hoặc logging)
        /// </summary>
        string PolicyName { get; }

        /// <summary>
        /// Mô tả chi tiết chính sách
        /// </summary>
        string PolicyDescription { get; }
    }
}
