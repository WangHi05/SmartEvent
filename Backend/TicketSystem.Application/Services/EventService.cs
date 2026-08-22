using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using TicketSystem.Application.Common;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Interfaces;
using TicketSystem.Domain.Entities;
using TicketSystem.Domain.Interfaces;
using TicketSystem.Domain.Common;

namespace TicketSystem.Application.Services
{
    /// <summary>
    /// Service xử lý logic nghiệp vụ liên quan đến Event, đã tích hợp Redis Caching.
    /// LƯU Ý: Redis chỉ được coi là "best-effort" — nếu Redis lỗi/timeout (Upstash sleep,
    /// mất kết nối...), service PHẢI tự fallback đọc thẳng Postgres thay vì để lỗi Redis
    /// làm sập cả request (500). Mọi lần gọi _cache đều đi qua các hàm Safe* bên dưới.
    /// </summary>
    public class EventService : IEventService 
    {
        private readonly IGenericRepository<Event> _eventRepository;
        private readonly IGenericRepository<AuditLog> _auditLogRepository;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IApplicationDbContext _context;
        private readonly IRealTimeUpdateService _realTimeUpdateService;
        private readonly IDistributedCache _cache; // Inject Redis Cache
        private readonly ILogger<EventService> _logger;

        public EventService(
            IGenericRepository<Event> eventRepository,
            IGenericRepository<AuditLog> auditLogRepository,
            IHttpContextAccessor httpContextAccessor,
            IApplicationDbContext context,
            IRealTimeUpdateService realTimeUpdateService,
            IDistributedCache cache, // Khai báo injection
            ILogger<EventService> logger)
        {
            _eventRepository = eventRepository;
            _auditLogRepository = auditLogRepository;
            _httpContextAccessor = httpContextAccessor;
            _context = context;
            _realTimeUpdateService = realTimeUpdateService;
            _cache = cache; // Gán instance
            _logger = logger;
        }

        private const string ListCacheVersionKey = "EventListCacheVersion";

        // ===================== SAFE CACHE WRAPPERS =====================
        // Redis (Upstash free tier...) có thể timeout/mất kết nối bất cứ lúc nào.
        // Các hàm này đảm bảo lỗi cache KHÔNG BAO GIỜ làm fail request của người dùng —
        // tệ nhất chỉ là chậm hơn một chút vì phải đọc thẳng DB thay vì cache.

        private async Task<string?> SafeCacheGetAsync(string key)
        {
            try
            {
                return await _cache.GetStringAsync(key);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Redis GET lỗi cho key {CacheKey}, fallback đọc DB.", key);
                return null;
            }
        }

        private async Task SafeCacheSetAsync(string key, string value, DistributedCacheEntryOptions options)
        {
            try
            {
                await _cache.SetStringAsync(key, value, options);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Redis SET lỗi cho key {CacheKey}, bỏ qua ghi cache.", key);
            }
        }

        private async Task SafeCacheRemoveAsync(string key)
        {
            try
            {
                await _cache.RemoveAsync(key);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Redis REMOVE lỗi cho key {CacheKey}, bỏ qua.", key);
            }
        }

        private async Task<string> GetListCacheVersionAsync()
        {
            var v = await SafeCacheGetAsync(ListCacheVersionKey);
            return v ?? "1";
        }

        private async Task InvalidateListCachesAsync()
        {
            try
            {
                var current = await GetListCacheVersionAsync();
                var next = (long.Parse(current) + 1).ToString();
                await SafeCacheSetAsync(ListCacheVersionKey, next, new DistributedCacheEntryOptions());
            }
            catch (Exception ex)
            {
                // Không throw — invalidate cache thất bại không được chặn CreateEvent/UpdateEvent...
                _logger.LogWarning(ex, "InvalidateListCachesAsync lỗi, bỏ qua.");
            }
        }

        // ================================================================

        public async Task<PagedResult<EventResponseDto>> SearchEventsAsync(EventSearchRequest request)
        {
            var version = await GetListCacheVersionAsync();
            string cacheKey = $"SearchEvents_v{version}_p{request.PageNumber}_s{request.PageSize}_k{request.Keyword}_c{request.Category}_st{request.Status}";

            // 2. Cache-Aside: Kiểm tra Redis trước (an toàn, không throw nếu Redis lỗi)
            var cachedData = await SafeCacheGetAsync(cacheKey);
            if (!string.IsNullOrEmpty(cachedData))
            {
                return JsonSerializer.Deserialize<PagedResult<EventResponseDto>>(cachedData)!;
            }

            // 3. Nếu Cache Miss (hoặc Redis lỗi), thực hiện Query DB
            var query = _context.Events.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(request.Keyword))
            {
                var keyword = request.Keyword.Trim().ToLower();
                query = query.Where(e => e.Name.ToLower().Contains(keyword) || 
                                         e.Description.ToLower().Contains(keyword));
            }

            if (!string.IsNullOrWhiteSpace(request.Location))
            {
                query = query.Where(e => e.Location.Contains(request.Location));
            }

            if (request.FromDate.HasValue)
            {
                query = query.Where(e => e.StartTime >= request.FromDate.Value);
            }

            if (request.ToDate.HasValue)
            {
                query = query.Where(e => e.StartTime <= request.ToDate.Value);
            }

            if (request.Status.HasValue)
            {
                query = query.Where(e => e.Status == request.Status.Value);
            }
            else if (request.IncludeAll)
            {
                query = query.Where(e => e.Status != EventStatus.Archived);
            }
            else
            {
                query = query.Where(e => e.Status != EventStatus.PendingApproval && e.Status != EventStatus.Archived);
            }

            if (!string.IsNullOrWhiteSpace(request.Category) && request.Category != "Tất cả")
            {
                var categoryLower = request.Category.Trim().ToLower();
                query = query.Where(e => e.Name.ToLower().Contains(categoryLower) || 
                                         e.Description.ToLower().Contains(categoryLower));
            }

            int totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(e => e.CreatedAt)
                .Skip((request.PageNumber - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(e => new EventResponseDto
                {
                    Id = e.Id,
                    Name = e.Name,
                    Slug = e.Slug,
                    Status = (int)e.Status,
                    Description = e.Description,
                    Location = e.Location,
                    ImageUrl = e.ImageUrl,
                    StartTime = e.StartTime,
                    EndTime = e.EndTime,
                    MaxCapacity = e.MaxCapacity,
                    CurrentOccupancy = e.CurrentOccupancy,
                    IsFull = e.CurrentOccupancy >= e.MaxCapacity
                })
                .ToListAsync();

            var result = new PagedResult<EventResponseDto>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = request.PageNumber,
                PageSize = request.PageSize
            };

            // 4. Lưu kết quả vào Redis Cache với TTL (Time-To-Live) là 5 phút (an toàn, không throw)
            var cacheOptions = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
            };
            await SafeCacheSetAsync(cacheKey, JsonSerializer.Serialize(result), cacheOptions);

            return result;
        }

        
        /// Lấy danh sách Event với phân trang (Đã tối ưu query và Cache)
        
        public async Task<EventListDto> GetEventsAsync(int pageNumber = 1, int pageSize = 10)
        {
            var version = await GetListCacheVersionAsync();
            string cacheKey = $"GetEvents_v{version}_Page_{pageNumber}_Size_{pageSize}";

            var cachedData = await SafeCacheGetAsync(cacheKey);
            if (!string.IsNullOrEmpty(cachedData))
            {
                return JsonSerializer.Deserialize<EventListDto>(cachedData)!;
            }

            // Sửa lỗi N+1 và tràn RAM: Dùng AsNoTracking trực tiếp từ DbContext thay vì repository.GetAllAsync()
            var query = _context.Events.AsNoTracking();
            var totalCount = await query.CountAsync();

            var pagedEvents = await query
                .OrderByDescending(e => e.StartTime)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var result = new EventListDto
            {
                Items = pagedEvents.Select(MapToResponseDto).ToList(),
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize = pageSize
            };

            var cacheOptions = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
            };
            await SafeCacheSetAsync(cacheKey, JsonSerializer.Serialize(result), cacheOptions);

            return result;
        }

        
        /// Lấy thông tin Event theo Id
        
        public async Task<EventResponseDto?> GetEventByIdAsync(Guid id)
        {
            string cacheKey = $"EventById_{id}";
            var cachedData = await SafeCacheGetAsync(cacheKey);
            if (!string.IsNullOrEmpty(cachedData))
            {
                return JsonSerializer.Deserialize<EventResponseDto>(cachedData);
            }

            var eventEntity = await _eventRepository.GetByIdAsync(id);
            if (eventEntity == null) return null;

            var result = MapToResponseDto(eventEntity);

            await SafeCacheSetAsync(cacheKey, JsonSerializer.Serialize(result),
                new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10) });

            return result;
        }

        private string GenerateSlug(string title)
        {
            if (string.IsNullOrWhiteSpace(title)) return string.Empty;
            
            Regex regex = new Regex("\\p{IsCombiningDiacriticalMarks}+");
            string temp = title.Normalize(NormalizationForm.FormD);
            string slug = regex.Replace(temp, String.Empty).Replace('\u0111', 'd').Replace('\u0110', 'D');
            
            slug = slug.ToLowerInvariant();
            slug = Regex.Replace(slug, "[^a-z0-9\\s-]", ""); 
            slug = Regex.Replace(slug, "\\s+", "-").Trim('-'); 
            
            return slug;
        }

        /// Tạo mới Event
        
        public async Task<EventResponseDto> CreateEventAsync(CreateEventDto dto, string createdBy)
        {
            if (dto.StartTime >= dto.EndTime)
                throw new ArgumentException("Thời gian kết thúc phải sau thời gian bắt đầu");

            var now = VietnamTime.Now;
            var currentMinute = new DateTime(now.Year, now.Month, now.Day, now.Hour, now.Minute, 0, now.Kind);
            var startTime = VietnamTime.ToVietnamTime(dto.StartTime);

            if (startTime < currentMinute)
                throw new ArgumentException("Thời gian bắt đầu phải từ thời điểm hiện tại trở đi");

            var eventEntity = new Event
            {
                Name = dto.Name,
                Slug = GenerateSlug(dto.Name),
                Description = dto.Description,
                Location = dto.Location,
                ImageUrl = dto.ImageUrl,
                StartTime = dto.StartTime,
                EndTime = dto.EndTime,
                MaxCapacity = dto.MaxCapacity,
                CurrentOccupancy = 0,
                CancellationDeadlineHours = dto.CancellationDeadlineHours,
                CreatedBy = createdBy,
                Status = EventStatus.PendingApproval
            };

            await _eventRepository.AddAsync(eventEntity);

            await LogAuditAsync(new AuditLog
            {
                Action = "Create",
                EntityType = "Event",
                EntityId = eventEntity.Id,
                PerformedBy = createdBy,
                Details = $"Tạo sự kiện mới: {eventEntity.Name} (Trạng thái: Chờ duyệt)"
            });

            await _context.SaveChangesAsync();
            await InvalidateListCachesAsync();

            return MapToResponseDto(eventEntity);
        }

        
        /// Cập nhật Event
        
        public async Task<EventResponseDto?> UpdateEventAsync(UpdateEventDto dto, string updatedBy)
        {
            var eventEntity = await _eventRepository.GetByIdAsync(dto.Id);
            if (eventEntity == null)
                return null;

            var now = VietnamTime.Now;
            var currentMinute = new DateTime(now.Year, now.Month, now.Day, now.Hour, now.Minute, 0, now.Kind);

            if (!string.IsNullOrEmpty(dto.Name))
            {
                eventEntity.Name = dto.Name;
                eventEntity.Slug = GenerateSlug(dto.Name);
            }

            if (dto.Description != null)
                eventEntity.Description = dto.Description;

            if (dto.Location != null)
                eventEntity.Location = dto.Location;

            if (dto.ImageUrl != null)
                eventEntity.ImageUrl = dto.ImageUrl;

            if (dto.StartTime.HasValue)
            {
                var newStartTime = VietnamTime.ToVietnamTime(dto.StartTime.Value);
                if (newStartTime < currentMinute && newStartTime != VietnamTime.ToVietnamTime(eventEntity.StartTime))
                    throw new ArgumentException("Thời gian bắt đầu phải từ thời điểm hiện tại trở đi");

                eventEntity.StartTime = dto.StartTime.Value;
            }

            if (dto.EndTime.HasValue)
                eventEntity.EndTime = dto.EndTime.Value;

            if (dto.MaxCapacity.HasValue)
                eventEntity.MaxCapacity = dto.MaxCapacity.Value;

            if (dto.CancellationDeadlineHours.HasValue)
                eventEntity.CancellationDeadlineHours = dto.CancellationDeadlineHours.Value;

            eventEntity.UpdatedAt = DateTime.UtcNow;
            eventEntity.UpdatedBy = updatedBy;

            var oldStatus = eventEntity.Status;
            ApplyScheduleStatus(eventEntity, VietnamTime.Now);

            await _eventRepository.UpdateAsync(eventEntity);

            await LogAuditAsync(new AuditLog
            {
                Action = "Update",
                EntityType = "Event",
                EntityId = eventEntity.Id,
                PerformedBy = updatedBy,
                Details = $"Cập nhật sự kiện: {eventEntity.Name}. Trạng thái: {TranslateStatus(oldStatus)} → {TranslateStatus(eventEntity.Status)}"
            });

            await _context.SaveChangesAsync();

            // Xóa cache cũ để đồng bộ dữ liệu mới (Cache Invalidation) — an toàn, không throw
            await SafeCacheRemoveAsync($"EventById_{eventEntity.Id}");
            await InvalidateListCachesAsync();
            await _realTimeUpdateService.NotifyEventStatusChangedAsync(eventEntity.Id, (int)eventEntity.Status);

            return MapToResponseDto(eventEntity);
        }

        
        /// Xóa Event
        
        public async Task<bool> DeleteEventAsync(Guid id, string deletedBy)
        {
            var eventEntity = await _eventRepository.GetByIdAsync(id);
            if (eventEntity == null)
                return false;

            if (eventEntity.Tickets.Any(t => t.Status == Domain.Entities.TicketStatus.CHECKED_IN))
            {
                throw new InvalidOperationException("Không thể xóa sự kiện đã có vé được bán");
            }

            await _eventRepository.DeleteAsync(id);

            await LogAuditAsync(new AuditLog
            {
                Action = "Delete",
                EntityType = "Event",
                EntityId = id,
                PerformedBy = deletedBy,
                Details = $"Xóa sự kiện: {eventEntity.Name}"
            });

            await _context.SaveChangesAsync();
            await SafeCacheRemoveAsync($"EventById_{id}");
            await InvalidateListCachesAsync();

            return true;
        }

        private static void ApplyScheduleStatus(Event eventEntity, DateTime now)
        {
            eventEntity.Status = DetermineScheduleStatus(eventEntity, now);
        }

        private static EventStatus DetermineScheduleStatus(Event eventEntity, DateTime now)
        {
            var startTime = VietnamTime.ToVietnamTime(eventEntity.StartTime);
            var endTime = VietnamTime.ToVietnamTime(eventEntity.EndTime);

            if (endTime < now) return EventStatus.Archived;
            if (startTime <= now && now <= endTime) return EventStatus.Ongoing;
            return EventStatus.Active;
        }

        private EventResponseDto MapToResponseDto(Event eventEntity)
        {
            return new EventResponseDto
            {
                Id = eventEntity.Id,
                Name = eventEntity.Name,
                Slug = eventEntity.Slug,
                Description = eventEntity.Description,
                Location = eventEntity.Location,
                ImageUrl = eventEntity.ImageUrl,
                StartTime = eventEntity.StartTime,
                EndTime = eventEntity.EndTime,
                MaxCapacity = eventEntity.MaxCapacity,
                CurrentOccupancy = eventEntity.CurrentOccupancy,
                BasePrice = 0,
                CancellationDeadlineHours = eventEntity.CancellationDeadlineHours,
                IsFull = eventEntity.IsFull(),
                Status = (int)eventEntity.Status,
                EventMode = (int)eventEntity.GetEventMode(),
                EventDurationDays = eventEntity.GetEventDurationDays(),
                CreatedAt = eventEntity.CreatedAt,
                CreatedBy = eventEntity.CreatedBy
            };
        }

        private async Task LogAuditAsync(AuditLog log)
        {
            log.IpAddress = GetClientIpAddress();
            log.Timestamp = DateTime.UtcNow;
            await _auditLogRepository.AddAsync(log);
        }

        private string? GetClientIpAddress()
        {
            var ipAddress = _httpContextAccessor.HttpContext?.Connection.RemoteIpAddress;
            if (ipAddress == null) return null;

            if (ipAddress.ToString() == "::1")
                return "127.0.0.1";

            if (ipAddress.IsIPv4MappedToIPv6)
                return ipAddress.MapToIPv4().ToString();

            return ipAddress.ToString();
        }

        public async Task AutoUpdateCompletedEventsAsync()
        {
            var now = VietnamTime.Now;

            var scheduledEvents = await _context.Events
                .Where(e => e.Status == EventStatus.Active || e.Status == EventStatus.Ongoing)
                .ToListAsync();

            if (!scheduledEvents.Any()) return;

            var changedEvents = new List<Event>();

            foreach (var evt in scheduledEvents)
            {
                var oldStatus = evt.Status;
                var newStatus = DetermineScheduleStatus(evt, now);

                if (newStatus == oldStatus) continue;

                evt.Status = newStatus;
                evt.UpdatedAt = now;
                evt.UpdatedBy = "Hangfire System";
                changedEvents.Add(evt);

                var action = newStatus == EventStatus.Archived ? "AutoArchive"
                    : newStatus == EventStatus.Ongoing ? "AutoStartOngoing"
                    : "AutoUpdateStatus";

                await LogAuditAsync(new AuditLog
                {
                    Action = action,
                    EntityType = "Event",
                    EntityId = evt.Id,
                    PerformedBy = "System",
                    Details = $"Hangfire tự động cập nhật trạng thái sự kiện: {TranslateStatus(oldStatus)} → {TranslateStatus(newStatus)}"
                });
            }

            if (!changedEvents.Any()) return;

            _context.Events.UpdateRange(changedEvents);
            await _context.SaveChangesAsync();

            foreach (var evt in changedEvents)
            {
                await _realTimeUpdateService.NotifyEventStatusChangedAsync(evt.Id, (int)evt.Status);
                await SafeCacheRemoveAsync($"EventById_{evt.Id}");
            }
            await InvalidateListCachesAsync();
        }

        public async Task<EventResponseDto?> ApproveEventAsync(Guid eventId, string approvedBy)
        {
            var eventEntity = await _eventRepository.GetByIdAsync(eventId);
            if (eventEntity == null) return null;

            if (eventEntity.Status != EventStatus.PendingApproval)
                throw new InvalidOperationException("Chỉ có thể duyệt sự kiện đang ở trạng thái chờ duyệt");

            ApplyScheduleStatus(eventEntity, VietnamTime.Now);
            eventEntity.UpdatedAt = DateTime.UtcNow;
            eventEntity.UpdatedBy = approvedBy;

            await _eventRepository.UpdateAsync(eventEntity);

            await LogAuditAsync(new AuditLog
            {
                Action = "Approve",
                EntityType = "Event",
                EntityId = eventEntity.Id,
                PerformedBy = approvedBy,
                Details = $"Duyệt sự kiện: {eventEntity.Name}. Trạng thái mới: {TranslateStatus(eventEntity.Status)}"
            });

            await _context.SaveChangesAsync();
            await SafeCacheRemoveAsync($"EventById_{eventId}");
            await InvalidateListCachesAsync();
            await _realTimeUpdateService.NotifyEventStatusChangedAsync(eventId, (int)eventEntity.Status);

            return MapToResponseDto(eventEntity);
        }

        public async Task<EventResponseDto?> ArchiveEventAsync(Guid eventId, string archivedBy)
        {
            var eventEntity = await _eventRepository.GetByIdAsync(eventId);
            if (eventEntity == null) return null;

            eventEntity.Status = EventStatus.Archived;
            eventEntity.UpdatedAt = DateTime.UtcNow;
            eventEntity.UpdatedBy = archivedBy;

            await _eventRepository.UpdateAsync(eventEntity);

            await LogAuditAsync(new AuditLog
            {
                Action = "Archive",
                EntityType = "Event",
                EntityId = eventEntity.Id,
                PerformedBy = archivedBy,
                Details = $"Lưu trữ (ẩn) sự kiện: {eventEntity.Name}"
            });

            await _context.SaveChangesAsync();
            await SafeCacheRemoveAsync($"EventById_{eventId}");
            await InvalidateListCachesAsync();

            return MapToResponseDto(eventEntity);
        }

        public async Task<EventResponseDto?> UnarchiveEventAsync(Guid eventId, string restoredBy)
        {
            var eventEntity = await _eventRepository.GetByIdAsync(eventId);
            if (eventEntity == null) return null;

            if (eventEntity.Status != EventStatus.Archived)
                throw new InvalidOperationException("Chỉ có thể khôi phục sự kiện đang ở trạng thái lưu trữ");

            ApplyScheduleStatus(eventEntity, VietnamTime.Now);
            eventEntity.UpdatedAt = DateTime.UtcNow;
            eventEntity.UpdatedBy = restoredBy;

            await _eventRepository.UpdateAsync(eventEntity);

            await LogAuditAsync(new AuditLog
            {
                Action = "Unarchive",
                EntityType = "Event",
                EntityId = eventEntity.Id,
                PerformedBy = restoredBy,
                Details = $"Khôi phục sự kiện: {eventEntity.Name}. Trạng thái mới: {TranslateStatus(eventEntity.Status)}"
            });

            await _context.SaveChangesAsync();
            await SafeCacheRemoveAsync($"EventById_{eventId}");
            await InvalidateListCachesAsync();
            await _realTimeUpdateService.NotifyEventStatusChangedAsync(eventId, (int)eventEntity.Status);

            return MapToResponseDto(eventEntity);
        }

        public async Task<PagedResult<EventResponseDto>> GetArchivedEventsAsync(int pageNumber, int pageSize, string? keyword = null)
        {
            var query = _context.Events.AsNoTracking()
                .Where(e => e.Status == EventStatus.Archived);

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var normalizedKeyword = keyword.Trim().ToLower();
                query = query.Where(e => e.Name.ToLower().Contains(normalizedKeyword));
            }

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(e => e.UpdatedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(e => new EventResponseDto
                {
                    Id = e.Id,
                    Name = e.Name,
                    Slug = e.Slug,
                    Status = (int)e.Status,
                    Description = e.Description,
                    Location = e.Location,
                    ImageUrl = e.ImageUrl,
                    StartTime = e.StartTime,
                    EndTime = e.EndTime,
                    MaxCapacity = e.MaxCapacity,
                    CurrentOccupancy = e.CurrentOccupancy,
                    IsFull = e.CurrentOccupancy >= e.MaxCapacity,
                    CreatedAt = e.CreatedAt,
                    CreatedBy = e.CreatedBy
                })
                .ToListAsync();

            return new PagedResult<EventResponseDto>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize = pageSize
            };

            
        }
        private static string TranslateStatus(EventStatus status) => status switch
        {
            EventStatus.PendingApproval => "Chờ duyệt",
            EventStatus.Active => "Sắp diễn ra",
            EventStatus.Ongoing => "Đang diễn ra",
            EventStatus.Archived => "Đã lưu trữ",
            _ => status.ToString()
        };
    }
}