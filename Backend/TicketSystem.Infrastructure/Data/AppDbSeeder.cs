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
using DomainTicketTypeEnum = TicketSystem.Domain.Common.TicketType;

namespace TicketSystem.Infrastructure.Data
{
    public class AppDbSeeder
    {
        private static readonly (string City, string[] Venues)[] VietnamLocations = new[]
        {
            ("Hà Nội", new[] { "Trung tâm Hội nghị Quốc gia, Hà Nội", "Sân vận động Mỹ Đình, Hà Nội", "Cung Thể thao Quần Ngựa, Hà Nội" }),
            ("TP.HCM", new[] { "SECC, TP.HCM", "Nhà thi đấu Phú Thọ, TP.HCM", "Sân vận động Quân khu 7, TP.HCM" }),
            ("Đà Nẵng", new[] { "Cung Thể thao Tiên Sơn, Đà Nẵng", "Công viên Biển Đông, Đà Nẵng" }),
            ("Cần Thơ", new[] { "Trung tâm Hội chợ Triển lãm Quốc tế Cần Thơ" })
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
            str = Regex.Replace(str, @"\s+", "-").Trim();
            return Regex.Replace(str, @"-+", "-");
        }

        public static async Task SeedDataAsync(DbContext context, ILogger logger, bool forceSeed = false)
        {
            if (!forceSeed && await context.Set<Event>().AnyAsync())
            {
                logger.LogInformation("Database đã có dữ liệu. Bỏ qua Seeding để bảo toàn dữ liệu hiện tại.");
                return;
            }

            logger.LogInformation("Bắt đầu chạy AI & Dashboard Data Seeding...");
            
            Randomizer.Seed = new Random(8675309);

            // 1. TẠO CUSTOMERS (ĐÃ FIX LỖI CONSTRUCTOR BẰNG CUSTOM INSTANTIATOR)
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

            // 2. TẠO SỰ KIỆN (EVENTS)
            var events = new List<Event>();
            var now = DateTime.UtcNow;

            var eventFaker = new Faker<Event>("vi")
                .RuleFor(e => e.Id, f => Guid.NewGuid())
                .RuleFor(e => e.Name, f => {
                    var loc = f.PickRandom(VietnamLocations);
                    return $"Sự kiện {f.Commerce.Department()} - {loc.City}";
                })
                .RuleFor(e => e.Slug, (f, e) => $"{GenerateSlug(e.Name)}-{f.Random.AlphaNumeric(6).ToLower()}")
                .RuleFor(e => e.Location, (f, e) => {
                    var city = e.Name.Substring(e.Name.LastIndexOf(" - ") + 3);
                    var match = VietnamLocations.FirstOrDefault(l => l.City == city);
                    return f.PickRandom(match.Venues ?? VietnamLocations[0].Venues);
                })
                .RuleFor(e => e.StartTime, f => f.Date.Between(now.AddMonths(-2), now.AddMonths(1)))
                .RuleFor(e => e.EndTime, (f, e) => e.StartTime.AddHours(f.Random.Int(4, 48)))
                .RuleFor(e => e.CreatedAt, (f, e) => e.StartTime.AddDays(-f.Random.Int(45, 60))) 
                .RuleFor(e => e.MaxCapacity, f => f.Random.Int(500, 2000))
                .RuleFor(e => e.CurrentOccupancy, 0)
                .RuleFor(e => e.CancellationDeadlineHours, f => f.PickRandom(24, 48, 72))
                .RuleFor(e => e.Status, (f, e) => {
                    if (e.EndTime < now) return EventStatus.Completed;
                    if (e.StartTime <= now && e.EndTime >= now) return EventStatus.Ongoing;
                    return EventStatus.Active;
                })
                .RuleFor(e => e.CreatedBy, "SystemSeeder");

            events.AddRange(eventFaker.Generate(15));

            var todayEventStart = now.AddHours(-2);
            var todayEvent = new Event
            {
                Id = Guid.NewGuid(),
                Name = "TechX & Cloud Summit 2026 - TP.HCM",
                Slug = "techx-cloud-summit-2026",
                Location = "SECC, TP.HCM",
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

            // Các List chứa dữ liệu giao dịch
            var ticketTypes = new List<EntityTicketType>();
            var orders = new List<Order>();
            var orderItems = new List<OrderItem>();
            var payments = new List<Payment>();
            var tickets = new List<Ticket>();
            var checkInLogs = new List<CheckInLog>();
            var auditLogs = new List<AuditLog>();

            foreach (var evt in events)
            {
                // 3. TẠO TICKET TYPES
                int individualCapacity = (int)(evt.MaxCapacity * 0.6);
                int groupCapacity = evt.MaxCapacity - individualCapacity;
                int maxGroupSize = 10;
                int groupTicketQuantity = groupCapacity / maxGroupSize;

                var individualType = new EntityTicketType
                {
                    Id = Guid.NewGuid(),
                    EventId = evt.Id,
                    Name = IndividualTicketPresets.VIP,
                    Price = 500000,
                    TicketMode = TicketMode.INDIVIDUAL,
                    Quantity = individualCapacity,
                    RemainingQuantity = individualCapacity, 
                    MaxPerUser = 4,
                    UsageType = UsageType.ONE_TIME, 
                    SaleStartTime = evt.CreatedAt.AddDays(5),
                    SaleEndTime = evt.StartTime,
                    IsActive = true,
                    CreatedAt = evt.CreatedAt,
                    CreatedBy = "SystemSeeder"
                };

                var groupType = new EntityTicketType
                {
                    Id = Guid.NewGuid(),
                    EventId = evt.Id,
                    Name = GroupTicketPresets.COMPANY,
                    Price = 4000000, 
                    TicketMode = TicketMode.GROUP,
                    Quantity = groupTicketQuantity, 
                    RemainingQuantity = groupTicketQuantity,
                    MaxPerUser = 2,
                    MinGroupSize = 5,      
                    MaxGroupSize = maxGroupSize,
                    QRMode = QRMode.SINGLE_QR, 
                    PriceMode = PriceMode.PER_TICKET, 
                    SaleStartTime = evt.CreatedAt.AddDays(5),
                    SaleEndTime = evt.StartTime,
                    IsActive = true,
                    CreatedAt = evt.CreatedAt,
                    CreatedBy = "SystemSeeder"
                };

                ticketTypes.Add(individualType);
                ticketTypes.Add(groupType);
                var evtTicketTypes = new[] { individualType, groupType };

                // 4. TẠO ORDERS & ORDER ITEMS
                int orderCount = (evt.Id == todayEvent.Id) ? new Faker().Random.Int(300, 500) : new Faker().Random.Int(20, 50);
                
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
                        Id = Guid.NewGuid(),
                        EventId = evt.Id,
                        CustomerId = customerId,
                        TicketTypeId = selectedType.Id, 
                        Quantity = qty,
                        BuyerName = faker.Name.FullName(),
                        BuyerPhone = faker.Phone.PhoneNumber("09########"),
                        TotalPrice = selectedType.Price * qty,
                        CreatedAt = orderDate,
                        CreatedBy = customerId.ToString()
                    };

                    var orderItem = new OrderItem
                    {
                        Id = Guid.NewGuid(),
                        OrderId = order.Id,
                        TicketTypeId = selectedType.Id,
                        Quantity = qty,
                        MemberCount = selectedType.TicketMode == TicketMode.GROUP ? selectedType.MaxGroupSize.Value : 1,
                        UnitPrice = selectedType.Price,
                        Subtotal = selectedType.Price * qty,
                        CreatedAt = orderDate,
                        CreatedBy = customerId.ToString()
                    };
                    orderItems.Add(orderItem);
                    selectedType.ReserveCapacity(qty); 

                    // 5. MÔ PHỎNG HUỶ VÉ & THANH TOÁN
                    bool isCancelled = faker.Random.Bool(0.08f); 
                    DateTime maxCancelTime = evt.StartTime.AddHours(-evt.CancellationDeadlineHours);
                    
                    if (isCancelled && orderDate < maxCancelTime)
                    {
                        order.OrderStatus = OrderStatus.Cancelled;
                        order.CancelRequestAt = faker.Date.Between(orderDate.AddMinutes(30), maxCancelTime);
                        order.RefundAmount = order.TotalPrice * 0.8m; 
                        order.RefundedAt = order.CancelRequestAt.Value.AddHours(2);
                        order.RefundStatus = RefundStatus.RefundCompleted;
                        
                        selectedType.ReleaseCapacity(qty); 
                        
                        auditLogs.Add(new AuditLog {
                            Id = Guid.NewGuid(), Action = "CancelOrder", EntityType = "Order",
                            EntityId = order.Id, Timestamp = order.CancelRequestAt.Value,
                            PerformedBy = customerId.ToString()
                        });
                    }
                    else
                    {
                        order.OrderStatus = OrderStatus.Confirmed;
                        order.ConfirmedAt = orderDate.AddMinutes(faker.Random.Int(1, 10));
                        
                        var payment = new Payment
                        {
                            Id = Guid.NewGuid(),
                            OrderId = order.Id,
                            Amount = order.TotalPrice,
                            PaymentMethod = faker.PickRandom<PaymentMethod>(),
                            PaymentStatus = PaymentStatus.Completed,
                            TransactionReference = "VNPT" + faker.Random.AlphaNumeric(12).ToUpper(),
                            PaidAt = order.ConfirmedAt,
                            CreatedAt = orderDate
                        };
                        payments.Add(payment);
                    }
                    orders.Add(order);

                    // 6. TẠO VÉ (TICKETS) & CHECK-IN
                    for (int j = 0; j < qty; j++)
                    {
                        int groupSize = selectedType.TicketMode == TicketMode.GROUP ? faker.Random.Int(selectedType.MinGroupSize.Value, selectedType.MaxGroupSize.Value) : 1;

                        var ticket = new Ticket
                        {
                            Id = Guid.NewGuid(),
                            TicketTypeId = selectedType.Id,
                            OrderId = order.Id,
                            SecretKey = Guid.NewGuid().ToString("N")[..16].ToUpper(),
                            Status = (order.OrderStatus == OrderStatus.Cancelled) ? TicketStatus.CANCELLED : TicketStatus.ACTIVE,
                            ValidFrom = evt.StartTime,
                            ValidTo = evt.EndTime,
                            GroupSize = groupSize,
                            RemainingSlots = groupSize,
                            CreatedAt = orderDate,
                            CreatedBy = customerId.ToString()
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
                                    StaffId = "NV_00" + faker.Random.Int(1, 5),
                                    CheckInResult = "Success",
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
                                    CheckInResult = "Failed",
                                    FailureReason = faker.PickRandom("Mã vé không tồn tại", "Sai cổng check-in"),
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
            await context.Set<AuditLog>().AddRangeAsync(auditLogs);

            try
            {
                await context.SaveChangesAsync();
                logger.LogInformation($"[Mock Data Success] Đã tạo thành công {events.Count} Sự kiện, {orders.Count} Đơn hàng, {tickets.Count} Vé, và {checkInLogs.Count} Check-in Logs.");
                logger.LogInformation("Dữ liệu sẵn sàng 100% cho thuật toán Phân tích AI và Dashboard Báo cáo!");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "LỖI KHI LƯU MOCK DATA. Entity Framework bắt được vi phạm rành buộc (Constraint Violation).");
                throw;
            }
        }
    }
}