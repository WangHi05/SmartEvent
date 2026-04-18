using System;
using TicketSystem.Domain.Entities;

namespace TicketSystem.Application.Interfaces
{
    
    /// Interface Strategy Pattern cho các chính sách hoàn tiền khác nhau
    /// Tuân thủ Open/Closed Principle: Mở rộng bằng cách thêm class mới, không sửa code cũ
    
    public interface IRefundStrategy
    {
        
        /// Tính toán số tiền hoàn lại dựa trên chính sách cụ thể
        decimal CalculateRefundAmount(Ticket ticket, DateTime cancellationTime);

        
        /// Tên của chính sách (để hiển thị UI hoặc logging)
        
        string PolicyName { get; }

        
        /// Mô tả chi tiết chính sách
        
        string PolicyDescription { get; }
    }
}
