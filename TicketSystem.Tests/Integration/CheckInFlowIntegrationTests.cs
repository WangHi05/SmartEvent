using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using OtpNet;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Utils;
using TicketSystem.Domain.Common;
using TicketSystem.Domain.Entities;
using TicketSystem.Infrastructure.Data;
using TicketSystem.Tests.TestHelpers;
using Xunit;
using TicketType = TicketSystem.Domain.Entities.TicketType;

namespace TicketSystem.Tests.Integration
{
    /// <summary>
    /// Test luồng check-in QR đi qua HTTP thật (Middleware, Auth, Controller, Service, DB)
    /// giống hệt cách VNPay/Frontend gọi API thật — dùng chung CustomWebApplicationFactory
    /// với OrderFlowIntegrationTests (SQLite In-Memory).
    /// </summary>
    public class CheckInFlowIntegrationTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly CustomWebApplicationFactory _factory;
        private const string ValidGateName = "Cổng chính - Lối vào 1";

        public CheckInFlowIntegrationTests(CustomWebApplicationFactory factory)
        {
            _factory = factory;
            _factory.EnsureDatabaseCreated();
        }

        /// <summary>
        /// Seed 1 vé ACTIVE trực tiếp vào DB của factory. mode=INDIVIDUAL cho khách lẻ (Mode 2),
        /// mode=GROUP + groupSize > 1 cho vé đoàn (Mode 1).
        /// </summary>
        private Ticket SeedActiveTicket(TicketMode mode = TicketMode.INDIVIDUAL, int groupSize = 1, int remainingSlots = 1)
        {
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var now = DateTime.UtcNow;
            var customer = Customer.Create($"checkin_{Guid.NewGuid():N}", "hash", "Nguyen Van Checkin",
                $"{Guid.NewGuid():N}@test.com", "System");

            var evt = new Event
            {
                Id = Guid.NewGuid(),
                Name = "Sự kiện Checkin Integration",
                Location = "Hà Nội",
                StartTime = now.AddHours(-2),
                EndTime = now.AddHours(4),
                MaxCapacity = 500,
                CurrentOccupancy = 0,
                Status = EventStatus.Ongoing,
                CancellationDeadlineHours = 24,
                CreatedBy = "System"
            };

            var ticketType = new TicketType
            {
                Id = Guid.NewGuid(),
                EventId = evt.Id,
                Name = "Vé Checkin Test",
                Price = 100000,
                Quantity = 100,
                RemainingQuantity = 99,
                MaxPerUser = 10,
                TicketMode = mode,
                SaleStartTime = now.AddDays(-2),
                SaleEndTime = now.AddDays(2),
                IsActive = true,
                CreatedBy = "System"
            };

            var order = new Order
            {
                Id = Guid.NewGuid(),
                CustomerId = customer.Id,
                EventId = evt.Id,
                TicketTypeId = ticketType.Id,
                Quantity = 1,
                TotalPrice = 100000,
                OrderStatus = OrderStatus.Confirmed,
                CreatedBy = "System"
            };

            var ticket = new Ticket
            {
                Id = Guid.NewGuid(),
                TicketTypeId = ticketType.Id,
                OrderId = order.Id,
                SecretKey = Base32Generator.Generate(16),
                Status = TicketStatus.ACTIVE,
                IsCheckedIn = false,
                ValidFrom = now.AddHours(-2),
                ValidTo = now.AddHours(4),
                GroupSize = groupSize,
                RemainingSlots = remainingSlots,
                CreatedBy = "System"
            };

            context.Customers.Add(customer);
            context.Events.Add(evt);
            context.TicketTypes.Add(ticketType);
            context.Orders.Add(order);
            context.Tickets.Add(ticket);
            context.SaveChanges();

            return ticket;
        }

        private static string ComputeValidOtp(Ticket ticket)
        {
            var totp = new Totp(Base32Encoding.ToBytes(ticket.SecretKey));
            return totp.ComputeTotp();
        }

        private HttpClient CreateStaffClient()
        {
            var client = _factory.CreateClient();
            var token = TestJwtHelper.GenerateStaffToken();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            return client;
        }

        [Fact]
        public async Task POST_ScanTicket_ShouldReturn200_OnFirstValidScan()
        {
            var ticket = SeedActiveTicket();
            var client = CreateStaffClient();
            var otp = ComputeValidOtp(ticket);

            var response = await client.PostAsJsonAsync("/api/checkin/scan", new
            {
                QrPayload = $"{ticket.Id}|{otp}",
                PeopleCount = 1,
                GateName = ValidGateName
            });

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<CheckInResponse>();
            result!.IsSuccess.Should().BeTrue();

            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var ticketInDb = context.Tickets.First(t => t.Id == ticket.Id);
            ticketInDb.Status.Should().Be(TicketStatus.CHECKED_IN);
            ticketInDb.RemainingSlots.Should().Be(0);
        }

        /// <summary>
        /// Tái hiện đúng tình huống: quét cùng 1 QR 2 lần liên tiếp (nhân viên bấm nhầm 2 lần,
        /// hoặc app gửi lại request) -> lần 2 PHẢI bị từ chối, không được check-in thêm.
        /// </summary>
        [Fact]
        public async Task POST_ScanTicket_ShouldReturnCachedSuccess_WhenSameTicketScannedTwiceImmediately()
        {
            var ticket = SeedActiveTicket();
            var client = CreateStaffClient();
            var otp = ComputeValidOtp(ticket);

            var payload = new
            {
                QrPayload = $"{ticket.Id}|{otp}",
                PeopleCount = 1,
                GateName = ValidGateName
            };

            // Lần 1: check-in thật
            var firstResponse = await client.PostAsJsonAsync("/api/checkin/scan", payload);
            firstResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            var firstResult = await firstResponse.Content.ReadFromJsonAsync<CheckInResponse>();

            // Lần 2: gửi lại y hệt ngay sau đó (mô phỏng bấm nhầm/network lag gửi lại request)
            // -> hệ thống trả về ĐÚNG response đã cache từ lần 1, KHÔNG xử lý logic lần nữa
            var secondResponse = await client.PostAsJsonAsync("/api/checkin/scan", payload);
            secondResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            var secondResult = await secondResponse.Content.ReadFromJsonAsync<CheckInResponse>();

            secondResult!.Message.Should().Be(firstResult!.Message, "request trùng lặp trong 30s phải lấy từ cache, không xử lý lại logic");

            // Quan trọng nhất: DB không được trừ RemainingSlots quá 1 lần
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var ticketInDb = context.Tickets.First(t => t.Id == ticket.Id);
            ticketInDb.RemainingSlots.Should().Be(0, "không được trừ RemainingSlots quá 1 lần cho cùng 1 request lặp lại");
        }

        /// <summary>
        /// Mô phỏng 2 cổng quét CÙNG 1 vé gần như đồng thời (race condition thật ngoài hiện trường).
        /// Chỉ 1 trong 2 request được phép thành công.
        /// </summary>
        [Fact]
        public async Task POST_ScanTicket_OnlyOneShouldSucceed_WhenScannedConcurrentlyFromTwoGates()
        {
            var ticket = SeedActiveTicket();
            var otp = ComputeValidOtp(ticket);

            var payload = new
            {
                QrPayload = $"{ticket.Id}|{otp}",
                PeopleCount = 1,
                GateName = ValidGateName
            };

            var clientGateA = CreateStaffClient();
            var clientGateB = CreateStaffClient();

            var taskA = clientGateA.PostAsJsonAsync("/api/checkin/scan", payload);
            var taskB = clientGateB.PostAsJsonAsync("/api/checkin/scan", payload);
            var responses = await Task.WhenAll(taskA, taskB);

            var successCount = 0;
            foreach (var res in responses)
            {
                var body = await res.Content.ReadFromJsonAsync<CheckInResponse>();
                if (body!.IsSuccess) successCount++;
            }

            successCount.Should().Be(1, "chỉ 1 trong 2 cổng được phép check-in thành công cho cùng 1 vé");

            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var ticketInDb = context.Tickets.First(t => t.Id == ticket.Id);
            ticketInDb.RemainingSlots.Should().Be(0);
            ticketInDb.Status.Should().Be(TicketStatus.CHECKED_IN);
        }

        [Fact]
        public async Task POST_ScanTicket_ShouldReturn401_WhenNoAuthToken()
        {
            var ticket = SeedActiveTicket();
            var client = _factory.CreateClient(); // không có token

            var response = await client.PostAsJsonAsync("/api/checkin/scan", new
            {
                QrPayload = $"{ticket.Id}|000000",
                PeopleCount = 1,
                GateName = ValidGateName
            });

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }
}