using System;
using System.Diagnostics;
using System.Threading.Tasks;
using FluentAssertions;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Moq;
using OtpNet;
using TicketSystem.Application.Common;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Events;
using TicketSystem.Application.Services;
using TicketSystem.Application.Utils;
using TicketSystem.Domain.Common;
using TicketSystem.Domain.Entities;
using TicketSystem.Tests.TestHelpers;
using Xunit;
using TicketType = TicketSystem.Domain.Entities.TicketType;

namespace TicketSystem.Tests.Services
{
    public class TicketCheckInServiceTests
    {
        private readonly Mock<IMediator> _mediatorMock = new();
        private readonly Mock<IHttpContextAccessor> _httpContextAccessorMock = new();
        private readonly Mock<ILogger<TicketCheckInService>> _loggerMock = new();

        private const string ValidGateName = "Cổng chính - Lối vào 1";

        private TicketCheckInService CreateService(TestApplicationDbContext context, IMemoryCache cache)
        {
            return new TicketCheckInService(
                context,
                _mediatorMock.Object,
                cache,
                _httpContextAccessorMock.Object,
                _loggerMock.Object);
        }

        /// <summary>
        /// Seed 1 vé ACTIVE hợp lệ, còn hạn sử dụng, gắn với 1 event đang diễn ra.
        /// </summary>
        private static Ticket SeedActiveTicket(
            TestApplicationDbContext context,
            TicketStatus status = TicketStatus.ACTIVE,
            bool isCheckedIn = false,
            int remainingSlots = 1)
        {
            // Dùng UtcNow để mô phỏng đúng cách dữ liệu được lưu thật trong DB (luôn là UTC).
            // VietnamTime.ToVietnamTime() bên trong service sẽ tự quy đổi UTC -> giờ VN khi so sánh.
            var now = DateTime.UtcNow;
            var customer = Customer.Create("khach01", "hash", "Tran Thi B", "b@test.com", "System");

            var evt = new Event
            {
                Id = Guid.NewGuid(),
                Name = "Sự kiện Check-in Test",
                Location = "TP.HCM",
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
                Name = "Vé thường",
                Price = 100000,
                Quantity = 100,
                RemainingQuantity = 99,
                MaxPerUser = 5,
                TicketMode = TicketMode.INDIVIDUAL,
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

            var secretKey = Base32Generator.Generate(16);

            var ticket = new Ticket
            {
                Id = Guid.NewGuid(),
                TicketTypeId = ticketType.Id,
                OrderId = order.Id,
                SecretKey = secretKey,
                Status = status,
                IsCheckedIn = isCheckedIn,
                ValidFrom = now.AddHours(-2),
                ValidTo = now.AddHours(4),
                GroupSize = 1,
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

        // ============ TEST: Quét thành công ============

        [Fact]
        public async Task ProcessScanAsync_ShouldSucceed_WhenTicketValidAndOtpCorrect()
        {
            // Arrange
            using var context = TestDbContextFactory.Create();
            using var cache = new MemoryCache(new MemoryCacheOptions());
            var ticket = SeedActiveTicket(context);
            var service = CreateService(context, cache);

            var otp = ComputeValidOtp(ticket);
            var request = new CheckInRequest
            {
                QrPayload = $"{ticket.Id}|{otp}",
                PeopleCount = 1,
                GateName = ValidGateName
            };

            // Act
            var result = await service.ProcessScanAsync(request, "staff01");

            // Assert
            result.IsSuccess.Should().BeTrue();

            var ticketInDb = context.Tickets.First(t => t.Id == ticket.Id);
            ticketInDb.RemainingSlots.Should().Be(0);
            ticketInDb.Status.Should().Be(TicketStatus.CHECKED_IN);
            ticketInDb.IsCheckedIn.Should().BeTrue();

            _mediatorMock.Verify(m => m.Publish(
                It.IsAny<TicketCheckedInEvent>(),
                It.IsAny<CancellationToken>()), Times.Once);
        }

        // ============ TEST: Phát hiện vé giả (QR/OTP sai) ============

        [Fact]
        public async Task ProcessScanAsync_ShouldFail_WhenOtpIsFake()
        {
            // Arrange
            using var context = TestDbContextFactory.Create();
            using var cache = new MemoryCache(new MemoryCacheOptions());
            var ticket = SeedActiveTicket(context);
            var service = CreateService(context, cache);

            var request = new CheckInRequest
            {
                QrPayload = $"{ticket.Id}|000000", // OTP giả, không khớp SecretKey thật
                PeopleCount = 1,
                GateName = ValidGateName
            };

            // Act
            var result = await service.ProcessScanAsync(request, "staff01");

            // Assert
            result.IsSuccess.Should().BeFalse();
            result.Message.Should().Contain("không hợp lệ");

            // Vé không được phép check-in khi OTP sai
            var ticketInDb = context.Tickets.First(t => t.Id == ticket.Id);
            ticketInDb.Status.Should().Be(TicketStatus.ACTIVE, "vé giả không được phép làm thay đổi trạng thái vé thật");
        }

        [Fact]
        public async Task ProcessScanAsync_ShouldFail_WhenQrFormatInvalid()
        {
            // Arrange
            using var context = TestDbContextFactory.Create();
            using var cache = new MemoryCache(new MemoryCacheOptions());
            var service = CreateService(context, cache);

            var request = new CheckInRequest
            {
                QrPayload = "chuoi-khong-dung-dinh-dang",
                PeopleCount = 1,
                GateName = ValidGateName
            };

            // Act
            var result = await service.ProcessScanAsync(request, "staff01");

            // Assert
            result.IsSuccess.Should().BeFalse();
            result.Message.Should().Contain("Định dạng QR không hợp lệ");
        }

        [Fact]
        public async Task ProcessScanAsync_ShouldFail_WhenTicketNotFound()
        {
            // Arrange
            using var context = TestDbContextFactory.Create();
            using var cache = new MemoryCache(new MemoryCacheOptions());
            var service = CreateService(context, cache);

            var request = new CheckInRequest
            {
                QrPayload = $"{Guid.NewGuid()}|123456",
                PeopleCount = 1,
                GateName = ValidGateName
            };

            // Act
            var result = await service.ProcessScanAsync(request, "staff01");

            // Assert
            result.IsSuccess.Should().BeFalse();
            result.Message.Should().Contain("Vé không tồn tại");
        }

        // ============ TEST: Phát hiện vé đã được sử dụng ============

        [Fact]
        public async Task ProcessScanAsync_ShouldFail_WhenTicketAlreadyCheckedIn()
        {
            // Arrange
            using var context = TestDbContextFactory.Create();
            using var cache = new MemoryCache(new MemoryCacheOptions());
            var ticket = SeedActiveTicket(context, status: TicketStatus.CHECKED_IN, isCheckedIn: true, remainingSlots: 0);
            var service = CreateService(context, cache);

            var otp = ComputeValidOtp(ticket);
            var request = new CheckInRequest
            {
                QrPayload = $"{ticket.Id}|{otp}",
                PeopleCount = 1,
                GateName = ValidGateName
            };

            // Act
            var result = await service.ProcessScanAsync(request, "staff01");

            // Assert
            result.IsSuccess.Should().BeFalse();
            result.Message.Should().Contain("đã check-in");
        }

        [Fact]
        public async Task ProcessScanAsync_ShouldFail_WhenTicketCancelled()
        {
            // Arrange
            using var context = TestDbContextFactory.Create();
            using var cache = new MemoryCache(new MemoryCacheOptions());
            var ticket = SeedActiveTicket(context, status: TicketStatus.CANCELLED);
            var service = CreateService(context, cache);

            var otp = ComputeValidOtp(ticket);
            var request = new CheckInRequest
            {
                QrPayload = $"{ticket.Id}|{otp}",
                PeopleCount = 1,
                GateName = ValidGateName
            };

            // Act
            var result = await service.ProcessScanAsync(request, "staff01");

            // Assert
            result.IsSuccess.Should().BeFalse();
            result.Message.Should().Contain("đã hủy");
        }

        [Fact]
        public async Task ProcessScanAsync_ShouldFail_WhenTicketRevoked()
        {
            // Arrange
            using var context = TestDbContextFactory.Create();
            using var cache = new MemoryCache(new MemoryCacheOptions());
            var ticket = SeedActiveTicket(context, status: TicketStatus.REVOKED);
            var service = CreateService(context, cache);

            var otp = ComputeValidOtp(ticket);
            var request = new CheckInRequest
            {
                QrPayload = $"{ticket.Id}|{otp}",
                PeopleCount = 1,
                GateName = ValidGateName
            };

            // Act
            var result = await service.ProcessScanAsync(request, "staff01");

            // Assert
            result.IsSuccess.Should().BeFalse();
            result.Message.Should().Contain("thu hồi");
        }

        // ============ TEST: Chống quét trùng (idempotency) ============

        [Fact]
        public async Task ProcessScanAsync_ShouldNotDoubleProcess_WhenSameRequestSentTwiceQuickly()
        {
            // Arrange
            using var context = TestDbContextFactory.Create();
            using var cache = new MemoryCache(new MemoryCacheOptions());
            var ticket = SeedActiveTicket(context);
            var service = CreateService(context, cache);

            var otp = ComputeValidOtp(ticket);
            var request = new CheckInRequest
            {
                QrPayload = $"{ticket.Id}|{otp}",
                PeopleCount = 1,
                GateName = ValidGateName
            };

            // Act — gửi 2 lần y hệt nhau liên tiếp (mô phỏng nhân viên bấm 2 lần, hoặc mạng lag gửi lại)
            var firstResult = await service.ProcessScanAsync(request, "staff01");
            var secondResult = await service.ProcessScanAsync(request, "staff01");

            // Assert — kết quả lần 2 phải giống lần 1 (lấy từ cache), không được xử lý logic 2 lần
            firstResult.IsSuccess.Should().BeTrue();
            secondResult.IsSuccess.Should().BeTrue();
            secondResult.Message.Should().Be(firstResult.Message);

            var ticketInDb = context.Tickets.First(t => t.Id == ticket.Id);
            ticketInDb.RemainingSlots.Should().Be(0, "không được trừ RemainingSlots quá 1 lần cho cùng 1 request");

            // Mediator chỉ được publish đúng 1 lần, không phải 2 lần
            _mediatorMock.Verify(m => m.Publish(
                It.IsAny<TicketCheckedInEvent>(),
                It.IsAny<CancellationToken>()), Times.Once);
        }

        // ============ TEST: Sai cổng ============

        [Fact]
        public async Task ProcessScanAsync_ShouldFail_WhenGateNotRecognized()
        {
            // Arrange
            using var context = TestDbContextFactory.Create();
            using var cache = new MemoryCache(new MemoryCacheOptions());
            var ticket = SeedActiveTicket(context);
            var service = CreateService(context, cache);

            var otp = ComputeValidOtp(ticket);
            var request = new CheckInRequest
            {
                QrPayload = $"{ticket.Id}|{otp}",
                PeopleCount = 1,
                GateName = "Cổng không tồn tại trong hệ thống"
            };

            // Act
            var result = await service.ProcessScanAsync(request, "staff01");

            // Assert
            result.IsSuccess.Should().BeFalse();
            result.Message.Should().Contain("Sai cổng");
        }

        // ============ TEST: Hiệu năng phản hồi ============

        [Fact]
        public async Task ProcessScanAsync_ShouldRespondQuickly()
        {
            // Arrange
            using var context = TestDbContextFactory.Create();
            using var cache = new MemoryCache(new MemoryCacheOptions());
            var ticket = SeedActiveTicket(context);
            var service = CreateService(context, cache);

            var otp = ComputeValidOtp(ticket);
            var request = new CheckInRequest
            {
                QrPayload = $"{ticket.Id}|{otp}",
                PeopleCount = 1,
                GateName = ValidGateName
            };

            var stopwatch = Stopwatch.StartNew();

            // Act
            var result = await service.ProcessScanAsync(request, "staff01");

            stopwatch.Stop();

            // Assert — với InMemory DB, thời gian phản hồi phải gần như tức thì (ngưỡng rộng rãi 1 giây
            // để tránh false-negative trên máy CI chậm, thực tế thường chỉ vài chục mili-giây)
            result.IsSuccess.Should().BeTrue();
            stopwatch.ElapsedMilliseconds.Should().BeLessThan(1000);
        }
    
        [Fact]
            public async Task BUG_ProcessScanAsync_AllowsExtraAdmission_WhenSameGroupQrRescanned_AfterDedupeCacheExpires()
            {
                using var context = TestDbContextFactory.Create();
                using var cache = new MemoryCache(new MemoryCacheOptions());
                var ticket = SeedActiveTicket(context, remainingSlots: 5);
                ticket.GroupSize = 5;
                context.SaveChanges();

                var service = CreateService(context, cache);
                var otp = ComputeValidOtp(ticket);

                var request = new CheckInRequest
                {
                    QrPayload = $"{ticket.Id}|{otp}",
                    PeopleCount = 1,
                    GateName = ValidGateName
                };

                var firstResult = await service.ProcessScanAsync(request, "staff01");
                firstResult.IsSuccess.Should().BeTrue();

                cache.Compact(1.0);

                var secondResult = await service.ProcessScanAsync(request, "staff01");

                secondResult.IsSuccess.Should().BeFalse(
                    "hệ thống không được phép check-in thêm người khi quét lại đúng QR/OTP cũ, " +
                    "kể cả khi cache dedupe 30s đã hết hạn");
            }
        }
}