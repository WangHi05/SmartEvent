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
    /// Service để quản lý hủy đơn hàng và hoàn tiền
    /// </summary>
    public class CancelOrderService : ICancelOrderService
    {
        private readonly IApplicationDbContext _context;
        private readonly ISettingsService _settingsService;
        private readonly IRefundStrategyFactory _refundStrategyFactory;

        public CancelOrderService(
            IApplicationDbContext context,
            ISettingsService settingsService,
            IRefundStrategyFactory refundStrategyFactory)
        {
            _context = context;
            _settingsService = settingsService;
            _refundStrategyFactory = refundStrategyFactory;
        }

        public async Task<CancelValidationDto> ValidateCancelAsync(Guid orderId, Guid userId)
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

            // Kiểm tra quyền sở hữu
            if (order.UserId != userId)
            {
                return new CancelValidationDto
                {
                    CanCancel = false,
                    ReasonCannotCancel = "Unauthorized"
                };
            }

            // Kiểm tra điều kiện hủy
            var validationResult = ValidateCancelConditions(order);
            if (!validationResult.CanCancel)
            {
                return validationResult;
            }

            // Kiểm tra số lần hủy trong tháng
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

            // Tính toán hoàn tiền dự kiến
            var refundCalc = await CalculateRefundAsync(orderId);

            return new CancelValidationDto
            {
                CanCancel = true,
                EstimatedRefundAmount = refundCalc.FinalRefundAmount
            };
        }

        public async Task<CancelOrderResponseDto> CancelOrderAsync(Guid orderId, Guid userId, string reason, string performedBy)
        {
            // Validate cancellation
            var validation = await ValidateCancelAsync(orderId, userId);
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
                // Calculate refund
                var refundCalc = await CalculateRefundAsync(orderId);
                var refundAmount = refundCalc.FinalRefundAmount;

                // Update order status
                order.OrderStatus = OrderStatus.Cancelled;
                order.CancelRequestAt = DateTime.UtcNow;
                order.RefundAmount = refundAmount;
                order.UpdatedAt = DateTime.UtcNow;
                order.UpdatedBy = performedBy;

                // Đánh dấu trạng thái hoàn tiền: nếu có tiền cần hoàn -> chờ NV xử lý thủ công
                order.RefundStatus = refundAmount > 0 ? RefundStatus.PendingRefund : RefundStatus.RefundCompleted;

                // Update all tickets in this order
                foreach (var ticket in order.Tickets)
                {
                    ticket.Status = TicketStatus.CANCELLED;
                    ticket.CancelledAt = DateTime.UtcNow;
                    ticket.CancelReason = reason;
                    ticket.RefundAmount = refundAmount / order.Tickets.Count; // Distribute refund equally
                    ticket.UpdatedAt = DateTime.UtcNow;
                    ticket.UpdatedBy = performedBy;
                }

                // Release seats if configured
                var autoReleaseSeat = await _settingsService.IsAutoReleaseSeatEnabledAsync();
                if (autoReleaseSeat && order.TicketType != null)
                {
                    order.TicketType.RemainingQuantity += order.Quantity;
                    order.TicketType.UpdatedAt = DateTime.UtcNow;
                    order.TicketType.UpdatedBy = performedBy;
                }

                // Update payment status to Cancelled if it was not yet processed
                var lastPayment = order.Payments?.OrderByDescending(p => p.CreatedAt).FirstOrDefault();
                if (lastPayment != null && lastPayment.PaymentStatus == PaymentStatus.Pending)
                {
                    lastPayment.PaymentStatus = PaymentStatus.Cancelled;
                    lastPayment.UpdatedAt = DateTime.UtcNow;
                    lastPayment.UpdatedBy = performedBy;
                }

                // Save changes
                await _context.SaveChangesAsync();

                // Log the cancellation
                await LogCancelOrderAsync(orderId, userId, refundAmount, reason, performedBy);

                return new CancelOrderResponseDto
                {
                    Success = true,
                    Message = "Order cancelled successfully",
                    RefundAmount = refundAmount,
                    CancelledAt = order.CancelRequestAt
                };
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

            var refundPolicy = await _settingsService.GetRefundPolicyAsync();
            var strategy = _refundStrategyFactory.GetStrategy(refundPolicy);
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
                .Where(o => o.UserId == userId &&
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

        private CancelValidationDto ValidateCancelConditions(Order order)
        {
            // 1. Kiểm tra OrderStatus không được Cancelled
            if (order.OrderStatus == OrderStatus.Cancelled)
            {
                return new CancelValidationDto
                {
                    CanCancel = false,
                    ReasonCannotCancel = "Order already cancelled"
                };
            }

            // 2. Kiểm tra PaymentStatus phải Completed hoặc Pending (nếu config cho phép)
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

            // 4. Kiểm tra EventStatus
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

                // 5. Kiểm tra thời gian hủy (phải trước event start time)
                var timeBeforeEvent = VietnamTime.ToVietnamTime(order.Event.StartTime) - VietnamTime.Now;
                if (timeBeforeEvent.TotalHours < 0)
                {
                    return new CancelValidationDto
                    {
                        CanCancel = false,
                        ReasonCannotCancel = "Event has already started"
                    };
                }
            }

            // 6. Kiểm tra vé đã check-in hay chưa
            if (order.Tickets != null && order.Tickets.Any(t => t.IsCheckedIn))
            {
                return new CancelValidationDto
                {
                    CanCancel = false,
                    ReasonCannotCancel = "Cannot cancel order with checked-in tickets"
                };
            }

            return new CancelValidationDto { CanCancel = true };
        }

        private async Task LogCancelOrderAsync(Guid orderId, Guid userId, decimal refundAmount, string reason, string performedBy)
        {
            var auditLog = new AuditLog
            {
                Id = Guid.NewGuid(),
                Action = "CancelOrder",
                EntityType = "Order",
                EntityId = orderId,
                PerformedBy = performedBy,
                Details = $"Order cancelled by {userId}. Refund amount: {refundAmount}. Reason: {reason}",
                Timestamp = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = performedBy
            };

            _context.AuditLogs.Add(auditLog);
            await _context.SaveChangesAsync();
        }
    }
}