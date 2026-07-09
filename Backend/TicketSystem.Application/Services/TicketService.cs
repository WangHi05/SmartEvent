using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using TicketSystem.Application.Common;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Interfaces;
using TicketSystem.Domain.Common;
using TicketSystem.Domain.Entities;
using TicketSystem.Domain.Interfaces;
using OtpNet;

using Microsoft.Extensions.Logging; 
namespace TicketSystem.Application.Services
{
    public class TicketService : ITicketService
    {
        private readonly IGenericRepository<Ticket> _ticketRepository;
        private readonly ITicketTypeRepository _ticketTypeRepository;
        private readonly IGenericRepository<AuditLog> _auditLogRepository;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly Dictionary<string, IRefundStrategy> _refundStrategies;
        private readonly ILogger<TicketService> _logger;
        public TicketService(
            IGenericRepository<Ticket> ticketRepository,
            ITicketTypeRepository ticketTypeRepository,
            IGenericRepository<AuditLog> auditLogRepository,
            IHttpContextAccessor httpContextAccessor,
            IEnumerable<IRefundStrategy> refundStrategies,
            ILogger<TicketService> logger)
        {
            _ticketRepository = ticketRepository;
            _ticketTypeRepository = ticketTypeRepository;
            _auditLogRepository = auditLogRepository;
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
            _refundStrategies = refundStrategies.ToDictionary(
                strategy => strategy.GetType().Name.Replace("Strategy", ""), 
                strategy => strategy                                         
            );
        }

        public async Task<string?> GetUnusedQrForTestAsync()
        {
            var allTickets = await _ticketRepository.GetAllAsync();
            
            // 1. Lấy TẤT CẢ vé ACTIVE và CHƯA HẾT HẠN (Sửa để tránh lỗi "Event đã kết thúc")
            // Dựa vào DB Diagram, ta sử dụng thuộc tính ValidTo để lọc
            var activeTickets = allTickets
                .Where(t => t.Status == TicketStatus.ACTIVE && t.ValidTo > DateTime.UtcNow)
                .ToList();

            if (!activeTickets.Any())
            {
                _logger.LogWarning("Load Test: Không tìm thấy vé ACTIVE nào CÒN HẠN SỬ DỤNG trong Database.");
                return null;
            }

            _logger.LogInformation($"Load Test: Bắt đầu quét {activeTickets.Count} vé hợp lệ (còn hạn) để tìm SecretKey...");

            // 2. Lọc nhanh (Heuristic filter): Chuỗi Base32 không bao giờ chứa 0, 1, 8, 9 hoặc '-'
            var potentialTickets = activeTickets.Where(t => 
                !string.IsNullOrEmpty(t.SecretKey) &&
                !t.SecretKey.Contains("-") &&
                !t.SecretKey.Any(c => c == '0' || c == '1' || c == '8' || c == '9')
            ).ToList();

            _logger.LogInformation($"Load Test: Có {potentialTickets.Count} vé tiềm năng lọt qua bộ lọc sơ bộ.");

            // 3. Quét các vé tiềm năng
            foreach (var ticket in potentialTickets)
            {
                try
                {
                    var secretBytes = Base32Encoding.ToBytes(ticket.SecretKey);
                    
                    var totp = new Totp(secretBytes);
                    string currentClientOtp = totp.ComputeTotp(); 
                    
                    string generatedQrPayload = $"{ticket.Id}|{currentClientOtp}";
                    
                    _logger.LogInformation($"✅ Load Test: Đã tìm thấy vé HỢP LỆ & CÒN HẠN! ID: {ticket.Id}");
                    return generatedQrPayload;
                }
                catch (Exception ex) 
                {
                    _logger.LogWarning($"Vé {ticket.Id} tiềm năng nhưng vẫn lỗi OTP: {ex.Message}");
                    continue; 
                }
            }

            _logger.LogError("Load Test: Đã quét toàn bộ vé nhưng KHÔNG CÓ vé nào đúng chuẩn Base32. Vui lòng kiểm tra lại Seed Data.");
            return null;
        }

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
            if (ticket.Status == TicketStatus.CHECKED_IN)
            {
                return new CancelTicketResponseDto
                {
                    Success = false,
                    Message = "Không thể hủy vé đã check-in",
                    NewStatus = ticket.Status
                };
            }

             if (ticket.Status == TicketStatus.CANCELLED)
            {
                return new CancelTicketResponseDto
                {
                    Success = false,
                    Message = "Vé đã được hủy trước đó",
                    NewStatus = ticket.Status
                };
            }

            // Xác định strategy hoàn tiền
            // Ưu tiên: TicketType.GetRefundPolicy() > request.RefundStrategyType > Mặc định PartialRefund
            string strategyKey = "PartialRefund"; // Mặc định
            string policySource = "Default";

            // Nếu ticket có TicketTypeId, lấy policy từ TicketType
            if (ticket.TicketTypeId != Guid.Empty)
            {
                var ticketType = await _ticketTypeRepository.GetByIdAsync(ticket.TicketTypeId);
                if (ticketType != null)
                {
                    //var refundPolicy = ticketType.GetRefundPolicy();
                    strategyKey = "PartialRefund";  // "FullRefund", "PartialRefund", "NoRefund"
                    policySource = $"TicketType({ticketType.Name})";
                }
            }
            // Nếu không, dùng từ request (nếu có)
            else if (!string.IsNullOrEmpty(request.RefundStrategyType))
            {
                // Chuẩn hóa tên strategy từ request
                var requestedStrategy = request.RefundStrategyType.ToLower();
                if (requestedStrategy.Contains("full"))
                    strategyKey = "FullRefund";
                else if (requestedStrategy.Contains("none"))
                    strategyKey = "NoRefund";
                else
                    strategyKey = "PartialRefund";
                
                policySource = "Request";
            }

            // Lấy strategy implementation
            if (!_refundStrategies.TryGetValue(strategyKey, out var refundStrategy))
            {
                refundStrategy = _refundStrategies["PartialRefund"]; // Fallback
                strategyKey = "PartialRefund";
            }

            // Tính toán số tiền hoàn lại
            var cancellationTime = DateTime.UtcNow;
            var refundAmount = refundStrategy.CalculateRefundAmount(ticket, cancellationTime);

            // Cập nhật trạng thái vé
            ticket.Status = TicketStatus.CANCELLED;
            ticket.UpdatedAt = cancellationTime;
            ticket.UpdatedBy = performedBy;

            await _ticketRepository.UpdateAsync(ticket);

            // Ghi log AuditLog
            await LogAuditAsync(new AuditLog
            {
                Action = "CANCEL_TICKET",
                EntityType = nameof(Ticket),
                EntityId = ticket.Id,
                PerformedBy = performedBy,
                Details = $"Hủy vé: Hoàn tiền {refundAmount:C}, Chính sách: {strategyKey} (từ {policySource}), Lý do: {request.Reason}"
            });

            return new CancelTicketResponseDto
            {
                Success = true,
                Message = refundAmount > 0 
                    ? $"Vé đã được hủy và hoàn tiền {refundAmount:C}" 
                    : "Vé đã được hủy (không hoàn tiền)",
                RefundAmount = refundAmount,
                RefundPolicyApplied = strategyKey,
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
            log.Timestamp = VietnamTime.Now;
            await _auditLogRepository.AddAsync(log);
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
