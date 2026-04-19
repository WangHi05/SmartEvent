using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using TicketSystem.Application.DTOs;
using TicketSystem.Domain.Entities;
using TicketSystem.Domain.Interfaces;

namespace TicketSystem.Application.Services
{
    
    /// Service xử lý logic nghiệp vụ liên quan đến Event
    
    public class EventService
    {
        private readonly IGenericRepository<Event> _eventRepository;
        private readonly IGenericRepository<AuditLog> _auditLogRepository;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public EventService(
            IGenericRepository<Event> eventRepository,
            IGenericRepository<AuditLog> auditLogRepository,
            IHttpContextAccessor httpContextAccessor)
        {
            _eventRepository = eventRepository;
            _auditLogRepository = auditLogRepository;
            _httpContextAccessor = httpContextAccessor;
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

        
        /// Tạo mới Event
        
        public async Task<EventResponseDto> CreateEventAsync(CreateEventDto dto, string createdBy)
        {
            // Validate business rules
            if (dto.StartTime >= dto.EndTime)
                throw new ArgumentException("Thời gian kết thúc phải sau thời gian bắt đầu");

            var eventEntity = new Event
            {
                Name = dto.Name,
                Description = dto.Description,
                Location = dto.Location,
                StartTime = dto.StartTime,
                EndTime = dto.EndTime,
                MaxCapacity = dto.MaxCapacity,
                CurrentOccupancy = 0,
                BasePrice = dto.BasePrice,
                CancellationDeadlineHours = dto.CancellationDeadlineHours,
                CreatedBy = createdBy
            };

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

            if (dto.BasePrice.HasValue)
                eventEntity.BasePrice = dto.BasePrice.Value;

            if (dto.CancellationDeadlineHours.HasValue)
                eventEntity.CancellationDeadlineHours = dto.CancellationDeadlineHours.Value;

            eventEntity.UpdatedAt = DateTime.UtcNow;
            eventEntity.UpdatedBy = updatedBy;

            await _eventRepository.UpdateAsync(eventEntity);

            // Ghi log
            await LogAuditAsync(new AuditLog
            {
                Action = "Update",
                EntityType = "Event",
                EntityId = eventEntity.Id,
                PerformedBy = updatedBy,
                Details = $"Updated event: {eventEntity.Name}"
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
            if (eventEntity.Tickets.Any(t => t.Status == Domain.Common.TicketStatus.Paid || 
                                              t.Status == Domain.Common.TicketStatus.CheckedIn))
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

        
        /// Map Entity sang DTO
        
        private EventResponseDto MapToResponseDto(Event eventEntity)
        {
            return new EventResponseDto
            {
                Id = eventEntity.Id,
                Name = eventEntity.Name,
                Description = eventEntity.Description,
                Location = eventEntity.Location,
                StartTime = eventEntity.StartTime,
                EndTime = eventEntity.EndTime,
                MaxCapacity = eventEntity.MaxCapacity,
                CurrentOccupancy = eventEntity.CurrentOccupancy,
                BasePrice = eventEntity.BasePrice,
                CancellationDeadlineHours = eventEntity.CancellationDeadlineHours,
                IsFull = eventEntity.IsFull(),
                CreatedAt = eventEntity.CreatedAt,
                CreatedBy = eventEntity.CreatedBy
            };
        }

        
        /// Ghi log AuditLog
        
        private async Task LogAuditAsync(AuditLog log)
        {
            log.IpAddress = GetClientIpAddress();
            log.Timestamp = GetVietnamTime();
            await _auditLogRepository.AddAsync(log);
        }

        private DateTime GetVietnamTime()
        {
            TimeZoneInfo vietnamZone = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
            return TimeZoneInfo.ConvertTime(DateTime.UtcNow, vietnamZone);
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
