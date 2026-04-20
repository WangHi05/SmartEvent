using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using TicketSystem.Domain.Entities;

namespace TicketSystem.Infrastructure.Data
{
    
    /// Database Seeder - Tự động seed data khi database rỗng
    
    public class DatabaseSeeder
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<DatabaseSeeder> _logger;

        public DatabaseSeeder(ApplicationDbContext context, ILogger<DatabaseSeeder> logger)
        {
            _context = context;
            _logger = logger;
        }

        
        /// Seed initial data từ events-data.json
        
        public async Task SeedAsync()
        {
            try
            {
                // Kiểm tra xem đã có events chưa
                var hasEvents = await _context.Events.AnyAsync();
                if (hasEvents)
                {
                    _logger.LogInformation("Database already has events. Skipping seed.");
                    return;
                }

                _logger.LogInformation("Starting database seeding...");

                // Đọc events-data.json
                var jsonPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "..", "..", "..", "..", "events-data.json");
                
                if (!File.Exists(jsonPath))
                {
                    _logger.LogWarning("events-data.json not found at {Path}. Creating default events...", jsonPath);
                    await SeedDefaultEventsAsync();
                    return;
                }

                var jsonContent = await File.ReadAllTextAsync(jsonPath);
                var eventDtos = JsonSerializer.Deserialize<List<EventSeedDto>>(jsonContent, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (eventDtos == null || !eventDtos.Any())
                {
                    _logger.LogWarning("No events found in JSON file. Creating default events...");
                    await SeedDefaultEventsAsync();
                    return;
                }

                // Tạo events từ JSON
                foreach (var dto in eventDtos)
                {
                    var eventEntity = new Event
                    {
                        Name = dto.Name,
                        Description = dto.Description,
                        Location = dto.Location,
                        StartTime = dto.StartTime,
                        EndTime = dto.EndTime,
                        MaxCapacity = dto.MaxCapacity,
                        CurrentOccupancy = 0,
                        CancellationDeadlineHours = dto.CancellationDeadlineHours,
                        CreatedBy = "System (Seed)"
                    };

                    _context.Events.Add(eventEntity);
                    _logger.LogInformation("Seeded event: {EventName}", dto.Name);
                }

                await _context.SaveChangesAsync();
                _logger.LogInformation("Database seeding completed successfully. Created {Count} events.", eventDtos.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred during database seeding");
            }
        }

        
        /// Seed default events nếu không tìm thấy JSON file
        
        private async Task SeedDefaultEventsAsync()
        {
            var defaultEvents = new[]
            {
                new Event
                {
                    Name = "Hội thảo Công nghệ AI 2026",
                    Description = "Hội thảo về trí tuệ nhân tạo và machine learning",
                    Location = "Trung tâm Hội nghị Quốc gia, Hà Nội",
                    StartTime = new DateTime(2026, 3, 20, 9, 0, 0, DateTimeKind.Utc),
                    EndTime = new DateTime(2026, 3, 20, 17, 0, 0, DateTimeKind.Utc),
                    MaxCapacity = 500,
                    CurrentOccupancy = 0,
                    CancellationDeadlineHours = 48,
                    CreatedBy = "System (Seed)"
                },
                new Event
                {
                    Name = "Music Festival Hà Nội",
                    Description = "Lễ hội âm nhạc quốc tế với nhiều nghệ sĩ nổi tiếng",
                    Location = "Sân vận động Mỹ Đình",
                    StartTime = new DateTime(2026, 4, 15, 18, 0, 0, DateTimeKind.Utc),
                    EndTime = new DateTime(2026, 4, 15, 23, 0, 0, DateTimeKind.Utc),
                    MaxCapacity = 10000,
                    CurrentOccupancy = 0,
                    CancellationDeadlineHours = 72,
                    CreatedBy = "System (Seed)"
                },
                new Event
                {
                    Name = "Triển lãm Startup Việt Nam",
                    Description = "Triển lãm các startup công nghệ hàng đầu Việt Nam",
                    Location = "Trung tâm Triển lãm Giảng Võ, Hà Nội",
                    StartTime = new DateTime(2026, 5, 10, 8, 0, 0, DateTimeKind.Utc),
                    EndTime = new DateTime(2026, 5, 12, 18, 0, 0, DateTimeKind.Utc),
                    MaxCapacity = 2000,
                    CurrentOccupancy = 0,
                    CancellationDeadlineHours = 24,
                    CreatedBy = "System (Seed)"
                }
            };

            _context.Events.AddRange(defaultEvents);
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Seeded {Count} default events", defaultEvents.Length);
        }

        
        /// DTO để deserialize JSON
        
        private class EventSeedDto
        {
            public string Name { get; set; } = string.Empty;
            public string Description { get; set; } = string.Empty;
            public string Location { get; set; } = string.Empty;
            public DateTime StartTime { get; set; }
            public DateTime EndTime { get; set; }
            public int MaxCapacity { get; set; }
            public int CancellationDeadlineHours { get; set; }
        }
    }
}
