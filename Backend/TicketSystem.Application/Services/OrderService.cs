using Microsoft.EntityFrameworkCore;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Interfaces;
using TicketSystem.Domain.Common;
using Microsoft.Extensions.Configuration;
using TicketSystem.Domain.Entities;

namespace TicketSystem.Application.Services;

public class OrderService : IOrderService
{
    private readonly IApplicationDbContext _context;
    private readonly ICancelOrderService _cancelOrderService;
    private readonly INotificationService _notificationService;
    private readonly IConfiguration _configuration;

    public OrderService(
        IApplicationDbContext context,
        ICancelOrderService cancelOrderService,
        INotificationService notificationService,
        IConfiguration configuration)
    {
        _context = context;
        _cancelOrderService = cancelOrderService;
        _notificationService = notificationService;
        _configuration = configuration;
    }

    public async Task<CreateOrderResponseDto> CreateOrderAsync(Guid userId, CreateOrderDto createOrderDto, string createdBy)
    {
        if (createOrderDto.Items == null || createOrderDto.Items.Count == 0)
            throw new Exception("Order must contain at least 1 ticket item");

        var user = await _context.Customers.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) throw new Exception("User not found");

        var eventEntity = await _context.Events.FirstOrDefaultAsync(e => e.Id == createOrderDto.EventId);
        if (eventEntity == null) throw new Exception("Event not found");
        if (eventEntity.IsFull()) throw new Exception("Event is at full capacity");

        var orderId = Guid.NewGuid();
        var orderItems = new List<OrderItem>();
        decimal totalPrice = 0;
        int totalQuantity = 0;

        foreach (var itemDto in createOrderDto.Items)
        {
            var ticketType = await _context.TicketTypes.FirstOrDefaultAsync(tt => tt.Id == itemDto.TicketTypeId);
            if (ticketType == null) throw new Exception($"Ticket type {itemDto.TicketTypeId} not found");
            if (ticketType.EventId != createOrderDto.EventId) throw new Exception("Ticket type does not belong to this event");
            if (ticketType.RemainingQuantity < itemDto.Quantity)
                throw new Exception($"Only {ticketType.RemainingQuantity} tickets available for {ticketType.Name}");

            var itemSubtotal = ticketType.Price * itemDto.Quantity;
            if ((int)ticketType.TicketMode == 2 && (int?)ticketType.PriceMode == 1)
            {
                itemSubtotal = ticketType.Price * itemDto.Quantity * itemDto.MemberCount;
            }

            totalPrice += itemSubtotal;
            totalQuantity += itemDto.Quantity;

            orderItems.Add(new OrderItem
            {
                Id = Guid.NewGuid(),
                OrderId = orderId,
                TicketTypeId = ticketType.Id,
                Quantity = itemDto.Quantity,
                MemberCount = itemDto.MemberCount,
                UnitPrice = ticketType.Price,
                Subtotal = itemSubtotal,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = createdBy
            });

            // Sinh vé cho loại vé này
            var currentQrMode = ticketType.QRMode ?? QRMode.SINGLE_QR;
            int totalTicketsToGenerate = itemDto.Quantity;
            int slotsPerTicket = itemDto.MemberCount;

            if (currentQrMode == QRMode.SUB_QR && itemDto.MemberCount > 1)
            {
                totalTicketsToGenerate = itemDto.Quantity * itemDto.MemberCount;
                slotsPerTicket = 1;
            }

            for (var i = 0; i < totalTicketsToGenerate; i++)
            {
                _context.Tickets.Add(new Ticket
                {
                    Id = Guid.NewGuid(),
                    TicketTypeId = ticketType.Id,
                    OrderId = orderId,
                    ValidFrom = eventEntity.StartTime,
                    ValidTo = eventEntity.EndTime,
                    SecretKey = TicketSystem.Application.Utils.Base32Generator.Generate(16),
                    Status = TicketStatus.ACTIVE,
                    GroupSize = slotsPerTicket,
                    RemainingSlots = slotsPerTicket,
                    IsClaimed = false,
                    ShareToken = null,
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = createdBy
                });
            }

            ticketType.RemainingQuantity -= itemDto.Quantity;
            ticketType.UpdatedAt = DateTime.UtcNow;
            ticketType.UpdatedBy = createdBy;
        }

        // Item đầu tiên dùng làm dữ liệu tóm tắt (tương thích ngược cho các luồng cũ)
        var firstItem = orderItems[0];

        var order = new Order
        {
            Id = orderId,
            CustomerId = userId,
            EventId = createOrderDto.EventId,
            TicketTypeId = firstItem.TicketTypeId,
            Quantity = totalQuantity,
            TotalPrice = totalPrice,
            OrderStatus = OrderStatus.Pending,
            BuyerName = createOrderDto.BuyerName ?? user.FullName,
            BuyerPhone = createOrderDto.BuyerPhone ?? user.PhoneNumber,
            BuyerCccd = createOrderDto.BuyerCccd,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = createdBy
        };

        _context.Orders.Add(order);

        foreach (var item in orderItems)
        {
            _context.OrderItems.Add(item);
        }

        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            OrderId = order.Id,
            Amount = totalPrice,
            PaymentMethod = (PaymentMethod)createOrderDto.PaymentMethod,
            PaymentStatus = PaymentStatus.Pending,
            TransactionReference = string.Empty,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = createdBy
        };

        _context.Payments.Add(payment);

        await _context.SaveChangesAsync();

        return new CreateOrderResponseDto
        {
            OrderId = order.Id,
            TotalPrice = totalPrice,
            PaymentMethod = createOrderDto.PaymentMethod,
            PaymentMethodName = ((PaymentMethod)createOrderDto.PaymentMethod).ToString(),
            Message = $"Order created successfully. Total: {totalPrice:C}"
        };
    }

    public async Task<OrderResponseDto> ConfirmOrderPaymentAsync(Guid orderId, Guid userId, string transactionReference = "")
    {
        var order = await _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.Event)
            .Include(o => o.TicketType)
            .Include(o => o.Payments)
            .Include(o => o.OrderItems).ThenInclude(oi => oi.TicketType)
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order == null)
        {
            throw new Exception("Order not found");
        }

        if (order.CustomerId != userId)
        {
            throw new Exception("Unauthorized to confirm this payment");
        }

        var latestPayment = order.Payments
            .OrderByDescending(p => p.CreatedAt)
            .FirstOrDefault();

        if (latestPayment == null)
        {
            throw new Exception("Payment record not found");
        }

        latestPayment.PaymentStatus = PaymentStatus.Completed;
        latestPayment.PaidAt = DateTime.UtcNow;
        latestPayment.TransactionReference = string.IsNullOrWhiteSpace(transactionReference)
            ? $"TXN-{DateTime.UtcNow:yyyyMMddHHmmss}"
            : transactionReference.Trim();
        latestPayment.UpdatedAt = DateTime.UtcNow;
        latestPayment.UpdatedBy = order.CustomerId.ToString();

        order.OrderStatus = OrderStatus.Confirmed;
        order.UpdatedAt = DateTime.UtcNow;
        order.UpdatedBy = order.CustomerId.ToString();

        await _context.SaveChangesAsync();

        return MapOrderToDto(order);
    }

    public async Task<OrderResponseDto> ConfirmOrderPaymentBySystemAsync(Guid orderId, string transactionReference = "")
    {
        var order = await _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.Event)
            .Include(o => o.TicketType)
            .Include(o => o.Payments)
            .Include(o => o.OrderItems).ThenInclude(oi => oi.TicketType)
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order == null)
        {
            throw new Exception("Order not found");
        }

        var latestPayment = order.Payments
            .OrderByDescending(p => p.CreatedAt)
            .FirstOrDefault();

        if (latestPayment == null)
        {
            throw new Exception("Payment record not found");
        }

        latestPayment.PaymentStatus = PaymentStatus.Completed;
        latestPayment.PaidAt = DateTime.UtcNow;
        latestPayment.TransactionReference = string.IsNullOrWhiteSpace(transactionReference)
            ? $"TXN-{DateTime.UtcNow:yyyyMMddHHmmss}"
            : transactionReference.Trim();
        latestPayment.UpdatedAt = DateTime.UtcNow;
        latestPayment.UpdatedBy = "VNPAY";

        order.OrderStatus = OrderStatus.Confirmed;
        order.UpdatedAt = DateTime.UtcNow;
        order.UpdatedBy = "VNPAY";

        await _context.SaveChangesAsync();

        await SendTicketConfirmationNotificationAsync(order);

        return MapOrderToDto(order);
    }

    public async Task<OrderResponseDto> ConfirmCounterPaymentByAdminAsync(Guid orderId, string confirmedBy)
    {
        var order = await _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.Event)
            .Include(o => o.TicketType)
            .Include(o => o.Payments)
            .Include(o => o.Tickets)
            .Include(o => o.OrderItems).ThenInclude(oi => oi.TicketType)
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order == null)
        {
            throw new Exception("Order not found");
        }

        var latestPayment = order.Payments
            .OrderByDescending(p => p.CreatedAt)
            .FirstOrDefault();

        if (latestPayment == null)
        {
            throw new Exception("Payment record not found");
        }

        if (latestPayment.PaymentStatus != PaymentStatus.Pending)
        {
            throw new Exception("Only pending counter payment can be confirmed");
        }

        if (order.OrderStatus == OrderStatus.Cancelled)
        {
            throw new Exception("Cancelled order cannot be confirmed");
        }

        latestPayment.PaymentStatus = PaymentStatus.Completed;
        latestPayment.PaidAt = DateTime.UtcNow;
        latestPayment.TransactionReference = $"MANUAL-{DateTime.UtcNow:yyyyMMddHHmmss}";
        latestPayment.UpdatedAt = DateTime.UtcNow;
        latestPayment.UpdatedBy = confirmedBy;

        order.OrderStatus = OrderStatus.Confirmed;
        order.ConfirmedAt = DateTime.UtcNow;
        order.ConfirmedBy = confirmedBy;
        order.UpdatedAt = DateTime.UtcNow;
        order.UpdatedBy = confirmedBy;

        // Fallback: đảm bảo đủ vé theo từng OrderItem (dữ liệu cũ có thể thiếu tickets)
        var items = order.OrderItems.Any()
            ? order.OrderItems.ToList()
            : new List<OrderItem> { new OrderItem { TicketTypeId = order.TicketTypeId, Quantity = order.Quantity } };

        foreach (var item in items)
        {
            var ticketsForThisType = order.Tickets.Count(t => t.TicketTypeId == item.TicketTypeId);
            var missing = Math.Max(0, item.Quantity - ticketsForThisType);

            for (var i = 0; i < missing; i++)
            {
                _context.Tickets.Add(new Ticket
                {
                    Id = Guid.NewGuid(),
                    TicketTypeId = item.TicketTypeId,
                    OrderId = order.Id,
                    ValidFrom = order.Event.StartTime,
                    ValidTo = order.Event.EndTime,
                    SecretKey = TicketSystem.Application.Utils.Base32Generator.Generate(16),
                    Status = TicketStatus.ACTIVE,
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = confirmedBy
                });
            }
        }

        _context.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid(),
            Action = "ManualConfirmPayment",
            EntityType = "Order",
            EntityId = order.Id,
            PerformedBy = confirmedBy,
            Timestamp = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = confirmedBy,
            Details = $"Payment confirmed manually by staff. Original method: {latestPayment.PaymentMethod}. PaymentStatus=Completed, OrderStatus=Confirmed"
        });

        await _context.SaveChangesAsync();

        await SendTicketConfirmationNotificationAsync(order);

        return MapOrderToDto(order);
    }

    public async Task<OrderResponseDto> ConfirmOnlineOrderByAdminAsync(Guid orderId, string confirmedBy)
    {
        var order = await _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.Event)
            .Include(o => o.TicketType)
            .Include(o => o.Payments)
            .Include(o => o.OrderItems).ThenInclude(oi => oi.TicketType)
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order == null)
        {
            throw new Exception("Order not found");
        }

        var latestPayment = order.Payments
            .OrderByDescending(p => p.CreatedAt)
            .FirstOrDefault();

        if (latestPayment == null)
        {
            throw new Exception("Payment record not found");
        }

        if (latestPayment.PaymentMethod == PaymentMethod.Counter)
        {
            throw new Exception("Counter order must use confirm-payment endpoint");
        }

        if (latestPayment.PaymentStatus != PaymentStatus.Completed)
        {
            throw new Exception("Only paid online order can be confirmed");
        }

        if (order.OrderStatus == OrderStatus.Cancelled)
        {
            throw new Exception("Cancelled order cannot be confirmed");
        }

        if (order.OrderStatus == OrderStatus.Confirmed)
        {
            return MapOrderToDto(order);
        }

        order.OrderStatus = OrderStatus.Confirmed;
        order.ConfirmedAt = DateTime.UtcNow;
        order.ConfirmedBy = confirmedBy;
        order.UpdatedAt = DateTime.UtcNow;
        order.UpdatedBy = confirmedBy;

        _context.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid(),
            Action = "ConfirmOrder",
            EntityType = "Order",
            EntityId = order.Id,
            PerformedBy = confirmedBy,
            Timestamp = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = confirmedBy,
            Details = "Online paid order confirmed"
        });

        await _context.SaveChangesAsync();

        await SendTicketConfirmationNotificationAsync(order);

        return MapOrderToDto(order);
    }

    public async Task<CancelOrderResponseDto> CancelOrderByAdminAsync(Guid orderId, string reason, string cancelledBy)  
    {
        var order = await _context.Orders
            .Include(o => o.Payments)
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order == null)
        {
            throw new Exception("Order not found");
        }

        var latestPayment = order.Payments
            .OrderByDescending(p => p.CreatedAt)
            .FirstOrDefault();

        if (latestPayment == null)
        {
            throw new Exception("Payment record not found");
        }

        if (order.OrderStatus == OrderStatus.Cancelled)
        {
            return new CancelOrderResponseDto
            {
                Success = true,
                Message = "Order already cancelled",
                RefundAmount = order.RefundAmount ?? 0,
                CancelledAt = order.CancelRequestAt
            };
        }

        if (latestPayment.PaymentMethod != PaymentMethod.Counter && latestPayment.PaymentStatus == PaymentStatus.Completed)
        {
            return await _cancelOrderService.CancelOrderAsync(orderId, order.CustomerId, reason, cancelledBy);
        }

        order.OrderStatus = OrderStatus.Cancelled;
        order.CancelRequestAt = DateTime.UtcNow;
        order.RefundAmount = 0;
        order.UpdatedAt = DateTime.UtcNow;
        order.UpdatedBy = cancelledBy;

        if (latestPayment.PaymentStatus == PaymentStatus.Pending)
        {
            latestPayment.PaymentStatus = PaymentStatus.Cancelled;
            latestPayment.UpdatedAt = DateTime.UtcNow;
            latestPayment.UpdatedBy = cancelledBy;
        }

        var tickets = await _context.Tickets.Where(t => t.OrderId == order.Id).ToListAsync();
        foreach (var ticket in tickets)
        {
            ticket.Status = TicketStatus.CANCELLED;
            ticket.CancelledAt = DateTime.UtcNow;
            ticket.CancelReason = reason;
            ticket.RefundAmount = 0;
            ticket.UpdatedAt = DateTime.UtcNow;
            ticket.UpdatedBy = cancelledBy;
        }

        // Trả lại số lượng vé cho từng loại vé trong đơn
        var orderItems = await _context.OrderItems.Where(oi => oi.OrderId == order.Id).ToListAsync();
        if (orderItems.Any())
        {
            foreach (var item in orderItems)
            {
                var ticketType = await _context.TicketTypes.FirstOrDefaultAsync(tt => tt.Id == item.TicketTypeId);
                if (ticketType != null)
                {
                    ticketType.RemainingQuantity += item.Quantity;
                    ticketType.UpdatedAt = DateTime.UtcNow;
                    ticketType.UpdatedBy = cancelledBy;
                }
            }
        }
        else
        {
            var ticketType = await _context.TicketTypes.FirstOrDefaultAsync(tt => tt.Id == order.TicketTypeId);
            if (ticketType != null)
            {
                ticketType.RemainingQuantity += order.Quantity;
                ticketType.UpdatedAt = DateTime.UtcNow;
                ticketType.UpdatedBy = cancelledBy;
            }
        }

        _context.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid(),
            Action = "CancelOrder",
            EntityType = "Order",
            EntityId = order.Id,
            PerformedBy = cancelledBy,
            Timestamp = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = cancelledBy,
            Details = $"Order cancelled by admin/staff. Reason: {reason}"
        });

        await _context.SaveChangesAsync();

        return new CancelOrderResponseDto
        {
            Success = true,
            Message = "Order cancelled successfully",
            RefundAmount = 0,
            CancelledAt = order.CancelRequestAt
        };
    }

    public async Task<MyTicketsResponseDto> GetUserTicketsAsync(Guid userId)
    {
        var tickets = await _context.Tickets
            .Include(t => t.Order)
            .ThenInclude(o => o.Payments)
            .Where(t => t.Order != null && t.Order.CustomerId == userId)
            .Include(t => t.TicketType)
            .ThenInclude(tt => tt.Event)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        var ticketDtos = tickets.Select(t => new TicketResponseDto
        {
            Id = t.Id,
            EventName = t.TicketType?.Event?.Name ?? "Unknown Event",
            TicketTypeName = t.TicketType?.Name ?? "Unknown Type",
            QrCode = t.SecretKey,
            Status = MapTicketUiStatus(t),
            StatusName = GetTicketStatusName(MapTicketUiStatus(t)),
            CreatedAt = t.CreatedAt,
            EventId = t.TicketType?.EventId ?? Guid.Empty,
            OrderId = t.OrderId ?? Guid.Empty,
            GroupSize = t.GroupSize,
            RemainingSlots = t.RemainingSlots,
            AccessType = (int)(t.TicketType?.AccessType ?? TicketAccessType.ONE_TIME),
            LastCheckInDate = t.LastCheckInDate // THÊM MỚI: để FE tự tính đếm ngược tới ngày mai
        }).ToList();

        return new MyTicketsResponseDto
        {
            Tickets = ticketDtos,
            TotalCount = ticketDtos.Count
        };
    }

    public async Task<bool> CancelTicketAsync(Guid ticketId, Guid userId)
    {
        var ticket = await _context.Tickets
            .Include(t => t.Order)
            .FirstOrDefaultAsync(t => t.Id == ticketId);

        if (ticket == null)
        {
            throw new Exception("Ticket not found");
        }

        if (ticket.Order?.CustomerId != userId)
        {
            throw new Exception("Unauthorized to cancel this ticket");
        }

        if (ticket.Status != TicketStatus.ACTIVE)
        {
            throw new Exception("Only active tickets can be cancelled");
        }

        ticket.Status = TicketStatus.CANCELLED;
        ticket.UpdatedAt = DateTime.UtcNow;
        ticket.UpdatedBy = userId.ToString();

        var ticketType = await _context.TicketTypes.FirstOrDefaultAsync(tt => tt.Id == ticket.TicketTypeId);
        if (ticketType != null)
        {
            ticketType.RemainingQuantity += 1;
            ticketType.UpdatedAt = DateTime.UtcNow;
            ticketType.UpdatedBy = userId.ToString();
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<PagedOrdersResponseDto> GetUserOrdersAsync(Guid userId, int pageNumber = 1, int pageSize = 10, int? paymentStatus = null)
    {
        var query = _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.Event)
            .Include(o => o.TicketType)
            .Include(o => o.Payments)
            .Include(o => o.OrderItems).ThenInclude(oi => oi.TicketType)
            .Where(o => o.CustomerId == userId)
            .AsQueryable();

        if (paymentStatus.HasValue)
        {
            query = query.Where(o => o.Payments.Any(p => (int)p.PaymentStatus == paymentStatus.Value));
        }

        var totalCount = await query.CountAsync();

        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedOrdersResponseDto
        {
            Items = orders.Select(MapOrderToDto).ToList(),
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize
        };
    }

    public async Task<PagedOrdersResponseDto> GetAdminOrdersAsync(int pageNumber = 1, int pageSize = 10, string? search = null, int? paymentStatus = null, int? orderStatus = null, Guid? eventId = null)
    {
        var query = _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.Event)
            .Include(o => o.TicketType)
            .Include(o => o.Payments)
            .Include(o => o.OrderItems).ThenInclude(oi => oi.TicketType)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalized = search.Trim().ToLower();
            query = query.Where(o =>
                o.Id.ToString().ToLower().Contains(normalized) ||
                o.Customer.Username.ToLower().Contains(normalized) ||
                o.Customer.FullName.ToLower().Contains(normalized) ||
                o.Event.Name.ToLower().Contains(normalized));
        }

        if (paymentStatus.HasValue)
        {
            query = query.Where(o => o.Payments.Any(p => (int)p.PaymentStatus == paymentStatus.Value));
        }

        if (orderStatus.HasValue)
        {
            query = query.Where(o => (int)o.OrderStatus == orderStatus.Value);
        }

        if (eventId.HasValue)
        {
            query = query.Where(o => o.EventId == eventId.Value);
        }

        var totalCount = await query.CountAsync();

        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedOrdersResponseDto
        {
            Items = orders.Select(MapOrderToDto).ToList(),
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize
        };
    }

    public async Task<OrderResponseDto?> GetOrderDetailAsync(Guid orderId, Guid? userId = null, bool isAdmin = false)
    {
        var query = _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.Event)
            .Include(o => o.TicketType)
            .Include(o => o.Payments)
            .Include(o => o.OrderItems).ThenInclude(oi => oi.TicketType)
            .Where(o => o.Id == orderId)
            .AsQueryable();

        if (!isAdmin && userId.HasValue)
        {
            query = query.Where(o => o.CustomerId == userId.Value);
        }

        var order = await query.FirstOrDefaultAsync();
        return order == null ? null : MapOrderToDto(order);
    }

    private static string GetTicketStatusName(int status)
    {
        return status switch
        {
            0 => "Pending",
            1 => "Paid",
            2 => "CheckedIn",
            3 => "Cancelled",
            4 => "Revoked",
            _ => "Unknown"
        };
    }

    private static int MapTicketUiStatus(Ticket ticket)
    {
        if (ticket.Status == TicketStatus.REVOKED) return 4;
        if (ticket.Status == TicketStatus.CANCELLED) return 3;
        if (ticket.Status == TicketStatus.CHECKED_IN) return 2;

        var latestPayment = ticket.Order?.Payments?.OrderByDescending(p => p.CreatedAt).FirstOrDefault();
        if (latestPayment?.PaymentStatus == PaymentStatus.Completed) return 1;

        return 0;
    }

    private static string GetPaymentStatusName(PaymentStatus status)
    {
        return status switch
        {
            PaymentStatus.Pending => "Pending",
            PaymentStatus.Completed => "Completed",
            PaymentStatus.Failed => "Failed",
            PaymentStatus.Cancelled => "Cancelled",
            _ => "Pending"
        };
    }

    private static string GetOrderStatusName(OrderStatus status)
    {
        return status switch
        {
            OrderStatus.Pending => "Pending",
            OrderStatus.Confirmed => "Confirmed",
            OrderStatus.Cancelled => "Cancelled",
            _ => "Pending"
        };
    }

    private static OrderResponseDto MapOrderToDto(Order order)
    {
        var latestPayment = order.Payments
            .OrderByDescending(p => p.CreatedAt)
            .FirstOrDefault();

        return new OrderResponseDto
        {
            Id = order.Id,
            UserId = order.CustomerId,
            BuyerName = order.Customer?.FullName ?? string.Empty,
            BuyerUsername = order.Customer?.Username ?? string.Empty,
            EventId = order.EventId,
            EventName = order.Event?.Name ?? string.Empty,
            TotalPrice = order.TotalPrice,
            OrderStatus = (int)order.OrderStatus,
            OrderStatusName = GetOrderStatusName(order.OrderStatus),
            Quantity = order.Quantity,
            TicketTypeId = order.TicketTypeId,
            TicketTypeName = order.TicketType?.Name ?? string.Empty,
            PaymentStatus = (int)(latestPayment?.PaymentStatus ?? PaymentStatus.Pending),
            PaymentStatusName = GetPaymentStatusName(latestPayment?.PaymentStatus ?? PaymentStatus.Pending),
            ConfirmedAt = order.ConfirmedAt,
            ConfirmedBy = order.ConfirmedBy,
            RefundAmount = order.RefundAmount,
            RefundStatus = (int)order.RefundStatus,
            CreatedAt = order.CreatedAt,
            Items = order.OrderItems
                .Select(oi => new OrderItemResponseDto
                {
                    TicketTypeId = oi.TicketTypeId,
                    TicketTypeName = oi.TicketType?.Name ?? string.Empty,
                    Quantity = oi.Quantity,
                    MemberCount = oi.MemberCount,
                    UnitPrice = oi.UnitPrice,
                    Subtotal = oi.Subtotal
                })
                .ToList(),
            Payments = order.Payments
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new PaymentResponseDto
                {
                    Id = p.Id,
                    Amount = p.Amount,
                    PaymentMethod = (int)p.PaymentMethod,
                    PaymentMethodName = p.PaymentMethod.ToString(),
                    PaymentStatus = (int)p.PaymentStatus,
                    PaymentStatusName = GetPaymentStatusName(p.PaymentStatus),
                    TransactionReference = p.TransactionReference,
                    PaidAt = p.PaidAt,
                    CreatedAt = p.CreatedAt
                })
                .ToList()
        };
    }

    private async Task SendTicketConfirmationNotificationAsync(Order order)
    {
        try
        {
            var frontendBaseUrl = _configuration["Frontend:BaseUrl"]?.TrimEnd('/') ?? "http://localhost:5173";
            var ticketLink = $"{frontendBaseUrl}/customer/my-tickets?orderId={order.Id}";

            var dto = new TicketConfirmationDto
            {
                CustomerName = order.BuyerName ?? order.Customer?.FullName ?? "Khách hàng",
                Email = order.Customer?.Email ?? string.Empty,
                Phone = order.BuyerPhone,
                OrderId = order.Id,
                EventName = order.Event?.Name ?? string.Empty,
                TotalPrice = order.TotalPrice,
                TicketLink = ticketLink
            };

            if (!string.IsNullOrWhiteSpace(dto.Email))
            {
                await _notificationService.SendTicketConfirmationAsync(dto);
            }
        }
        catch
        {
            // Gửi thông báo thất bại không được làm hỏng luồng xác nhận thanh toán,
            // nên nuốt lỗi ở đây (đã log chi tiết bên trong từng service con rồi).
        }
    }
}