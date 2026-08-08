using System;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Moq;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Interfaces;
using TicketSystem.Application.Services;
using TicketSystem.Domain.Common;
using TicketSystem.Domain.Entities;
using TicketType = TicketSystem.Domain.Entities.TicketType;
using TicketSystem.Tests.TestHelpers;
using Xunit;

namespace TicketSystem.Tests.Services
{
    public class OrderServiceTests
    {
        private readonly Mock<ICancelOrderService> _cancelOrderServiceMock = new();
        private readonly Mock<INotificationService> _notificationServiceMock = new();
        private readonly IConfiguration _configuration = new ConfigurationBuilder().Build();

        private OrderService CreateService(TestApplicationDbContext context)
        {
            return new OrderService(
                context,
                _cancelOrderServiceMock.Object,
                _notificationServiceMock.Object,
                _configuration);
        }

        /// <summary>
        /// Tạo sẵn 1 Customer + 1 Event + 1 TicketType để dùng chung cho các test.
        /// </summary>
        private static (Customer customer, Event evt, TicketType ticketType) SeedBasicData(
            TestApplicationDbContext context,
            int ticketPrice = 100000,
            int remainingQuantity = 10)
        {
            var customer = Customer.Create("khachhang01", "hashed", "Nguyen Van A", "a@test.com", "System");

            var evt = new Event
            {
                Id = Guid.NewGuid(),
                Name = "Sự kiện test",
                Location = "Hà Nội",
                StartTime = DateTime.UtcNow.AddDays(5),
                EndTime = DateTime.UtcNow.AddDays(6),
                MaxCapacity = 1000,
                CurrentOccupancy = 0,
                Status = EventStatus.Active,
                CancellationDeadlineHours = 48,
                CreatedBy = "System"
            };

            var ticketType = new TicketType
            {
                Id = Guid.NewGuid(),
                EventId = evt.Id,
                Name = "Vé thường",
                Price = ticketPrice,
                Quantity = remainingQuantity,
                RemainingQuantity = remainingQuantity,
                MaxPerUser = 10,
                TicketMode = TicketMode.INDIVIDUAL,
                SaleStartTime = DateTime.UtcNow.AddDays(-1),
                SaleEndTime = DateTime.UtcNow.AddDays(4),
                IsActive = true,
                CreatedBy = "System"
            };

            context.Customers.Add(customer);
            context.Events.Add(evt);
            context.TicketTypes.Add(ticketType);
            context.SaveChanges();

            return (customer, evt, ticketType);
        }

        // ============ TEST: CreateOrderAsync ============

        [Fact]
        public async Task CreateOrderAsync_ShouldCalculateTotalPriceCorrectly_AndGenerateCorrectTicketCount()
        {
            // Arrange
            using var context = TestDbContextFactory.Create();
            var (customer, evt, ticketType) = SeedBasicData(context, ticketPrice: 150000, remainingQuantity: 20);
            var service = CreateService(context);

            var dto = new CreateOrderDto
            {
                EventId = evt.Id,
                PaymentMethod = 1, // VNPAY
                Items = new()
                {
                    new CreateOrderItemDto { TicketTypeId = ticketType.Id, Quantity = 3, MemberCount = 1 }
                }
            };

            // Act
            var result = await service.CreateOrderAsync(customer.Id, dto, "khachhang01");

            // Assert
            result.TotalPrice.Should().Be(450000); // 150000 * 3
            result.OrderId.Should().NotBeEmpty();

            var ticketsInDb = context.Tickets.Where(t => t.OrderId == result.OrderId).ToList();
            ticketsInDb.Should().HaveCount(3, "vì mua 3 vé cá nhân thì phải sinh đúng 3 vé riêng biệt");

            var updatedTicketType = context.TicketTypes.First(tt => tt.Id == ticketType.Id);
            updatedTicketType.RemainingQuantity.Should().Be(17, "20 vé ban đầu - 3 vé vừa mua = 17");

            var orderInDb = context.Orders.First(o => o.Id == result.OrderId);
            orderInDb.OrderStatus.Should().Be(OrderStatus.Pending, "đơn mới tạo phải ở trạng thái Pending, chưa thanh toán");

            var paymentInDb = context.Payments.First(p => p.OrderId == result.OrderId);
            paymentInDb.PaymentStatus.Should().Be(PaymentStatus.Pending);
            paymentInDb.Amount.Should().Be(450000);
        }

        [Fact]
        public async Task CreateOrderAsync_ShouldThrow_WhenNotEnoughRemainingTickets()
        {
            // Arrange
            using var context = TestDbContextFactory.Create();
            var (customer, evt, ticketType) = SeedBasicData(context, ticketPrice: 100000, remainingQuantity: 2);
            var service = CreateService(context);

            var dto = new CreateOrderDto
            {
                EventId = evt.Id,
                PaymentMethod = 1,
                Items = new()
                {
                    new CreateOrderItemDto { TicketTypeId = ticketType.Id, Quantity = 5, MemberCount = 1 } // đặt 5 nhưng chỉ còn 2
                }
            };

            // Act
            var act = async () => await service.CreateOrderAsync(customer.Id, dto, "khachhang01");

            // Assert
            await act.Should().ThrowAsync<Exception>()
                .WithMessage("*chỉ còn 2*".Replace("chỉ còn 2", "Only 2")); // message thực tế: "Only 2 tickets available..."
        }

        [Fact]
        public async Task CreateOrderAsync_ShouldThrow_WhenEventNotFound()
        {
            // Arrange
            using var context = TestDbContextFactory.Create();
            var (customer, _, ticketType) = SeedBasicData(context);
            var service = CreateService(context);

            var dto = new CreateOrderDto
            {
                EventId = Guid.NewGuid(), // event không tồn tại
                PaymentMethod = 1,
                Items = new()
                {
                    new CreateOrderItemDto { TicketTypeId = ticketType.Id, Quantity = 1, MemberCount = 1 }
                }
            };

            // Act
            var act = async () => await service.CreateOrderAsync(customer.Id, dto, "khachhang01");

            // Assert
            await act.Should().ThrowAsync<Exception>().WithMessage("*Event not found*");
        }

        // ============ TEST: ConfirmOrderPaymentBySystemAsync (webhook VNPay) ============

        [Fact]
        public async Task ConfirmOrderPaymentBySystemAsync_ShouldMarkPaymentCompletedAndOrderConfirmed()
        {
            // Arrange
            using var context = TestDbContextFactory.Create();
            var (customer, evt, ticketType) = SeedBasicData(context);
            var service = CreateService(context);

            var createDto = new CreateOrderDto
            {
                EventId = evt.Id,
                PaymentMethod = 1,
                Items = new()
                {
                    new CreateOrderItemDto { TicketTypeId = ticketType.Id, Quantity = 2, MemberCount = 1 }
                }
            };
            var createdOrder = await service.CreateOrderAsync(customer.Id, createDto, "khachhang01");

            // Act — mô phỏng VNPay gọi webhook báo thanh toán thành công
            var result = await service.ConfirmOrderPaymentBySystemAsync(createdOrder.OrderId, "VNP-TXN-12345");

            // Assert
            result.OrderStatus.Should().Be((int)OrderStatus.Confirmed);

            var paymentInDb = context.Payments.First(p => p.OrderId == createdOrder.OrderId);
            paymentInDb.PaymentStatus.Should().Be(PaymentStatus.Completed);
            paymentInDb.TransactionReference.Should().Be("VNP-TXN-12345");
            paymentInDb.PaidAt.Should().NotBeNull();

            var orderInDb = context.Orders.First(o => o.Id == createdOrder.OrderId);
            orderInDb.OrderStatus.Should().Be(OrderStatus.Confirmed);
        }

        [Fact]
        public async Task ConfirmOrderPaymentBySystemAsync_ShouldNotChangeTotalPrice_NoDataMismatch()
        {
            // Arrange — kiểm tra không có sai lệch số liệu giữa lúc tạo đơn và lúc xác nhận thanh toán
            using var context = TestDbContextFactory.Create();
            var (customer, evt, ticketType) = SeedBasicData(context, ticketPrice: 250000);
            var service = CreateService(context);

            var createDto = new CreateOrderDto
            {
                EventId = evt.Id,
                PaymentMethod = 1,
                Items = new()
                {
                    new CreateOrderItemDto { TicketTypeId = ticketType.Id, Quantity = 4, MemberCount = 1 }
                }
            };
            var createdOrder = await service.CreateOrderAsync(customer.Id, createDto, "khachhang01");
            var expectedTotal = createdOrder.TotalPrice; // 250000 * 4 = 1,000,000

            // Act
            await service.ConfirmOrderPaymentBySystemAsync(createdOrder.OrderId, "VNP-TXN-99999");

            // Assert — số tiền trong Order và Payment phải khớp tuyệt đối, không lệch
            var orderInDb = context.Orders.First(o => o.Id == createdOrder.OrderId);
            var paymentInDb = context.Payments.First(p => p.OrderId == createdOrder.OrderId);

            orderInDb.TotalPrice.Should().Be(expectedTotal);
            paymentInDb.Amount.Should().Be(expectedTotal);
            orderInDb.TotalPrice.Should().Be(paymentInDb.Amount, "tiền trong Order và Payment phải khớp nhau tuyệt đối");
        }

        [Fact]
        public async Task ConfirmOrderPaymentBySystemAsync_ShouldThrow_WhenOrderNotFound()
        {
            using var context = TestDbContextFactory.Create();
            var service = CreateService(context);

            var act = async () => await service.ConfirmOrderPaymentBySystemAsync(Guid.NewGuid(), "TXN-XXX");

            await act.Should().ThrowAsync<Exception>().WithMessage("*Order not found*");
        }
    }
}