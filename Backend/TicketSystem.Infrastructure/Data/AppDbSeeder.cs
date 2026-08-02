using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Bogus;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using TicketSystem.Domain.Entities;
using TicketSystem.Domain.Common;

using EntityTicketType = TicketSystem.Domain.Entities.TicketType;

namespace TicketSystem.Infrastructure.Data
{
    public class AppDbSeeder
    {
        // Danh sách địa điểm Việt Nam thật, đảm bảo Name và Location luôn khớp nhau.
        // Trước đây dùng f.Address.FullAddress() (locale "vi" không có data thật) khiến
        // Location bị sinh ngẫu nhiên kiểu "Bến Tre, Tajikistan" không liên quan gì đến
        // tên thành phố trong Name -> AI chatbot lọc theo địa điểm luôn ra rỗng.
        private static readonly (string City, string[] Venues)[] VietnamLocations = new[]
        {
            ("Hà Nội", new[]
            {
                "Trung tâm Hội nghị Quốc gia, Hà Nội",
                "Nhà hát Lớn Hà Nội, Hà Nội",
                "Sân vận động Mỹ Đình, Hà Nội",
                "Trung tâm Triển lãm Giảng Võ, Hà Nội",
                "Hồ Hoàn Kiếm, Hà Nội",
                "Đại học Kinh tế Quốc dân, Hà Nội"
            }),
            ("TP.HCM", new[]
            {
                "Trung tâm Hội chợ và Triển lãm Sài Gòn (SECC), TP.HCM",
                "Nhà thi đấu Phú Thọ, TP.HCM",
                "Landmark 81, TP.HCM",
                "Nhà hát Thành phố, TP.HCM",
                "Sân vận động Quân khu 7, TP.HCM",
                "Bảo tàng Áo Dài, TP.HCM"
            }),
            ("Đà Nẵng", new[]
            {
                "Cung Thể thao Tiên Sơn, Đà Nẵng",
                "Công viên Biển Đông, Đà Nẵng",
                "Da Nang Innovation Hub, Đà Nẵng"
            }),
            ("Hải Phòng", new[]
            {
                "Cung Văn hóa Hữu nghị Việt Tiệp, Hải Phòng"
            }),
            ("Cần Thơ", new[]
            {
                "Trung tâm Hội chợ Triển lãm Quốc tế Cần Thơ",
                "Nhà thi đấu đa năng Cần Thơ",
                "Can Tho Creative Center, Cần Thơ"
            }),
            ("Huế", new[]
            {
                "Trung tâm Văn hóa Thông tin tỉnh Thừa Thiên Huế",
                "Đại Nội Huế"
            }),
            ("Nha Trang", new[]
            {
                "Quảng trường 2 tháng 4, Nha Trang",
                "Trung tâm Hội nghị 46 Trần Phú, Nha Trang"
            }),
            ("Vũng Tàu", new[]
            {
                "Bãi biển Vũng Tàu",
                "Nhà thi đấu Vũng Tàu"
            }),
            ("Đà Lạt", new[]
            {
                "Quảng trường Lâm Viên, Đà Lạt"
            }),
            ("Bình Dương", new[]
            {
                "Trung tâm Hội nghị và Triển lãm tỉnh Bình Dương"
            })
        };

        // Hàm Helper tạo Slug chuẩn SEO
        private static string GenerateSlug(string phrase)
        {
            if (string.IsNullOrEmpty(phrase)) return "";
            string str = phrase.ToLowerInvariant();
            str = str.Replace("á", "a").Replace("à", "a").Replace("ả", "a").Replace("ã", "a").Replace("ạ", "a").Replace("â", "a").Replace("ấ", "a").Replace("ầ", "a").Replace("ẩ", "a").Replace("ẫ", "a").Replace("ậ", "a").Replace("ă", "a").Replace("ắ", "a").Replace("ằ", "a").Replace("ẳ", "a").Replace("ẵ", "a").Replace("ặ", "a");
            str = str.Replace("é", "e").Replace("è", "e").Replace("ẻ", "e").Replace("ẽ", "e").Replace("ẹ", "e").Replace("ê", "e").Replace("ế", "e").Replace("ề", "e").Replace("ể", "e").Replace("ễ", "e").Replace("ệ", "e");
            str = str.Replace("í", "i").Replace("ì", "i").Replace("ỉ", "i").Replace("ĩ", "i").Replace("ị", "i");
            str = str.Replace("ó", "o").Replace("ò", "o").Replace("ỏ", "o").Replace("õ", "o").Replace("ọ", "o").Replace("ô", "o").Replace("ố", "o").Replace("ồ", "o").Replace("ổ", "o").Replace("ỗ", "o").Replace("ộ", "o").Replace("ơ", "o").Replace("ớ", "o").Replace("ờ", "o").Replace("ở", "o").Replace("ỡ", "o").Replace("ợ", "o");
            str = str.Replace("ú", "u").Replace("ù", "u").Replace("ủ", "u").Replace("ũ", "u").Replace("ụ", "u").Replace("ư", "u").Replace("ứ", "u").Replace("ừ", "u").Replace("ử", "u").Replace("ữ", "u").Replace("ự", "u");
            str = str.Replace("ý", "y").Replace("ỳ", "y").Replace("ỷ", "y").Replace("ỹ", "y").Replace("ỵ", "y");
            str = str.Replace("đ", "d");
            str = Regex.Replace(str, @"[^a-z0-9\s-]", "");
            str = Regex.Replace(str, @"\s+", "-").Trim();
            str = Regex.Replace(str, @"-+", "-");
            return str;
        }

        public static async Task SeedDataAsync(DbContext context, ILogger logger, bool forceSeed = false)
        {
            if (!forceSeed && await context.Set<Event>().AnyAsync())
            {
                logger.LogInformation("Database đã có dữ liệu Sự kiện. Bỏ qua Seeding Bogus.");
                return;
            }

            logger.LogInformation("Bắt đầu khởi tạo Mock Data (Có dữ liệu Kiểm soát Cổng) bằng Bogus...");

            // --- BƯỚC 1: TẠO USERS ---
            var dummyPasswordHash = "hashed_password_123";
            var userFaker = new Faker<User>("vi")
                .CustomInstantiator(f => User.Create(
                    username: f.Internet.UserName(),
                    passwordHash: dummyPasswordHash,
                    fullName: f.Name.FullName(),
                    email: f.Internet.Email(),
                    role: UserRole.Customer,
                    createdBy: "SystemSeeder"
                ))
                .RuleFor(u => u.PhoneNumber, f => f.Phone.PhoneNumber("09########"));

            var users = userFaker.Generate(50);
            await context.Set<User>().AddRangeAsync(users);

            // --- BƯỚC 2: TẠO EVENTS QUÁ KHỨ VÀ TƯƠNG LAI ---
            var eventFaker = new Faker<Event>("vi")
                .RuleFor(e => e.Id, f => Guid.NewGuid())
                .RuleFor(e => e.Name, f =>
                {
                    var loc = f.PickRandom(VietnamLocations);
                    return $"Sự kiện {f.Commerce.Department()} - {loc.City}";
                })
                .RuleFor(e => e.Slug, (f, e) => $"{GenerateSlug(e.Name)}-{f.Random.AlphaNumeric(6).ToLower()}")
                .RuleFor(e => e.Location, (f, e) =>
                {
                    // Lấy đúng thành phố đã gắn trong Name (phần sau " - ") để Location
                    // luôn khớp với Name, tránh tình trạng Name ghi "Cần Thơ" nhưng
                    // Location lại là một địa chỉ ngẫu nhiên không liên quan.
                    var separatorIndex = e.Name.LastIndexOf(" - ", StringComparison.Ordinal);
                    var city = separatorIndex >= 0 ? e.Name[(separatorIndex + 3)..] : null;
                    var match = VietnamLocations.FirstOrDefault(l => l.City == city);
                    var venues = match.Venues ?? VietnamLocations[0].Venues;
                    return f.PickRandom(venues);
                })
                .RuleFor(e => e.StartTime, f => f.Date.Between(DateTime.UtcNow.AddMonths(-3), DateTime.UtcNow.AddMonths(1)))
                .RuleFor(e => e.EndTime, (f, e) => e.StartTime.AddHours(f.Random.Int(4, 72)))
                .RuleFor(e => e.MaxCapacity, f => f.Random.Int(300, 2000))
                .RuleFor(e => e.CurrentOccupancy, 0)
                .RuleFor(e => e.CancellationDeadlineHours, f => f.PickRandom(24, 48, 72))
                .RuleFor(e => e.Status, (f, e) => {
                    var now = DateTime.UtcNow;
                    if (e.EndTime < now) return EventStatus.Completed;
                    if (e.StartTime <= now && e.EndTime >= now) return EventStatus.Ongoing;
                    return EventStatus.Active;
                })
                .RuleFor(e => e.CreatedAt, f => DateTime.UtcNow)
                .RuleFor(e => e.CreatedBy, "SystemSeeder");

            var events = eventFaker.Generate(10);

            // ĐẶC BIỆT: TẠO 1 SỰ KIỆN LỚN ĐANG DIỄN RA HÔM NAY ĐỂ TEST TRUNG TÂM ĐIỀU HÀNH CỔNG
            var currentUtc = DateTime.UtcNow;
            var todayEventStart = currentUtc.Date.AddHours(-2);
            var todayEventEnd = currentUtc.Date.AddHours(5);

            var todayEvent = new Event
            {
                Id = Guid.NewGuid(),
                Name = "Lễ hội Âm nhạc & Công nghệ Cloud 2026",
                Slug = $"le-hoi-am-nhac-cong-nghe-cloud-2026-{Guid.NewGuid().ToString("N").Substring(0, 5)}",
                Description = "Sự kiện siêu hoành tráng để kiểm thử Radar AI.",
                Location = "Trung tâm Hội chợ và Triển lãm Sài Gòn (SECC), TP.HCM",
                StartTime = todayEventStart,
                EndTime = todayEventEnd,
                MaxCapacity = 5000,
                CurrentOccupancy = 0,
                CancellationDeadlineHours = 24,
                Status = (todayEventStart <= currentUtc && todayEventEnd >= currentUtc) ? EventStatus.Ongoing : EventStatus.Active,
                CreatedAt = DateTime.UtcNow.AddDays(-30),
                CreatedBy = "SystemSeeder"
            };
            events.Add(todayEvent);

            await context.Set<Event>().AddRangeAsync(events);

            // --- BƯỚC 3, 4, 5, 6: TẠO VÉ VÀ LOG CHECK-IN ---
            var ticketTypes = new List<EntityTicketType>();
            var orders = new List<Order>();
            var payments = new List<Payment>();
            var tickets = new List<Ticket>();
            var checkInLogs = new List<CheckInLog>();

            string[] gateList = { "Cổng chính - Lối vào 1", "Cổng phụ - Lối vào 2", "Cổng VIP" };

            foreach (var evt in events)
            {
                var typeFaker = new Faker<EntityTicketType>("vi")
                    .RuleFor(tt => tt.Id, f => Guid.NewGuid())
                    .RuleFor(tt => tt.EventId, evt.Id)
                    .RuleFor(tt => tt.Name, f => f.PickRandom("VIP", "Standard", "Early Bird"))
                    .RuleFor(tt => tt.Price, f => f.Random.Decimal(100000, 1000000))
                    .RuleFor(tt => tt.Quantity, evt.MaxCapacity / 2)
                    .RuleFor(tt => tt.RemainingQuantity, (f, tt) => tt.Quantity)
                    .RuleFor(tt => tt.MaxPerUser, 5)
                    .RuleFor(tt => tt.SaleStartTime, evt.StartTime.AddDays(-30))
                    .RuleFor(tt => tt.SaleEndTime, evt.EndTime)
                    .RuleFor(tt => tt.TicketMode, f => (dynamic)f.PickRandom(1, 2))
                    .RuleFor(tt => tt.MinGroupSize, (f, tt) => (int)tt.TicketMode == 2 ? 2 : (int?)null)
                    .RuleFor(tt => tt.MaxGroupSize, (f, tt) => (int)tt.TicketMode == 2 ? 10 : (int?)null);

                var eventTicketTypes = typeFaker.Generate(2);
                ticketTypes.AddRange(eventTicketTypes);

                int orderCount = (evt.Id == todayEvent.Id) ? new Faker().Random.Int(200, 400) : new Faker().Random.Int(10, 30);

                var orderFaker = new Faker<Order>("vi")
                    .RuleFor(o => o.Id, f => Guid.NewGuid())
                    .RuleFor(o => o.EventId, evt.Id)
                    .RuleFor(o => o.CustomerId, f => f.PickRandom(users).Id)
                    .RuleFor(o => o.TicketTypeId, f => f.PickRandom(eventTicketTypes).Id)
                    .RuleFor(o => o.Quantity, (f, o) => f.Random.Int(1, 4))
                    .RuleFor(o => o.BuyerName, f => f.Name.FullName())
                    .RuleFor(o => o.BuyerPhone, f => f.Phone.PhoneNumber("09########"))
                    .RuleFor(o => o.CreatedAt, f => f.Date.Between(evt.StartTime.AddDays(-15), evt.StartTime.AddHours(-2)));

                var eventOrders = orderFaker.Generate(orderCount);

                foreach(var order in eventOrders)
                {
                    var type = eventTicketTypes.First(t => t.Id == order.TicketTypeId);
                    order.TotalPrice = type.Price * order.Quantity;

                    bool isCancelled = new Faker().Random.Bool(0.05f);
                    order.OrderStatus = isCancelled ? OrderStatus.Cancelled : OrderStatus.Confirmed;

                    if (isCancelled)
                    {
                        order.CancelRequestAt = evt.StartTime.AddHours(-new Faker().Random.Int(24, 168));
                        order.RefundAmount = order.TotalPrice * 0.5m;
                        order.RefundedAt = order.CancelRequestAt.Value.AddHours(2);
                        type.RemainingQuantity += order.Quantity;
                    }
                    else
                    {
                        var payment = new Payment
                        {
                            Id = Guid.NewGuid(),
                            OrderId = order.Id,
                            Amount = order.TotalPrice,
                            PaymentMethod = new Faker().PickRandom<PaymentMethod>(),
                            PaymentStatus = PaymentStatus.Completed,
                            TransactionReference = "PAY" + new Faker().Random.AlphaNumeric(10).ToUpper(),
                            PaidAt = order.CreatedAt.AddMinutes(new Faker().Random.Int(2, 15)),
                            CreatedAt = order.CreatedAt,
                            CreatedBy = "SystemSeeder"
                        };
                        payments.Add(payment);
                    }
                    orders.Add(order);

                    for (int i = 0; i < order.Quantity; i++)
                    {
                        var ticket = new Ticket
                        {
                            Id = Guid.NewGuid(),
                            TicketTypeId = type.Id,
                            OrderId = order.Id,
                            SecretKey = Guid.NewGuid().ToString("N").Substring(0, 16).ToUpper(),
                            Status = isCancelled ? TicketStatus.CANCELLED : TicketStatus.ACTIVE,
                            ValidFrom = evt.StartTime,
                            ValidTo = evt.EndTime,
                            GroupSize = (int)type.TicketMode == 2 ? new Random().Next(type.MinGroupSize ?? 2, type.MaxGroupSize ?? 5) : 1,
                            RemainingSlots = (int)type.TicketMode == 2 ? new Random().Next(type.MinGroupSize ?? 2, type.MaxGroupSize ?? 5) : 1,
                            CreatedAt = order.CreatedAt,
                            CreatedBy = "SystemSeeder"
                        };

                        if (!isCancelled && evt.StartTime <= DateTime.UtcNow)
                        {
                            bool isCheckedIn = new Faker().Random.Bool(0.85f);

                            if (isCheckedIn)
                            {
                                ticket.Status = TicketStatus.CHECKED_IN;
                                ticket.IsCheckedIn = true;
                                ticket.RemainingSlots = 0;
                                evt.CurrentOccupancy += ticket.GroupSize;

                                DateTime checkInTime;
                                if (evt.Id == todayEvent.Id)
                                {
                                    var minutesSinceOpen = (DateTime.UtcNow - evt.StartTime.AddMinutes(-60)).TotalMinutes;
                                    if (minutesSinceOpen > 0)
                                        checkInTime = evt.StartTime.AddMinutes(-60).AddMinutes(new Faker().Random.Double(0, minutesSinceOpen));
                                    else
                                        checkInTime = DateTime.UtcNow.AddMinutes(-5);
                                }
                                else
                                {
                                    checkInTime = evt.StartTime.AddMinutes(new Faker().Random.Int(-60, 120));
                                }

                                var log = new CheckInLog
                                {
                                    Id = Guid.NewGuid(),
                                    TicketId = ticket.Id,
                                    EventId = evt.Id,
                                    CheckedAt = checkInTime,
                                    CheckinDate = DateOnly.FromDateTime(checkInTime),
                                    Type = ScanType.Entry,
                                    PeopleCount = ticket.GroupSize,
                                    GateName = new Faker().PickRandom(gateList),
                                    StaffId = "Staff_" + new Faker().Random.Number(1, 5),
                                    CheckInResult = "Success",
                                    CreatedAt = checkInTime,
                                    CreatedBy = "SystemSeeder"
                                };
                                checkInLogs.Add(log);
                            }

                            bool isFakeAttempt = new Faker().Random.Bool(0.05f);
                            if (isFakeAttempt)
                            {
                                var attemptTime = evt.StartTime.AddMinutes(new Faker().Random.Int(10, 180));
                                var log = new CheckInLog
                                {
                                    Id = Guid.NewGuid(),
                                    TicketId = ticket.Id,
                                    EventId = evt.Id,
                                    CheckedAt = attemptTime,
                                    CheckinDate = DateOnly.FromDateTime(attemptTime),
                                    Type = ScanType.Entry,
                                    PeopleCount = 1,
                                    GateName = new Faker().PickRandom(gateList),
                                    StaffId = "Staff_" + new Faker().Random.Number(1, 5),
                                    CheckInResult = "Failed",
                                    FailureReason = new Faker().PickRandom("Mã vé đã được sử dụng", "Vé không hợp lệ", "Vé đã bị hủy"),
                                    CreatedAt = attemptTime,
                                    CreatedBy = "SystemSeeder"
                                };
                                checkInLogs.Add(log);
                            }
                        }
                        tickets.Add(ticket);
                    }
                }
            }

            await context.Set<EntityTicketType>().AddRangeAsync(ticketTypes);
            await context.Set<Order>().AddRangeAsync(orders);
            await context.Set<Payment>().AddRangeAsync(payments);
            await context.Set<Ticket>().AddRangeAsync(tickets);
            await context.Set<CheckInLog>().AddRangeAsync(checkInLogs);

            try
            {
                await context.SaveChangesAsync();
                logger.LogInformation($"Mock data seeded thành công mỹ mãn! Đặc biệt đã tạo dữ liệu Cổng Check-in cho Radar AI.");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Lỗi nghiêm trọng khi lưu mock data tích hợp vào Database.");
                throw;
            }
        }
    }
}