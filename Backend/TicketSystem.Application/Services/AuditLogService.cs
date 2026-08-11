using System;
using System.Threading.Tasks;
using TicketSystem.Application.Interfaces;
using TicketSystem.Domain.Entities;
using TicketSystem.Domain.Interfaces;
using TicketSystem.Application.Common;

namespace TicketSystem.Application.Services
{
    public class AuditLogService : IAuditLogService
    {
        private readonly IUnitOfWork _unitOfWork;

        public AuditLogService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task LogAsync(string action, string entityType, Guid entityId, string performedBy, string? details = null, string? ipAddress = null)
        {
            var auditLog = new AuditLog
            {
                Action = action,
                EntityType = entityType,
                EntityId = entityId,
                PerformedBy = performedBy,
                Details = details,
                IpAddress = ipAddress,
                Timestamp = VietnamTime.UtcNow // Sử dụng UtcNow thay vì Now
            };

            // 1. Thêm vào RAM thông qua Generic Repository lấy từ UnitOfWork
            await _unitOfWork.Repository<AuditLog>().AddAsync(auditLog);
            
            // 2. Lưu thực sự xuống Database (PostgreSQL)
            await _unitOfWork.Complete();
        }
    }
}