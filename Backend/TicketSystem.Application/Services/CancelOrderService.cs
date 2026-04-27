using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Interfaces;
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

        public CancelOrderService(IApplicationDbContext context, ISettingsService settingsService)
        {
            _context = context;
            _settingsService = settingsService;
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
            var refundFeePercent = await _settingsService.GetRefundFeePercentAsync();
            var totalPrice = order.TotalPrice;

            decimal refundPercentage = 0;
            string refundReason = "";

            // Calculate refund percentage based on policy
            switch (refundPolicy)
            {
                case RefundPolicy.FullRefund:
                    refundPercentage = 100;
                    refundReason = "Full refund policy applied";
                    break;

                case RefundPolicy.NoRefund:
                    refundPercentage = 0;
                    refundReason = "No refund policy applied";
                    break;

                case RefundPolicy.PartialRefund:
                    var refundPercentages = await GetPartialRefundPercentageAsync(order.Event);
                    refundPercentage = refundPercentages.Item1;
                    refundReason = refundPercentages.Item2;
                    break;
            }

            // Calculate amounts
            var refundBeforeFee = (totalPrice * refundPercentage) / 100;
            var refundFeeAmount = (refundBeforeFee * refundFeePercent) / 100;
            var finalRefundAmount = refundBeforeFee - refundFeeAmount;

            return new CalculateRefundDto
            {
                TotalPrice = totalPrice,
                RefundPercentage = refundPercentage,
                RefundBeforeFee = refundBeforeFee,
                RefundFeePercent = refundFeePercent,
                RefundFeeAmount = refundFeeAmount,
                FinalRefundAmount = finalRefundAmount,
                RefundReason = refundReason
            };
        }

        public async Task<int> GetUserCancelCountThisMonthAsync(Guid userId)
        {
            var firstDayOfMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
            var lastDayOfMonth = firstDayOfMonth.AddMonths(1).AddDays(-1);

            var cancelCount = await _context.Orders
                .Where(o => o.UserId == userId &&
                           o.OrderStatus == OrderStatus.Cancelled &&
                           o.CancelRequestAt >= firstDayOfMonth &&
                           o.CancelRequestAt <= lastDayOfMonth)
                .CountAsync();

            return cancelCount;
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

            // 3. Nếu PaymentStatus = Pending, kiểm tra config
            if (lastPayment?.PaymentStatus == PaymentStatus.Pending)
            {
                // Sẽ check async - skip here
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
                var timeBeforeEvent = order.Event.StartTime - DateTime.UtcNow;
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

        private async Task<(decimal percentage, string reason)> GetPartialRefundPercentageAsync(Event? evt)
        {
            if (evt == null)
            {
                return (0, "Event not found");
            }

            var hoursBeforeEvent = (evt.StartTime - DateTime.UtcNow).TotalHours;

            var threshold7Days = await _settingsService.GetSettingAsIntAsync(
                SystemSettings.REFUND_THRESHOLD_7_DAYS, 168);
            var threshold3Days = await _settingsService.GetSettingAsIntAsync(
                SystemSettings.REFUND_THRESHOLD_3_DAYS, 72);
            var threshold1Day = await _settingsService.GetSettingAsIntAsync(
                SystemSettings.REFUND_THRESHOLD_1_DAY, 24);

            var percent100 = await _settingsService.GetSettingAsDecimalAsync(
                SystemSettings.REFUND_PERCENT_FULL, 100);
            var percent75 = await _settingsService.GetSettingAsDecimalAsync(
                SystemSettings.REFUND_PERCENT_75, 75);
            var percent50 = await _settingsService.GetSettingAsDecimalAsync(
                SystemSettings.REFUND_PERCENT_50, 50);
            var percent0 = await _settingsService.GetSettingAsDecimalAsync(
                SystemSettings.REFUND_PERCENT_0, 0);

            if (hoursBeforeEvent > threshold7Days)
            {
                return (percent100, $"Refund 100% (>7 days before event)");
            }
            else if (hoursBeforeEvent > threshold3Days)
            {
                return (percent75, $"Refund 75% (3-7 days before event)");
            }
            else if (hoursBeforeEvent > threshold1Day)
            {
                return (percent50, $"Refund 50% (1-3 days before event)");
            }
            else
            {
                return (percent0, $"No refund (<24 hours before event)");
            }
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
