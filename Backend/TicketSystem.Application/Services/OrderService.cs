using Microsoft.EntityFrameworkCore;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Interfaces;
using TicketSystem.Domain.Common;
using TicketSystem.Domain.Entities;

namespace TicketSystem.Application.Services;

public class OrderService : IOrderService
{
    private readonly IApplicationDbContext _context;
    private readonly ICancelOrderService _cancelOrderService;

    public OrderService(IApplicationDbContext context, ICancelOrderService cancelOrderService)
    {
        _context = context;
        _cancelOrderService = cancelOrderService;
    }

    public async Task<CreateOrderResponseDto> CreateOrderAsync(Guid userId, CreateOrderDto createOrderDto, string createdBy)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) throw new Exception("User not found");

        var eventEntity = await _context.Events.FirstOrDefaultAsync(e => e.Id == createOrderDto.EventId);
        if (eventEntity == null) throw new Exception("Event not found");
        if (eventEntity.IsFull()) throw new Exception("Event is at full capacity");

        var ticketType = await _context.TicketTypes.FirstOrDefaultAsync(tt => tt.Id == createOrderDto.TicketTypeId);
        if (ticketType == null) throw new Exception("Ticket type not found");
        if (ticketType.RemainingQuantity < createOrderDto.Quantity)
            throw new Exception($"Only {ticketType.RemainingQuantity} tickets available");

        var totalPrice = ticketType.Price * createOrderDto.Quantity;

        if ((int)ticketType.TicketMode == 2 && (int?)ticketType.PriceMode == 1)
        {
            totalPrice = ticketType.Price * createOrderDto.Quantity * createOrderDto.MemberCount;
        }

        var order = new Order
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            EventId = createOrderDto.EventId,
            TicketTypeId = createOrderDto.TicketTypeId,
            TotalPrice = totalPrice,
            Quantity = createOrderDto.Quantity,
            OrderStatus = OrderStatus.Pending,
            BuyerName = createOrderDto.BuyerName ?? user.FullName,
            BuyerPhone = createOrderDto.BuyerPhone ?? user.PhoneNumber,
            BuyerCccd = createOrderDto.BuyerCccd,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = createdBy
        };

        _context.Orders.Add(order);

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
        
        // Đọc cấu hình QrMode từ CSDL (Mặc định là 1 nếu null)
       var currentQrMode = ticketType.QRMode ?? QRMode.SINGLE_QR;
        
        int totalTicketsToGenerate = createOrderDto.Quantity;
        int slotsPerTicket = createOrderDto.MemberCount;

        // Xử lý Mode 2: Tách vé lẻ cho Đoàn
        if (currentQrMode == QRMode.SUB_QR && createOrderDto.MemberCount > 1)
        {
            totalTicketsToGenerate = createOrderDto.Quantity * createOrderDto.MemberCount;
            slotsPerTicket = 1; // Mỗi vé lẻ chỉ chứa 1 người
        }

        for (var i = 0; i < totalTicketsToGenerate; i++)
        {
            var ticketId = Guid.NewGuid();

            _context.Tickets.Add(new Ticket
            {
                Id = ticketId,
                TicketTypeId = createOrderDto.TicketTypeId,
                OrderId = order.Id,
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

        ticketType.RemainingQuantity -= createOrderDto.Quantity;
        ticketType.UpdatedAt = DateTime.UtcNow;
        ticketType.UpdatedBy = createdBy;

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
            .Include(o => o.User)
            .Include(o => o.Event)
            .Include(o => o.TicketType)
            .Include(o => o.Payments)
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order == null)
        {
            throw new Exception("Order not found");
        }

        if (order.UserId != userId)
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
        latestPayment.UpdatedBy = order.UserId.ToString();

        order.OrderStatus = OrderStatus.Confirmed;
        order.UpdatedAt = DateTime.UtcNow;
        order.UpdatedBy = order.UserId.ToString();

        await _context.SaveChangesAsync();

        return MapOrderToDto(order);
    }

    public async Task<OrderResponseDto> ConfirmOrderPaymentBySystemAsync(Guid orderId, string transactionReference = "")
    {
        var order = await _context.Orders
            .Include(o => o.User)
            .Include(o => o.Event)
            .Include(o => o.TicketType)
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

        return MapOrderToDto(order);
    }

    public async Task<OrderResponseDto> ConfirmCounterPaymentByAdminAsync(Guid orderId, string confirmedBy)
    {
        var order = await _context.Orders
            .Include(o => o.User)
            .Include(o => o.Event)
            .Include(o => o.TicketType)
            .Include(o => o.Payments)
            .Include(o => o.Tickets)
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

        if (latestPayment.PaymentMethod != PaymentMethod.Counter)
        {
            throw new Exception("This endpoint is only for Counter payment method");
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
        latestPayment.TransactionReference = $"COUNTER-{DateTime.UtcNow:yyyyMMddHHmmss}";
        latestPayment.UpdatedAt = DateTime.UtcNow;
        latestPayment.UpdatedBy = confirmedBy;

        order.OrderStatus = OrderStatus.Confirmed;
        order.ConfirmedAt = DateTime.UtcNow;
        order.ConfirmedBy = confirmedBy;
        order.UpdatedAt = DateTime.UtcNow;
        order.UpdatedBy = confirmedBy;

        // Đảm bảo luôn có đủ vé theo số lượng order (fallback nếu thiếu dữ liệu cũ)
        var missingTickets = Math.Max(0, order.Quantity - order.Tickets.Count);
        for (var i = 0; i < missingTickets; i++)
        {
            var ticketId = Guid.NewGuid();
            _context.Tickets.Add(new Ticket
            {
                Id = ticketId,
                TicketTypeId = order.TicketTypeId,
                ValidFrom = order.Event.StartTime, 
                ValidTo = order.Event.EndTime,
                SecretKey = TicketSystem.Application.Utils.Base32Generator.Generate(16),
                Status = TicketStatus.ACTIVE,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = confirmedBy
            });
        }

        _context.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid(),
            Action = "ConfirmCounterPayment",
            EntityType = "Order",
            EntityId = order.Id,
            PerformedBy = confirmedBy,
            Timestamp = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = confirmedBy,
            Details = $"Counter payment confirmed. PaymentStatus=Completed, OrderStatus=Confirmed"
        });

        await _context.SaveChangesAsync();

        return MapOrderToDto(order);
    }

    public async Task<OrderResponseDto> ConfirmOnlineOrderByAdminAsync(Guid orderId, string confirmedBy)
    {
        var order = await _context.Orders
            .Include(o => o.User)
            .Include(o => o.Event)
            .Include(o => o.TicketType)
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

        // Online đã thanh toán: hủy và hoàn theo policy hiện có.
        if (latestPayment.PaymentMethod != PaymentMethod.Counter && latestPayment.PaymentStatus == PaymentStatus.Completed)
        {
            return await _cancelOrderService.CancelOrderAsync(orderId, order.UserId, reason, cancelledBy);
        }

        // Counter hoặc chưa thanh toán: chỉ hủy đơn.
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

        var ticketType = await _context.TicketTypes.FirstOrDefaultAsync(tt => tt.Id == order.TicketTypeId);
        if (ticketType != null)
        {
            ticketType.RemainingQuantity += order.Quantity;
            ticketType.UpdatedAt = DateTime.UtcNow;
            ticketType.UpdatedBy = cancelledBy;
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
            .Where(t => t.Order != null && t.Order.UserId == userId)
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
            RemainingSlots = t.RemainingSlots
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

        if (ticket.Order?.UserId != userId)
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
            .Include(o => o.User)
            .Include(o => o.Event)
            .Include(o => o.TicketType)
            .Include(o => o.Payments)
            .Where(o => o.UserId == userId)
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

    public async Task<PagedOrdersResponseDto> GetAdminOrdersAsync(int pageNumber = 1, int pageSize = 10, string? search = null, int? paymentStatus = null, int? orderStatus = null)
    {
        var query = _context.Orders
            .Include(o => o.User)
            .Include(o => o.Event)
            .Include(o => o.TicketType)
            .Include(o => o.Payments)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalized = search.Trim().ToLower();
            query = query.Where(o =>
                o.Id.ToString().ToLower().Contains(normalized) ||
                o.User.Username.ToLower().Contains(normalized) ||
                o.User.FullName.ToLower().Contains(normalized) ||
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
            .Include(o => o.User)
            .Include(o => o.Event)
            .Include(o => o.TicketType)
            .Include(o => o.Payments)
            .Where(o => o.Id == orderId)
            .AsQueryable();

        if (!isAdmin && userId.HasValue)
        {
            query = query.Where(o => o.UserId == userId.Value);
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
        if (ticket.Status == TicketStatus.REVOKED)
        {
            return 4; 
        }

        if (ticket.Status == TicketStatus.CANCELLED)
        {
            return 3;
        }

        if (ticket.Status == TicketStatus.CHECKED_IN)
        {
            return 2;
        }

        var latestPayment = ticket.Order?.Payments?.OrderByDescending(p => p.CreatedAt).FirstOrDefault();
        if (latestPayment?.PaymentStatus == PaymentStatus.Completed)
        {
            return 1;
        }

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
            UserId = order.UserId,
            BuyerName = order.User?.FullName ?? string.Empty,
            BuyerUsername = order.User?.Username ?? string.Empty,
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
            CreatedAt = order.CreatedAt,
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
}
