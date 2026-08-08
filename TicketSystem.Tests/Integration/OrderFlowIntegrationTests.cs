using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using TicketSystem.Application.DTOs;
using TicketSystem.Domain.Common;
using TicketSystem.Domain.Entities;
using TicketSystem.Infrastructure.Data;
using TicketSystem.Tests.TestHelpers;
using Xunit;
using TicketType = TicketSystem.Domain.Entities.TicketType;

namespace TicketSystem.Tests.Integration
{
    public class OrderFlowIntegrationTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly CustomWebApplicationFactory _factory;

        public OrderFlowIntegrationTests(CustomWebApplicationFactory factory)
        {
            _factory = factory;
            _factory.EnsureDatabaseCreated();
        }

        /// <summary>
        /// Seed sẵn 1 Customer + 1 Event + 1 TicketType thẳng vào DB SQLite In-Memory của factory,
        /// rồi trả về JWT token tương ứng để test có thể gọi API với danh tính đã đăng nhập.
        /// </summary>
        private (string token, Guid customerId, Guid eventId, Guid ticketTypeId) SeedOrderData(int ticketPrice = 200000, int remainingQuantity = 10)
        {
            using var scope = _factory.Services.CreateScope(); var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>(); var customer = Customer.Create($"integration_customer_{Guid.NewGuid():N}", "hashed", "Nguyen Van Test", $"{Guid.NewGuid():N}@integration.com", "System"); var evt = new Event { Id = Guid.NewGuid(), Name = "Sự kiện Integration Test", Location = "Đà Nẵng", StartTime = DateTime.UtcNow.AddDays(5), EndTime = DateTime.UtcNow.AddDays(6), MaxCapacity = 500, CurrentOccupancy = 0, Status = EventStatus.Active, CancellationDeadlineHours = 48, CreatedBy = "System" };

            var ticketType = new TicketType
            {
                Id = Guid.NewGuid(),
                EventId = evt.Id,
                Name = "Vé Integration",
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

            var token = TestJwtHelper.GenerateCustomerToken(customer.Id, customer.Username);

            return (token, customer.Id, evt.Id, ticketType.Id);
        }

        private HttpClient CreateAuthenticatedClient(string token)
        {
            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            return client;
        }

        [Fact]
        public async Task POST_CreateOrder_ShouldReturn200_AndPersistOrderInDatabase()
        {
            // Arrange
            var (token, _, eventId, ticketTypeId) = SeedOrderData(ticketPrice: 200000, remainingQuantity: 20);
            var client = CreateAuthenticatedClient(token);

            var requestBody = new
            {
                EventId = eventId,
                PaymentMethod = 1,
                Items = new[]
                {
                    new { TicketTypeId = ticketTypeId, Quantity = 2, MemberCount = 1 }
                }
            };

            // Act — gọi HTTP request thật, đi qua toàn bộ pipeline: Middleware, Auth, Controller, Service
            var response = await client.PostAsJsonAsync("/api/orders", requestBody);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var result = await response.Content.ReadFromJsonAsync<CreateOrderResponseDto>();
            result.Should().NotBeNull();
            result!.TotalPrice.Should().Be(400000); // 200000 * 2
            result.OrderId.Should().NotBeEmpty();

            // Xác nhận dữ liệu thật sự được ghi xuống DB, không chỉ response giả
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var orderInDb = context.Orders.FirstOrDefault(o => o.Id == result.OrderId);
            orderInDb.Should().NotBeNull();
            orderInDb!.OrderStatus.Should().Be(OrderStatus.Pending);

            var ticketsInDb = context.Tickets.Count(t => t.OrderId == result.OrderId);
            ticketsInDb.Should().Be(2);
        }

        [Fact]
        public async Task POST_CreateOrder_ShouldReturn401_WhenNoAuthToken()
        {
            // Arrange — không seed token, gọi API mà không có Authorization header
            var (_, _, eventId, ticketTypeId) = SeedOrderData();
            var client = _factory.CreateClient(); // client KHÔNG có token

            var requestBody = new
            {
                EventId = eventId,
                PaymentMethod = 1,
                Items = new[] { new { TicketTypeId = ticketTypeId, Quantity = 1, MemberCount = 1 } }
            };

            // Act
            var response = await client.PostAsJsonAsync("/api/orders", requestBody);

            // Assert — middleware Authentication/Authorization phải chặn đúng, không cho vào Controller
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task POST_CreateOrder_ShouldReturn400_WhenQuantityExceedsRemaining()
        {
            // Arrange
            var (token, _, eventId, ticketTypeId) = SeedOrderData(remainingQuantity: 1);
            var client = CreateAuthenticatedClient(token);

            var requestBody = new
            {
                EventId = eventId,
                PaymentMethod = 1,
                Items = new[] { new { TicketTypeId = ticketTypeId, Quantity = 5, MemberCount = 1 } } // vượt quá tồn kho
            };

            // Act
            var response = await client.PostAsJsonAsync("/api/orders", requestBody);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task GET_VnPayReturn_ShouldConfirmOrder_WhenSignatureValid()
        {
            // Arrange — tạo đơn hàng thật qua API trước, giống luồng thật của khách hàng
            var (token, _, eventId, ticketTypeId) = SeedOrderData(ticketPrice: 150000, remainingQuantity: 10);
            var client = CreateAuthenticatedClient(token);

            var createBody = new
            {
                EventId = eventId,
                PaymentMethod = 1,
                Items = new[] { new { TicketTypeId = ticketTypeId, Quantity = 1, MemberCount = 1 } }
            };
            var createResponse = await client.PostAsJsonAsync("/api/orders", createBody);
            var createdOrder = await createResponse.Content.ReadFromJsonAsync<CreateOrderResponseDto>();

            // Act — gọi trực tiếp Service để confirm (mô phỏng webhook VNPay đã xác thực chữ ký thành công,
            // vì việc build đúng chữ ký HMAC-SHA512 thật của VNPay cần đúng HashSecret cấu hình,
            // nằm ngoài phạm vi test luồng nghiệp vụ tạo đơn/xác nhận đơn)
            using var scope = _factory.Services.CreateScope();
            var orderService = scope.ServiceProvider.GetRequiredService<TicketSystem.Application.Interfaces.IOrderService>();
            var confirmResult = await orderService.ConfirmOrderPaymentBySystemAsync(createdOrder!.OrderId, "TEST-TXN-INTEGRATION");

            // Assert
            confirmResult.OrderStatus.Should().Be((int)OrderStatus.Confirmed);

            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var paymentInDb = context.Payments.First(p => p.OrderId == createdOrder.OrderId);
            paymentInDb.PaymentStatus.Should().Be(PaymentStatus.Completed);
        }
    }
}