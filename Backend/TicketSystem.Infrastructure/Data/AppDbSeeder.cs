using System;
using System.Collections.Generic;
using System.Linq;
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
        // ... (Khai báo VietnamLocations và GenerateSlug giữ nguyên như cũ) ...
        private static readonly (string City, string[] Venues)[] VietnamLocations = new[]
        {
            ("Hà Nội", new[] { "Trung tâm Hội nghị Quốc gia", "Sân vận động Mỹ Đình" }),
            ("TP.HCM", new[] { "SECC Quận 7", "Nhà thi đấu Phú Thọ", "Sân vận động Quân khu 7" }),
            ("Đà Nẵng", new[] { "Cung Thể thao Tiên Sơn", "Công viên Biển Đông" })
        };

        private static readonly List<(string Category, string[] Names, string[] Images, string KeywordDesc)> EventThemes = new()
        {
            ("Nhạc sống", new[] { "Live Concert Vũ Trụ Cò Bay", "Đêm nhạc Trịnh" }, new[] { "https://images.unsplash.com/photo-1540039155732-6762b51ed81e?q=80&w=800" }, "Buổi hòa nhạc âm thanh ánh sáng đỉnh cao."),
            ("Hội thảo", new[] { "Hội thảo Kinh tế 2026", "Diễn đàn Bất động sản" }, new[] { "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=800" }, "Tham gia seminar cùng các chuyên gia ngành."),
            ("Thể thao", new[] { "Giải chạy VnExpress", "Chung kết VBA" }, new[] { "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=800" }, "Theo dõi trận giải đấu kịch tính."),
            ("Công nghệ", new[] { "AI & Cloud Summit", "Vietnam Web Startup" }, new[] { "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=800" }, "Hội tụ developer và công nghệ tiên tiến.")
        };

        private static string GenerateSlug(string phrase)
        {
            if (string.IsNullOrEmpty(phrase)) return "";
            string str = phrase.ToLowerInvariant();
            str = Regex.Replace(str, @"[áàảãạâấầẩẫậăắằẳẵặ]", "a");
            str = Regex.Replace(str, @"[éèẻẽẹêếềểễệ]", "e");
            str = Regex.Replace(str, @"[íìỉĩị]", "i");
            str = Regex.Replace(str, @"[óòỏõọôốồổỗộơớờởỡợ]", "o");
            str = Regex.Replace(str, @"[úùủũụưứừửữự]", "u");
            str = Regex.Replace(str, @"[ýỳỷỹỵ]", "y");
            str = str.Replace("đ", "d");
            str = Regex.Replace(str, @"[^a-z0-9\s-]", "");
            return Regex.Replace(str, @"\s+", "-").Trim();
        }

        public static async Task SeedDataAsync(DbContext context, ILogger logger, bool forceSeed = false)
        {
            // KIỂM TRA DB ĐÃ CÓ DỮ LIỆU CHƯA
            bool hasData = await context.Set<Event>().AnyAsync();

            if (hasData)
            {
                if (!forceSeed)
                {
                    logger.LogInformation("Database đã có dữ liệu. Bỏ qua Seeding để bảo toàn dữ liệu hiện tại.");
                    return;
                }
                else
                {
                    // 🛡️ CHỐNG DUPLICATE: Nếu ép buộc Seed, phải xóa sạch dữ liệu cũ trước!
                    logger.LogWarning("⚠️ PHÁT HIỆN LỆNH FORCE SEED: Đang tiến hành xóa sạch dữ liệu Transactional cũ để tránh trùng lặp (Duplicate)...");
                    try
                    {
                        var sql = @"
                            TRUNCATE TABLE 
                                ""AuditLogs"", ""CheckInLogs"", ""Tickets"", ""Payments"", 
                                ""OrderItems"", ""Orders"", ""TicketTypes"", ""Events"", ""Customers"" 
                            CASCADE;";
                        await context.Database.ExecuteSqlRawAsync(sql);
                        logger.LogInformation("✅ Đã dọn sạch dữ liệu cũ thành công. Bắt đầu sinh dữ liệu mới...");
                    }
                    catch (Exception ex)
                    {
                        logger.LogError(ex, "❌ Lỗi khi dọn dẹp dữ liệu cũ.");
                        throw;
                    }
                }
            }
            else
            {
                logger.LogInformation("Database trống. Bắt đầu chạy AI & Dashboard Data Seeding...");
            }

            Randomizer.Seed = new Random(8675309);

            // --- TỪ ĐÂY TRỞ XUỐNG LOGIC HOÀN TOÀN GIỮ NGUYÊN (Sinh data chuẩn) ---
            var dummyPasswordHash = "hashed_password_123";
            var customerFaker = new Faker<Customer>("vi")
                .CustomInstantiator(f => Customer.Create(
                    username: f.Internet.UserName(),
                    passwordHash: dummyPasswordHash,
                    fullName: f.Name.FullName(),
                    email: f.Internet.Email(),
                    createdBy: "SystemSeeder"
                ))
                .RuleFor(c => c.Id, f => Guid.NewGuid())
                .RuleFor(c => c.CreatedAt, f => DateTime.UtcNow.AddMonths(-6));
                
            var customers = customerFaker.Generate(100);
            try { await context.Set<Customer>().AddRangeAsync(customers); } catch { }

            var events = new List<Event>();
            var now = DateTime.UtcNow;

            var eventFaker = new Faker<Event>("vi")
                .RuleFor(e => e.Id, f => Guid.NewGuid())
                .CustomInstantiator(f => {
                    var theme = f.PickRandom(EventThemes);
                    var loc = f.PickRandom(VietnamLocations);
                    var locationStr = $"{f.PickRandom(loc.Venues)}, {loc.City}";
                    var name = $"{f.PickRandom(theme.Names)} - {loc.City}";
                    return new Event {
                        Name = name,
                        Slug = GenerateSlug(name) + "-" + f.Random.AlphaNumeric(4).ToLower(),
                        Location = locationStr,
                        ImageUrl = f.PickRandom(theme.Images),
                        Description = theme.KeywordDesc
                    };
                })
                .RuleFor(e => e.StartTime, f => f.Date.Between(now.AddMonths(-1), now.AddMonths(3)))
                .RuleFor(e => e.EndTime, (f, e) => e.StartTime.AddHours(f.Random.Int(4, 72)))
                .RuleFor(e => e.CreatedAt, (f, e) => e.StartTime.AddDays(-f.Random.Int(45, 60))) 
                .RuleFor(e => e.MaxCapacity, f => f.Random.Int(500, 5000))
                .RuleFor(e => e.CurrentOccupancy, 0)
                .RuleFor(e => e.CancellationDeadlineHours, f => f.PickRandom(24, 48, 72))
                .RuleFor(e => e.Status, (f, e) => {
                    if (e.EndTime < now) return EventStatus.Archived;
                    if (e.StartTime <= now && e.EndTime >= now) return EventStatus.Ongoing;
                    return EventStatus.Active;
                })
                .RuleFor(e => e.CreatedBy, "SystemSeeder");

            events.AddRange(eventFaker.Generate(30)); 

            var todayEventStart = now.AddHours(-2);
            var todayEvent = new Event
            {
                Id = Guid.NewGuid(),
                Name = "TechX & Cloud Summit 2026 - TP.HCM",
                Slug = "techx-cloud-summit-2026-live",
                Location = "SECC Quận 7, TP.HCM",
                ImageUrl = "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=800",
                Description = "Sự kiện chuyên sâu về công nghệ AI và lập trình viên (developer).",
                StartTime = todayEventStart,
                EndTime = todayEventStart.AddHours(8),
                CreatedAt = todayEventStart.AddDays(-45),
                MaxCapacity = 3000,
                CurrentOccupancy = 0,
                CancellationDeadlineHours = 24,
                Status = EventStatus.Ongoing,
                CreatedBy = "SystemSeeder"
            };
            events.Add(todayEvent);
            await context.Set<Event>().AddRangeAsync(events);

            var ticketTypes = new List<EntityTicketType>();
            var orders = new List<Order>();
            var orderItems = new List<OrderItem>();
            var payments = new List<Payment>();
            var tickets = new List<Ticket>();
            var checkInLogs = new List<CheckInLog>();
            var auditLogs = new List<AuditLog>();

            foreach (var evt in events)
            {
                int individualCapacity = (int)(evt.MaxCapacity * 0.6);
                int groupCapacity = evt.MaxCapacity - individualCapacity;
                int maxGroupSize = 10;
                int groupTicketQuantity = groupCapacity / maxGroupSize;

                var individualType = new EntityTicketType
                {
                    Id = Guid.NewGuid(), EventId = evt.Id,
                    Name = IndividualTicketPresets.VIP, Price = 500000,
                    TicketMode = TicketMode.INDIVIDUAL,
                    Quantity = individualCapacity, RemainingQuantity = individualCapacity, 
                    MaxPerUser = 4, UsageType = UsageType.ONE_TIME, 
                    SaleStartTime = evt.CreatedAt.AddDays(5), SaleEndTime = evt.StartTime,
                    IsActive = true, CreatedAt = evt.CreatedAt, CreatedBy = "SystemSeeder"
                };

                var groupType = new EntityTicketType
                {
                    Id = Guid.NewGuid(), EventId = evt.Id,
                    Name = GroupTicketPresets.COMPANY, Price = 4000000, 
                    TicketMode = TicketMode.GROUP,
                    Quantity = groupTicketQuantity, RemainingQuantity = groupTicketQuantity,
                    MaxPerUser = 2, MinGroupSize = 5, MaxGroupSize = maxGroupSize,
                    QRMode = QRMode.SINGLE_QR, PriceMode = PriceMode.PER_TICKET, 
                    SaleStartTime = evt.CreatedAt.AddDays(5), SaleEndTime = evt.StartTime,
                    IsActive = true, CreatedAt = evt.CreatedAt, CreatedBy = "SystemSeeder"
                };

                ticketTypes.Add(individualType);
                ticketTypes.Add(groupType);
                var evtTicketTypes = new[] { individualType, groupType };

                int orderCount = (evt.Id == todayEvent.Id) ? new Faker().Random.Int(400, 600) : new Faker().Random.Int(10, 40);
                
                for (int i = 0; i < orderCount; i++)
                {
                    var faker = new Faker();
                    var selectedType = faker.PickRandom(evtTicketTypes);
                    int qty = faker.Random.Int(1, selectedType.MaxPerUser);

                    if (selectedType.RemainingQuantity < qty) continue; 

                    var orderDate = faker.Date.Between(selectedType.SaleStartTime, selectedType.SaleEndTime.AddHours(-1));
                    var customerId = faker.PickRandom(customers).Id;

                    var order = new Order
                    {
                        Id = Guid.NewGuid(), EventId = evt.Id, CustomerId = customerId,
                        TicketTypeId = selectedType.Id, Quantity = qty,
                        BuyerName = faker.Name.FullName(), BuyerPhone = faker.Phone.PhoneNumber("09########"),
                        TotalPrice = selectedType.Price * qty,
                        CreatedAt = orderDate, CreatedBy = customerId.ToString()
                    };

                    var orderItem = new OrderItem
                    {
                        Id = Guid.NewGuid(), OrderId = order.Id, TicketTypeId = selectedType.Id,
                        Quantity = qty, MemberCount = selectedType.TicketMode == TicketMode.GROUP ? selectedType.MaxGroupSize.Value : 1,
                        UnitPrice = selectedType.Price, Subtotal = selectedType.Price * qty,
                        CreatedAt = orderDate, CreatedBy = customerId.ToString()
                    };
                    orderItems.Add(orderItem);
                    selectedType.ReserveCapacity(qty); 

                    bool isCancelled = faker.Random.Bool(0.08f); 
                    DateTime maxCancelTime = evt.StartTime.AddHours(-evt.CancellationDeadlineHours);
                    var cancelUpperBound = maxCancelTime < now ? maxCancelTime : now;

                    if (isCancelled && orderDate < cancelUpperBound)
                    {
                        order.OrderStatus = OrderStatus.Cancelled;
                        order.CancelRequestAt = faker.Date.Between(orderDate.AddMinutes(30), cancelUpperBound);
                        order.RefundAmount = order.TotalPrice * 0.8m; 
                        order.RefundedAt = order.CancelRequestAt.Value.AddHours(2);
                        order.RefundStatus = RefundStatus.RefundCompleted;
                        selectedType.ReleaseCapacity(qty); 
                    }
                    else
                    {
                        order.OrderStatus = OrderStatus.Confirmed;
                        order.ConfirmedAt = orderDate.AddMinutes(faker.Random.Int(1, 10));
                        payments.Add(new Payment
                        {
                            Id = Guid.NewGuid(), OrderId = order.Id, Amount = order.TotalPrice,
                            PaymentMethod = faker.PickRandom<PaymentMethod>(), PaymentStatus = PaymentStatus.Completed,
                            TransactionReference = "VNPT" + faker.Random.AlphaNumeric(12).ToUpper(),
                            PaidAt = order.ConfirmedAt, CreatedAt = orderDate
                        });
                    }
                    orders.Add(order);

                    for (int j = 0; j < qty; j++)
                    {
                        int groupSize = selectedType.TicketMode == TicketMode.GROUP ? faker.Random.Int(selectedType.MinGroupSize.Value, selectedType.MaxGroupSize.Value) : 1;
                        var ticket = new Ticket
                        {
                            Id = Guid.NewGuid(), TicketTypeId = selectedType.Id, OrderId = order.Id,
                            SecretKey = TicketSystem.Application.Utils.Base32Generator.Generate(16),
                            Status = (order.OrderStatus == OrderStatus.Cancelled) ? TicketStatus.CANCELLED : TicketStatus.ACTIVE,
                            ValidFrom = evt.StartTime, ValidTo = evt.EndTime,
                            GroupSize = groupSize, RemainingSlots = groupSize,
                            CreatedAt = orderDate, CreatedBy = customerId.ToString()
                        };

                        if (ticket.Status == TicketStatus.ACTIVE && evt.StartTime <= now)
                        {
                            bool isCheckedIn = faker.Random.Bool(0.85f);
                            bool isFakeAttempt = faker.Random.Bool(0.05f);

                            if (isCheckedIn)
                            {
                                ticket.Status = TicketStatus.CHECKED_IN;
                                ticket.IsCheckedIn = true;
                                ticket.RemainingSlots = 0; 
                                evt.CurrentOccupancy += ticket.GroupSize; 

                                var openGate = evt.StartTime.AddMinutes(-60);
                                var maxScan = evt.EndTime < now ? evt.EndTime : now;
                                var scanTime = faker.Date.Between(openGate, maxScan);

                                checkInLogs.Add(new CheckInLog
                                {
                                    Id = Guid.NewGuid(), TicketId = ticket.Id, EventId = evt.Id,
                                    CheckedAt = scanTime, CheckinDate = DateOnly.FromDateTime(scanTime),
                                    Type = ScanType.Entry, PeopleCount = ticket.GroupSize, 
                                    GateName = faker.PickRandom("Cổng A", "Cổng B", "Cổng VIP"),
                                    StaffId = "NV_00" + faker.Random.Int(1, 5), CheckInResult = "Success",
                                    CreatedAt = scanTime
                                });
                            }
                            else if (isFakeAttempt)
                            {
                                var scanTime = faker.Date.Between(evt.StartTime, evt.EndTime < now ? evt.EndTime : now);
                                checkInLogs.Add(new CheckInLog
                                {
                                    Id = Guid.NewGuid(), TicketId = ticket.Id, EventId = evt.Id,
                                    CheckedAt = scanTime, CheckinDate = DateOnly.FromDateTime(scanTime),
                                    Type = ScanType.Entry, PeopleCount = 1,
                                    GateName = faker.PickRandom("Cổng A", "Cổng B"),
                                    StaffId = "NV_00" + faker.Random.Int(1, 5),
                                    CheckInResult = "Failed", FailureReason = "Sai cổng check-in",
                                    CreatedAt = scanTime
                                });
                            }
                        }
                        tickets.Add(ticket);
                    }
                }
            }

            await context.Set<EntityTicketType>().AddRangeAsync(ticketTypes);
            await context.Set<Order>().AddRangeAsync(orders);
            await context.Set<OrderItem>().AddRangeAsync(orderItems);
            await context.Set<Payment>().AddRangeAsync(payments);
            await context.Set<Ticket>().AddRangeAsync(tickets);
            await context.Set<CheckInLog>().AddRangeAsync(checkInLogs);

            try
            {
                await context.SaveChangesAsync();
                logger.LogInformation($"[Mock Data Success] Đã tạo thành công {events.Count} Sự kiện không trùng lặp.");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "LỖI KHI LƯU MOCK DATA.");
                throw;
            }
        }
    }
}