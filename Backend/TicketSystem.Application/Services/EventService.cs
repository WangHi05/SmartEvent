using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using TicketSystem.Application.Common;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Interfaces;
using TicketSystem.Domain.Entities;
using TicketSystem.Domain.Interfaces;
using TicketSystem.Domain.Common;

namespace TicketSystem.Application.Services
{
    
    /// Service xử lý logic nghiệp vụ liên quan đến Event
    /// </summary>
    public class EventService : IEventService 
    {
        private readonly IGenericRepository<Event> _eventRepository;
        private readonly IGenericRepository<AuditLog> _auditLogRepository;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IApplicationDbContext _context;

        public EventService(
            IGenericRepository<Event> eventRepository,
            IGenericRepository<AuditLog> auditLogRepository,
            IHttpContextAccessor httpContextAccessor,
            IApplicationDbContext context)
        {
            _eventRepository = eventRepository;
            _auditLogRepository = auditLogRepository;
            _httpContextAccessor = httpContextAccessor;
            _context = context;
        }

        public async Task<PagedResult<EventResponseDto>> SearchEventsAsync(EventSearchRequest request)
        {
            // 1. Khởi tạo Query cơ bản (Chưa gọi xuống DB)
            // AsNoTracking() giúp tăng hiệu năng cho các truy vấn chỉ đọc (Read-only)
            var query = _context.Events.AsNoTracking().AsQueryable();

            // 2. Áp dụng các bộ lọc (Filters) động
            if (!string.IsNullOrWhiteSpace(request.Keyword))
            {
                var keyword = request.Keyword.Trim().ToLower();
                // Tìm kiếm tương đối (LIKE %keyword%) trên Tên và Mô tả
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

            // 3. Tính tổng số lượng bản ghi (để Front-end làm phân trang)
            int totalCount = await query.CountAsync();

            // 4. Áp dụng Phân trang (Pagination) và Projection (Select mapping)
            var items = await query
                .OrderByDescending(e => e.CreatedAt) // Ưu tiên sự kiện mới tạo lên đầu
                .Skip((request.PageNumber - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(e => new EventResponseDto
                {
                    Id = e.Id,
                    Name = e.Name,
                    Slug = e.Slug,
                    Description = e.Description,
                    Location = e.Location,
                    StartTime = e.StartTime,
                    EndTime = e.EndTime,
                    MaxCapacity = e.MaxCapacity,
                    CurrentOccupancy = e.CurrentOccupancy,
                    IsFull = e.CurrentOccupancy >= e.MaxCapacity
                })
                .ToListAsync(); // <-- Lúc này câu lệnh SQL SELECT mới thực sự chạy

            // 5. Trả về kết quả bọc trong PagedResult
            return new PagedResult<EventResponseDto>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = request.PageNumber,
                PageSize = request.PageSize
            };
        }

        
        /// Lấy danh sách Event với phân trang
        
        public async Task<EventListDto> GetEventsAsync(int pageNumber = 1, int pageSize = 10)
        {
            var events = await _eventRepository.GetAllAsync();
            var totalCount = events.Count();

            var pagedEvents = events
                .OrderByDescending(e => e.StartTime)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(MapToResponseDto)
                .ToList();

            return new EventListDto
            {
                Items = pagedEvents,
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize = pageSize
            };
        }

        
        /// Lấy thông tin Event theo Id
        
        public async Task<EventResponseDto?> GetEventByIdAsync(Guid id)
        {
            var eventEntity = await _eventRepository.GetByIdAsync(id);
            return eventEntity == null ? null : MapToResponseDto(eventEntity);
        }

        private string GenerateSlug(string title)
        {
            if (string.IsNullOrWhiteSpace(title)) return string.Empty;
            
            // Xóa dấu tiếng Việt
            Regex regex = new Regex("\\p{IsCombiningDiacriticalMarks}+");
            string temp = title.Normalize(NormalizationForm.FormD);
            string slug = regex.Replace(temp, String.Empty).Replace('\u0111', 'd').Replace('\u0110', 'D');
            
            // Chuyển thành chữ thường và thay khoảng trắng bằng gạch ngang
            slug = slug.ToLowerInvariant();
            slug = Regex.Replace(slug, "[^a-z0-9\\s-]", ""); // Xóa ký tự đặc biệt
            slug = Regex.Replace(slug, "\\s+", "-").Trim('-'); // Đổi khoảng trắng thành gạch ngang
            
            return slug;
        }

        /// Tạo mới Event
        
        public async Task<EventResponseDto> CreateEventAsync(CreateEventDto dto, string createdBy)
        {
            // Validate business rules
            if (dto.StartTime >= dto.EndTime)
                throw new ArgumentException("Thời gian kết thúc phải sau thời gian bắt đầu");

            var eventEntity = new Event
            {
                Name = dto.Name,
                Slug = GenerateSlug(dto.Name),
                Description = dto.Description,
                Location = dto.Location,
                StartTime = dto.StartTime,
                EndTime = dto.EndTime,
                MaxCapacity = dto.MaxCapacity,
                CurrentOccupancy = 0,
                CancellationDeadlineHours = dto.CancellationDeadlineHours,
                CreatedBy = createdBy
            };

            ApplyScheduleStatus(eventEntity, VietnamTime.Now);

            await _eventRepository.AddAsync(eventEntity);

            // Ghi log
            await LogAuditAsync(new AuditLog
            {
                Action = "Create",
                EntityType = "Event",
                EntityId = eventEntity.Id,
                PerformedBy = createdBy,
                Details = $"Created event: {eventEntity.Name}"
            });

            return MapToResponseDto(eventEntity);
        }

        
        /// Cập nhật Event
        
        public async Task<EventResponseDto?> UpdateEventAsync(UpdateEventDto dto, string updatedBy)
        {
            var eventEntity = await _eventRepository.GetByIdAsync(dto.Id);
            if (eventEntity == null)
                return null;

            // Cập nhật các trường nếu có giá trị mới
            if (!string.IsNullOrEmpty(dto.Name))
                eventEntity.Name = dto.Name;
                eventEntity.Slug = GenerateSlug(dto.Name);

            if (dto.Description != null)
                eventEntity.Description = dto.Description;

            if (dto.Location != null)
                eventEntity.Location = dto.Location;

            if (dto.StartTime.HasValue)
                eventEntity.StartTime = dto.StartTime.Value;

            if (dto.EndTime.HasValue)
                eventEntity.EndTime = dto.EndTime.Value;

            if (dto.MaxCapacity.HasValue)
                eventEntity.MaxCapacity = dto.MaxCapacity.Value;

            if (dto.CancellationDeadlineHours.HasValue)
                eventEntity.CancellationDeadlineHours = dto.CancellationDeadlineHours.Value;

            eventEntity.UpdatedAt = VietnamTime.Now;
            eventEntity.UpdatedBy = updatedBy;

            var oldStatus = eventEntity.Status;
            ApplyScheduleStatus(eventEntity, VietnamTime.Now);

            await _eventRepository.UpdateAsync(eventEntity);

            // Ghi log
            await LogAuditAsync(new AuditLog
            {
                Action = "Update",
                EntityType = "Event",
                EntityId = eventEntity.Id,
                PerformedBy = updatedBy,
                Details = $"Updated event: {eventEntity.Name}. Status: {oldStatus} -> {eventEntity.Status}"
            });

            return MapToResponseDto(eventEntity);
        }

        
        /// Xóa Event (soft delete hoặc hard delete tùy business requirement)
        
        public async Task<bool> DeleteEventAsync(Guid id, string deletedBy)
        {
            var eventEntity = await _eventRepository.GetByIdAsync(id);
            if (eventEntity == null)
                return false;

            // Kiểm tra xem có vé nào đã bán chưa
            if (eventEntity.Tickets.Any(t => t.Status == Domain.Entities.TicketStatus.CHECKED_IN))
            {
                throw new InvalidOperationException("Không thể xóa sự kiện đã có vé được bán");
            }

            await _eventRepository.DeleteAsync(id);

            // Ghi log
            await LogAuditAsync(new AuditLog
            {
                Action = "Delete",
                EntityType = "Event",
                EntityId = id,
                PerformedBy = deletedBy,
                Details = $"Deleted event: {eventEntity.Name}"
            });

            return true;
        }

        public async Task<bool> UpdateStatusAsync(Guid eventId, EventStatus newStatus)
        {
            var eventEntity = await _eventRepository.GetByIdAsync(eventId);
            if (eventEntity == null) return false;

            eventEntity.Status = newStatus == EventStatus.Cancelled
                ? EventStatus.Cancelled
                : DetermineScheduleStatus(eventEntity, VietnamTime.Now);
            
            eventEntity.UpdatedAt = VietnamTime.Now;

            await _eventRepository.UpdateAsync(eventEntity);

            await LogAuditAsync(new AuditLog
            {
                Action = "UpdateStatus",
                EntityType = "Event",
                EntityId = eventEntity.Id,
                PerformedBy = "System", // Hoặc lấy user ID từ HttpContext
                Details = $"Updated event status to: {newStatus}"
            });

            return true;
        }

        private static void ApplyScheduleStatus(Event eventEntity, DateTime now)
        {
            eventEntity.Status = DetermineScheduleStatus(eventEntity, now);
        }

        private static EventStatus DetermineScheduleStatus(Event eventEntity, DateTime now)
        {
            if (eventEntity.Status == EventStatus.Cancelled)
            {
                return EventStatus.Cancelled;
            }

            var startTime = VietnamTime.ToVietnamTime(eventEntity.StartTime);
            var endTime = VietnamTime.ToVietnamTime(eventEntity.EndTime);

            if (endTime < now)
            {
                return EventStatus.Completed;
            }

            if (startTime <= now && now <= endTime)
            {
                return EventStatus.Ongoing;
            }

            return EventStatus.Active;
        }

        /// <summary>
        /// Map Entity sang DTO
        
        private EventResponseDto MapToResponseDto(Event eventEntity)
        {
            return new EventResponseDto
            {
                Id = eventEntity.Id,
                Name = eventEntity.Name,
                Slug = eventEntity.Slug,
                Description = eventEntity.Description,
                Location = eventEntity.Location,
                StartTime = eventEntity.StartTime,
                EndTime = eventEntity.EndTime,
                MaxCapacity = eventEntity.MaxCapacity,
                CurrentOccupancy = eventEntity.CurrentOccupancy,
                CancellationDeadlineHours = eventEntity.CancellationDeadlineHours,
                IsFull = eventEntity.IsFull(),
                Status = (int)eventEntity.Status,
                EventMode = (int)eventEntity.GetEventMode(),
                EventDurationDays = eventEntity.GetEventDurationDays(),
                CreatedAt = eventEntity.CreatedAt,
                CreatedBy = eventEntity.CreatedBy
            };
        }

        
        /// Ghi log AuditLog
        
        private async Task LogAuditAsync(AuditLog log)
        {
            log.IpAddress = GetClientIpAddress();
            log.Timestamp = VietnamTime.Now;
            await _auditLogRepository.AddAsync(log);
        }

        
        /// Lấy IP address của client (IPv4 format)
        
        private string? GetClientIpAddress()
        {
            var ipAddress = _httpContextAccessor.HttpContext?.Connection.RemoteIpAddress;
            if (ipAddress == null) return null;

            // Convert IPv6 localhost (::1) to IPv4 (127.0.0.1)
            if (ipAddress.ToString() == "::1")
                return "127.0.0.1";

            // Nếu là IPv4 mapped trong IPv6 (::ffff:192.168.1.1) → Extract IPv4
            if (ipAddress.IsIPv4MappedToIPv6)
                return ipAddress.MapToIPv4().ToString();

            return ipAddress.ToString();
        }
    }
}
