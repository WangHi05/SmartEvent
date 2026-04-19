using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Interfaces;
using TicketSystem.Application.Strategies;
using TicketSystem.Domain.Common;
using TicketSystem.Domain.Entities;
using TicketSystem.Domain.Interfaces;

namespace TicketSystem.Application.Services
{
    
    /// Service xử lý logic nghiệp vụ liên quan đến Ticket
    /// Sử dụng Strategy Pattern để xử lý các chính sách hoàn tiền khác nhau
    
    public class TicketService
    {
        private readonly IGenericRepository<Ticket> _ticketRepository;
        private readonly IGenericRepository<AuditLog> _auditLogRepository;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly Dictionary<string, IRefundStrategy> _refundStrategies;

        public TicketService(
            IGenericRepository<Ticket> ticketRepository,
            IGenericRepository<AuditLog> auditLogRepository,
            IHttpContextAccessor httpContextAccessor)
        {
            _ticketRepository = ticketRepository;
            _auditLogRepository = auditLogRepository;
            _httpContextAccessor = httpContextAccessor;

            // Khởi tạo các Strategy Pattern (có thể inject qua DI container trong thực tế)
            _refundStrategies = new Dictionary<string, IRefundStrategy>
            {
                { "Full", new FullRefundStrategy() },
                { "Partial", new PartialRefundStrategy() },
                { "None", new NoRefundStrategy() }
            };
        }

        
        /// Hủy vé và xử lý hoàn tiền theo chính sách
        
        public async Task<CancelTicketResponseDto> CancelTicketAsync(CancelTicketDto request, string performedBy)
        {
            var ticket = await _ticketRepository.GetByIdAsync(request.TicketId);
            
            if (ticket == null)
            {
                return new CancelTicketResponseDto
                {
                    Success = false,
                    Message = "Không tìm thấy vé"
                };
            }

            // Kiểm tra điều kiện hủy vé
            if (ticket.Status == TicketStatus.CheckedIn)
            {
                return new CancelTicketResponseDto
                {
                    Success = false,
                    Message = "Không thể hủy vé đã check-in",
                    NewStatus = ticket.Status
                };
            }

            if (ticket.Status == TicketStatus.Cancelled || ticket.Status == TicketStatus.Refunded)
            {
                return new CancelTicketResponseDto
                {
                    Success = false,
                    Message = "Vé đã được hủy trước đó",
                    NewStatus = ticket.Status
                };
            }

            // Lấy Strategy dựa trên request hoặc cấu hình mặc định
            var strategyType = request.RefundStrategyType ?? "Partial";
            if (!_refundStrategies.TryGetValue(strategyType, out var refundStrategy))
            {
                refundStrategy = new PartialRefundStrategy(); // Fallback
            }

            // Tính toán số tiền hoàn lại
            var cancellationTime = DateTime.UtcNow;
            var refundAmount = refundStrategy.CalculateRefundAmount(ticket, cancellationTime);

            // Cập nhật trạng thái vé
            ticket.Status = refundAmount > 0 ? TicketStatus.Refunded : TicketStatus.Cancelled;
            ticket.UpdatedAt = cancellationTime;
            ticket.UpdatedBy = performedBy;

            await _ticketRepository.UpdateAsync(ticket);

            // Ghi log AuditLog
            await LogAuditAsync(new AuditLog
            {
                Action = "Cancel",
                EntityType = "Ticket",
                EntityId = ticket.Id,
                PerformedBy = performedBy,
                Details = $"Cancelled - Refund: {refundAmount:C}, Strategy: {refundStrategy.PolicyName}, Reason: {request.Reason}"
            });

            return new CancelTicketResponseDto
            {
                Success = true,
                Message = refundAmount > 0 
                    ? $"Vé đã được hủy và hoàn tiền {refundAmount:C}" 
                    : "Vé đã được hủy (không hoàn tiền)",
                RefundAmount = refundAmount,
                RefundPolicyApplied = refundStrategy.PolicyName,
                NewStatus = ticket.Status
            };
        }

        
        /// Lấy danh sách các chính sách hoàn tiền khả dụng
        
        public List<RefundPolicyInfo> GetAvailableRefundPolicies()
        {
            return _refundStrategies.Select(kvp => new RefundPolicyInfo
            {
                Type = kvp.Key,
                Name = kvp.Value.PolicyName,
                Description = kvp.Value.PolicyDescription
            }).ToList();
        }

        
        /// Ghi log hành động vào AuditLog
        
        private async Task LogAuditAsync(AuditLog log)
        {
            log.IpAddress = GetClientIpAddress();
            log.Timestamp = GetVietnamTime();
            await _auditLogRepository.AddAsync(log);
        }

        private DateTime GetVietnamTime()
        {
            TimeZoneInfo vietnamZone = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
            return TimeZoneInfo.ConvertTime(DateTime.UtcNow, vietnamZone);
        }

        
        /// Lấy IP address của client (IPv4 format)
        
        private string? GetClientIpAddress()
        {
            var ipAddress = _httpContextAccessor.HttpContext?.Connection.RemoteIpAddress;
            if (ipAddress == null) return null;

            // Convert IPv6 localhost (::1) to IPv4 (127.0.0.1)
            if (ipAddress.ToString() == "::1")
                return "127.0.0.1";

            // Nếu là IPv4 mapped trong IPv6 (::ffff:192.168.1.1) → Extract IPv4
            if (ipAddress.IsIPv4MappedToIPv6)
                return ipAddress.MapToIPv4().ToString();

            return ipAddress.ToString();
        }
    }

    
    /// DTO thông tin chính sách hoàn tiền
    
    public class RefundPolicyInfo
    {
        public string Type { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
    }
}
