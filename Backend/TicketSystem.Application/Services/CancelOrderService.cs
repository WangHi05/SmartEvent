using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TicketSystem.Application.Common;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Interfaces;
using TicketSystem.Application.Strategies;
using TicketSystem.Domain.Common;
using TicketSystem.Domain.Entities;

namespace TicketSystem.Application.Services
{
    /// <summary>
    /// Service để quản lý hủy đơn hàng và hoàn tiền.
    /// LƯU Ý: Chính sách hoàn tiền được hardcode trong PartialRefundStrategy,
    /// không còn phụ thuộc vào cấu hình ở trang Cấu hình hệ thống (/settings).
    ///
    /// HỖ TRỢ HỦY TỪNG VÉ RIÊNG LẺ (vé đoàn mua nhiều vé trong 1 Order):
    /// - ticketId == null  -> hủy CẢ đơn (mọi vé còn active trong Order), hành vi cũ.
    /// - ticketId có giá trị -> chỉ hủy đúng vé đó, các vé khác trong cùng Order không đổi.
    ///   Order chỉ chuyển sang OrderStatus.Cancelled khi TẤT CẢ vé trong đơn đã bị hủy hết.
    /// </summary>
    public class CancelOrderService : ICancelOrderService
    {
        private const int MinimumCancelHours = 72; // Dưới 3 ngày trước sự kiện: không được hủy

        private readonly IApplicationDbContext _context;
        private readonly ISettingsService _settingsService;
        private readonly IRefundStrategyFactory _refundStrategyFactory;
        private readonly Microsoft.AspNetCore.Http.IHttpContextAccessor _httpContextAccessor;

        public CancelOrderService(
            IApplicationDbContext context,
            ISettingsService settingsService,
            IRefundStrategyFactory refundStrategyFactory,
            Microsoft.AspNetCore.Http.IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _settingsService = settingsService;
            _refundStrategyFactory = refundStrategyFactory;
            _httpContextAccessor = httpContextAccessor;
        }

        private string? GetClientIpAddress()
        {
            var ipAddress = _httpContextAccessor.HttpContext?.Connection.RemoteIpAddress;
            if (ipAddress == null) return null;
            if (ipAddress.ToString() == "::1") return "127.0.0.1";
            if (ipAddress.IsIPv4MappedToIPv6) return ipAddress.MapToIPv4().ToString();
            return ipAddress.ToString();
        }

        // Giá trị 1 vé trong đơn = TotalPrice gốc chia cho Quantity gốc lúc mua.
        // Dùng Quantity gốc (không phải số vé còn active) để đơn giá luôn ổn định,
        // không bị lệch dần qua nhiều lần hủy từng phần.
        private static decimal GetUnitPrice(Order order)
        {
            if (order.Quantity <= 0) return 0m;
            return order.TotalPrice / order.Quantity;
        }

        public async Task<CancelValidationDto> ValidateCancelAsync(Guid orderId, Guid userId, Guid? ticketId = null)
        {
            var order = await _context.Orders
                .Include(o => o.Event)
                .Include(o => o.Payments)
                .Include(o => o.Tickets)
                .FirstOrDefaultAsync(o => o.Id == orderId);

            if (order == null)
            {
                return new CancelValidationDto
                {
                    CanCancel = false,
                    ReasonCannotCancel = "Order not found"
                };
            }

            if (order.CustomerId != userId)
            {
                return new CancelValidationDto
                {
                    CanCancel = false,
                    ReasonCannotCancel = "Unauthorized"
                };
            }

            Ticket? targetTicket = null;
            if (ticketId.HasValue)
            {
                targetTicket = order.Tickets.FirstOrDefault(t => t.Id == ticketId.Value);
                if (targetTicket == null)
                {
                    return new CancelValidationDto
                    {
                        CanCancel = false,
                        ReasonCannotCancel = "Vé không thuộc đơn hàng này"
                    };
                }

                if (targetTicket.Status == TicketStatus.CANCELLED)
                {
                    return new CancelValidationDto
                    {
                        CanCancel = false,
                        ReasonCannotCancel = "Vé này đã được hủy trước đó"
                    };
                }

                if (targetTicket.IsCheckedIn || targetTicket.Status == TicketStatus.CHECKED_IN)
                {
                    return new CancelValidationDto
                    {
                        CanCancel = false,
                        ReasonCannotCancel = "Vé đã check-in, không thể hủy"
                    };
                }
            }

            var validationResult = ValidateCancelConditions(order, targetTicket);
            if (!validationResult.CanCancel)
            {
                return validationResult;
            }

            // Giới hạn số lần hủy/tháng chỉ áp dụng khi hủy CẢ đơn (giữ nguyên hành vi cũ).
            // Hủy từng vé lẻ trong đơn vé đoàn không tính vào giới hạn này.
            if (!ticketId.HasValue)
            {
                var cancelCountThisMonth = await GetUserCancelCountThisMonthAsync(userId);
                var maxCancelPerMonth = await _settingsService.GetMaxCancelPerUserPerMonthAsync();

                if (cancelCountThisMonth >= maxCancelPerMonth)
                {
                    return new CancelValidationDto
                    {
                        CanCancel = false,
                        ReasonCannotCancel = $"Exceeded maximum cancellations per month ({maxCancelPerMonth})"
                    };
                }
            }

            var refundCalc = await CalculateRefundAsync(orderId);
            var unitPrice = GetUnitPrice(order);

            decimal estimatedAmount;
            if (ticketId.HasValue)
            {
                // Hủy 1 vé: hoàn theo đơn giá của riêng vé đó
                estimatedAmount = Math.Round(unitPrice * refundCalc.RefundPercentage / 100m, 0);
            }
            else
            {
                // Hủy cả đơn: hoàn theo tất cả các vé còn active (chưa bị hủy từ trước)
                var activeTicketsCount = order.Tickets.Count(t => t.Status != TicketStatus.CANCELLED);
                estimatedAmount = Math.Round(unitPrice * activeTicketsCount * refundCalc.RefundPercentage / 100m, 0);
            }

            return new CancelValidationDto
            {
                CanCancel = true,
                EstimatedRefundAmount = estimatedAmount,
                EstimatedRefundPercentage = refundCalc.RefundPercentage,
                RefundReason = refundCalc.RefundReason
            };
        }

        public async Task<CancelOrderResponseDto> CancelOrderAsync(Guid orderId, Guid userId, string reason, string performedBy, Guid? ticketId = null)
        {
            var validation = await ValidateCancelAsync(orderId, userId, ticketId);
            if (!validation.CanCancel)
            {
                return new CancelOrderResponseDto
                {
                    Success = false,
                    Message = validation.ReasonCannotCancel ?? "Cannot cancel this order",
                    RefundAmount = 0,
                    ErrorCode = "CANCEL_VALIDATION_FAILED"
                };
            }

            var order = await _context.Orders
                .Include(o => o.Event)
                .Include(o => o.TicketType)
                .Include(o => o.Payments)
                .Include(o => o.Tickets)
                .FirstOrDefaultAsync(o => o.Id == orderId);

            if (order == null)
            {
                return new CancelOrderResponseDto
                {
                    Success = false,
                    Message = "Order not found",
                    ErrorCode = "ORDER_NOT_FOUND"
                };
            }

            try
            {
                var refundCalc = await CalculateRefundAsync(orderId);
                var unitPrice = GetUnitPrice(order);
                var autoReleaseSeat = await _settingsService.IsAutoReleaseSeatEnabledAsync();
                decimal refundAmount;

                if (ticketId.HasValue)
                {
                    // ===== HỦY 1 VÉ RIÊNG LẺ TRONG ĐƠN =====
                    var targetTicket = order.Tickets.FirstOrDefault(t => t.Id == ticketId.Value);
                    if (targetTicket == null)
                    {
                        return new CancelOrderResponseDto
                        {
                            Success = false,
                            Message = "Vé không thuộc đơn hàng này",
                            ErrorCode = "TICKET_NOT_FOUND"
                        };
                    }

                    refundAmount = Math.Round(unitPrice * refundCalc.RefundPercentage / 100m, 0);

                    targetTicket.Status = TicketStatus.CANCELLED;
                    targetTicket.CancelledAt = DateTime.UtcNow;
                    targetTicket.CancelReason = reason;
                    targetTicket.RefundAmount = refundAmount;
                    targetTicket.UpdatedAt = DateTime.UtcNow;
                    targetTicket.UpdatedBy = performedBy;

                    if (autoReleaseSeat && order.TicketType != null)
                    {
                        order.TicketType.RemainingQuantity += 1;
                        order.TicketType.UpdatedAt = DateTime.UtcNow;
                        order.TicketType.UpdatedBy = performedBy;
                    }

                    // Cộng dồn số tiền hoàn vào Order để tiện theo dõi tổng đã hoàn của cả đơn
                    order.RefundAmount = (order.RefundAmount ?? 0) + refundAmount;
                    order.UpdatedAt = DateTime.UtcNow;
                    order.UpdatedBy = performedBy;

                    if (refundAmount > 0)
                    {
                        order.RefundStatus = RefundStatus.PendingRefund;
                    }

                    var remainingActiveTickets = order.Tickets.Count(t => t.Status != TicketStatus.CANCELLED);

                    if (remainingActiveTickets == 0)
                    {
                        // Tất cả vé trong đơn đã bị hủy hết -> đóng luôn cả Order
                        order.OrderStatus = OrderStatus.Cancelled;
                        order.CancelRequestAt = DateTime.UtcNow;

                        var lastPaymentAll = order.Payments?.OrderByDescending(p => p.CreatedAt).FirstOrDefault();
                        if (lastPaymentAll != null && lastPaymentAll.PaymentStatus == PaymentStatus.Pending)
                        {
                            lastPaymentAll.PaymentStatus = PaymentStatus.Cancelled;
                            lastPaymentAll.UpdatedAt = DateTime.UtcNow;
                            lastPaymentAll.UpdatedBy = performedBy;
                        }
                    }
                    // Còn vé khác chưa hủy -> Order giữ nguyên OrderStatus (vẫn Confirmed),
                    // chỉ riêng vé này chuyển CANCELLED.

                    await _context.SaveChangesAsync();
                    await LogCancelOrderAsync(orderId, userId, refundAmount, reason, performedBy, ticketId);

                    return new CancelOrderResponseDto
                    {
                        Success = true,
                        Message = remainingActiveTickets == 0
                            ? "Đã hủy vé cuối cùng của đơn hàng, đơn hàng đã đóng"
                            : "Đã hủy vé thành công, các vé khác trong đơn không bị ảnh hưởng",
                        RefundAmount = refundAmount,
                        CancelledAt = targetTicket.CancelledAt
                    };
                }
                else
                {
                    // ===== HỦY CẢ ĐƠN (hành vi cũ, giữ nguyên) =====
                    var activeTicketsCount = order.Tickets.Count(t => t.Status != TicketStatus.CANCELLED);
                    refundAmount = Math.Round(unitPrice * activeTicketsCount * refundCalc.RefundPercentage / 100m, 0);

                    order.OrderStatus = OrderStatus.Cancelled;
                    order.CancelRequestAt = DateTime.UtcNow;
                    order.RefundAmount = refundAmount;
                    order.UpdatedAt = DateTime.UtcNow;
                    order.UpdatedBy = performedBy;
                    order.RefundStatus = refundAmount > 0 ? RefundStatus.PendingRefund : RefundStatus.RefundCompleted;

                    var perTicketRefund = activeTicketsCount > 0 ? refundAmount / activeTicketsCount : 0;

                    foreach (var ticket in order.Tickets.Where(t => t.Status != TicketStatus.CANCELLED))
                    {
                        ticket.Status = TicketStatus.CANCELLED;
                        ticket.CancelledAt = DateTime.UtcNow;
                        ticket.CancelReason = reason;
                        ticket.RefundAmount = perTicketRefund;
                        ticket.UpdatedAt = DateTime.UtcNow;
                        ticket.UpdatedBy = performedBy;
                    }

                    if (autoReleaseSeat && order.TicketType != null)
                    {
                        order.TicketType.RemainingQuantity += activeTicketsCount;
                        order.TicketType.UpdatedAt = DateTime.UtcNow;
                        order.TicketType.UpdatedBy = performedBy;
                    }

                    var lastPayment = order.Payments?.OrderByDescending(p => p.CreatedAt).FirstOrDefault();
                    if (lastPayment != null && lastPayment.PaymentStatus == PaymentStatus.Pending)
                    {
                        lastPayment.PaymentStatus = PaymentStatus.Cancelled;
                        lastPayment.UpdatedAt = DateTime.UtcNow;
                        lastPayment.UpdatedBy = performedBy;
                    }

                    await _context.SaveChangesAsync();
                    await LogCancelOrderAsync(orderId, userId, refundAmount, reason, performedBy, null);

                    return new CancelOrderResponseDto
                    {
                        Success = true,
                        Message = "Order cancelled successfully",
                        RefundAmount = refundAmount,
                        CancelledAt = order.CancelRequestAt
                    };
                }
            }
            catch (Exception ex)
            {
                return new CancelOrderResponseDto
                {
                    Success = false,
                    Message = $"Error cancelling order: {ex.Message}",
                    ErrorCode = "CANCEL_ORDER_ERROR"
                };
            }
        }

        public async Task<CalculateRefundDto> CalculateRefundAsync(Guid orderId)
        {
            var order = await _context.Orders
                .Include(o => o.Event)
                .FirstOrDefaultAsync(o => o.Id == orderId);

            if (order == null)
            {
                throw new Exception("Order not found");
            }

            // Luôn dùng chính sách hoàn tiền hardcode (PartialRefundStrategy),
            // KHÔNG đọc RefundPolicy từ SystemSettings nữa.
            var strategy = _refundStrategyFactory.GetStrategy(RefundPolicy.PartialRefund);
            var result = await strategy.CalculateRefundAsync(order, VietnamTime.Now);

            return new CalculateRefundDto
            {
                TotalPrice = result.TotalPrice,
                RefundPercentage = result.RefundPercentage,
                RefundBeforeFee = result.RefundBeforeFee,
                RefundFeePercent = result.RefundFeePercent,
                RefundFeeAmount = result.RefundFeeAmount,
                FinalRefundAmount = result.FinalRefundAmount,
                RefundReason = result.Reason
            };
        }

        public async Task<int> GetUserCancelCountThisMonthAsync(Guid userId)
        {
            var firstDayOfMonth = new DateTime(VietnamTime.Now.Year, VietnamTime.Now.Month, 1);
            var lastDayOfMonth = firstDayOfMonth.AddMonths(1).AddDays(-1);

            var cancelCount = await _context.Orders
                .Where(o => o.CustomerId == userId &&
                           o.OrderStatus == OrderStatus.Cancelled &&
                           o.CancelRequestAt >= firstDayOfMonth &&
                           o.CancelRequestAt <= lastDayOfMonth)
                .CountAsync();

            return cancelCount;
        }

        public async Task<bool> ConfirmRefundCompletedAsync(Guid orderId, string confirmedBy)
        {
            var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == orderId);

            if (order == null)
            {
                throw new Exception("Order not found");
            }

            if (order.OrderStatus != OrderStatus.Cancelled)
            {
                throw new Exception("Order is not cancelled");
            }

            if (order.RefundStatus != RefundStatus.PendingRefund)
            {
                throw new Exception("No pending refund for this order");
            }

            order.RefundStatus = RefundStatus.RefundCompleted;
            order.RefundConfirmedAt = DateTime.UtcNow;
            order.RefundConfirmedBy = confirmedBy;
            order.UpdatedAt = DateTime.UtcNow;
            order.UpdatedBy = confirmedBy;

            _context.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                Action = "ConfirmRefundCompleted",
                EntityType = "Order",
                EntityId = order.Id,
                PerformedBy = confirmedBy,
                Timestamp = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = confirmedBy,
                Details = $"Refund of {order.RefundAmount:N0}đ confirmed as completed (manual, outside system)."
            });

            await _context.SaveChangesAsync();
            return true;
        }

        // targetTicket == null: đang validate hủy CẢ đơn (kiểm tra mọi vé chưa hủy trong đơn).
        // targetTicket != null: đang validate hủy 1 vé cụ thể (chỉ kiểm tra check-in của riêng vé đó,
        // việc đó đã làm ở ValidateCancelAsync trước khi gọi hàm này).
        private CancelValidationDto ValidateCancelConditions(Order order, Ticket? targetTicket)
        {
            if (order.OrderStatus == OrderStatus.Cancelled)
            {
                return new CancelValidationDto
                {
                    CanCancel = false,
                    ReasonCannotCancel = "Order already cancelled"
                };
            }

            var lastPayment = order.Payments?.OrderByDescending(p => p.CreatedAt).FirstOrDefault();
            if (lastPayment?.PaymentStatus != PaymentStatus.Completed &&
                lastPayment?.PaymentStatus != PaymentStatus.Pending)
            {
                return new CancelValidationDto
                {
                    CanCancel = false,
                    ReasonCannotCancel = "Payment status does not allow cancellation"
                };
            }

            if (order.Event != null)
            {
                if (order.Event.Status == EventStatus.Ongoing)
                {
                    return new CancelValidationDto
                    {
                        CanCancel = false,
                        ReasonCannotCancel = "Event is currently ongoing"
                    };
                }

                if (order.Event.Status == EventStatus.Completed)
                {
                    return new CancelValidationDto
                    {
                        CanCancel = false,
                        ReasonCannotCancel = "Event has already completed"
                    };
                }

                if (order.Event.Status == EventStatus.Cancelled)
                {
                    return new CancelValidationDto
                    {
                        CanCancel = false,
                        ReasonCannotCancel = "Event has been cancelled"
                    };
                }

                var hoursBeforeEvent = (VietnamTime.ToVietnamTime(order.Event.StartTime) - VietnamTime.Now).TotalHours;

                if (hoursBeforeEvent < 0)
                {
                    return new CancelValidationDto
                    {
                        CanCancel = false,
                        ReasonCannotCancel = "Event has already started"
                    };
                }

                // Chặn hủy trong vòng 3 ngày (72 giờ) trước sự kiện — theo chính sách hardcode
                if (hoursBeforeEvent < MinimumCancelHours)
                {
                    return new CancelValidationDto
                    {
                        CanCancel = false,
                        ReasonCannotCancel = "Vé của bạn đang trong thời gian không được hủy (dưới 3 ngày trước khi sự kiện diễn ra)"
                    };
                }
            }

            if (targetTicket == null)
            {
                // Hủy cả đơn: chỉ chặn nếu còn vé ACTIVE nào đã check-in.
                // Vé đã bị hủy từ trước (Status == CANCELLED) thì bỏ qua, không cần xét IsCheckedIn.
                if (order.Tickets != null && order.Tickets.Any(t => t.Status != TicketStatus.CANCELLED && t.IsCheckedIn))
                {
                    return new CancelValidationDto
                    {
                        CanCancel = false,
                        ReasonCannotCancel = "Cannot cancel order with checked-in tickets"
                    };
                }
            }
            // targetTicket != null: việc kiểm tra IsCheckedIn/đã hủy của riêng vé đó
            // đã được làm ở ValidateCancelAsync trước khi gọi hàm này, không lặp lại ở đây.

            return new CancelValidationDto { CanCancel = true };
        }

        private async Task LogCancelOrderAsync(Guid orderId, Guid userId, decimal refundAmount, string reason, string performedBy, Guid? ticketId)
        {
            var scopeText = ticketId.HasValue ? $"Ticket {ticketId.Value} (1 vé trong đơn)" : "Toàn bộ đơn hàng";

            var auditLog = new AuditLog
            {
                Id = Guid.NewGuid(),
                Action = ticketId.HasValue ? "CancelSingleTicket" : "CancelOrder",
                EntityType = ticketId.HasValue ? "Ticket" : "Order",
                EntityId = ticketId ?? orderId,
                PerformedBy = performedBy,
                Details = $"[{scopeText}] Order {orderId} cancelled by {userId}. Refund amount: {refundAmount}. Reason: {reason}",
                IpAddress = GetClientIpAddress(),
                Timestamp = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = performedBy
            };

            _context.AuditLogs.Add(auditLog);
            await _context.SaveChangesAsync();
        }
    }
}