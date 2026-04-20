using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Interfaces;
using TicketSystem.Domain.Common;
using TicketSystem.Domain.Entities;
using TicketSystem.Domain.Interfaces;

namespace TicketSystem.Application.Services
{
    // Service triển khai logic nghiệp vụ cho TicketType
    // - Validate tất cả business rules trước khi thực hiện
    // - Ghi AuditLog cho tất cả các thay đổi
    // - Quản lý sức chứa (Capacity)
    public class TicketTypeService : ITicketTypeService
    {
        private readonly ITicketTypeRepository _ticketTypeRepository;
        private readonly IGenericRepository<Event> _eventRepository;
        private readonly IGenericRepository<AuditLog> _auditLogRepository;

        public TicketTypeService(
            ITicketTypeRepository ticketTypeRepository,
            IGenericRepository<Event> eventRepository,
            IGenericRepository<AuditLog> auditLogRepository)
        {
            _ticketTypeRepository = ticketTypeRepository;
            _eventRepository = eventRepository;
            _auditLogRepository = auditLogRepository;
        }

        // Lấy danh sách TicketType của một Event
        public async Task<IEnumerable<TicketTypeDto>> GetTicketTypesByEventAsync(Guid eventId)
        {
            var ticketTypes = await _ticketTypeRepository.GetByEventIdAsync(eventId);
            return ticketTypes.Select(MapToDto).ToList();
        }

        // Lấy danh sách TicketType với phân trang
        public async Task<(IEnumerable<TicketTypeDto> TicketTypes, int TotalCount)> GetPagedTicketTypesByEventAsync(
            Guid eventId, int pageNumber, int pageSize)
        {
            var (ticketTypes, totalCount) = await _ticketTypeRepository.GetPagedTicketTypesByEventAsync(
                eventId, pageNumber, pageSize);
            
            var dtos = ticketTypes.Select(MapToDto).ToList();
            return (dtos, totalCount);
        }

        // Lấy chi tiết một TicketType
        public async Task<TicketTypeDto?> GetTicketTypeByIdAsync(Guid id)
        {
            var ticketType = await _ticketTypeRepository.GetByIdAsync(id);
            return ticketType != null ? MapToDto(ticketType) : null;
        }

        // Tạo mới TicketType
        // Validate: tên duy nhất, capacity, thời gian bán
        public async Task<TicketTypeDto> CreateTicketTypeAsync(Guid eventId, CreateTicketTypeDto request, string createdBy)
        {
            // Kiểm tra Event tồn tại
            var @event = await _eventRepository.GetByIdAsync(eventId);
            if (@event == null)
                throw new InvalidOperationException($"Không tìm thấy sự kiện với ID: {eventId}");

            // Validate tên duy nhất trong Event
            var isNameUnique = await _ticketTypeRepository.IsNameUniqueInEventAsync(eventId, request.Name);
            if (!isNameUnique)
                throw new InvalidOperationException($"Tên loại vé '{request.Name}' đã tồn tại trong sự kiện này");

            // Validate SaleEndTime > SaleStartTime
            if (request.SaleEndTime <= request.SaleStartTime)
                throw new InvalidOperationException("Thời gian kết thúc bán phải sau thời gian bắt đầu bán");

            // Validate SaleEndTime <= Event.StartTime (đóng bán trước khi sự kiện bắt đầu)
            if (request.SaleEndTime > @event.StartTime)
                throw new InvalidOperationException("Thời gian kết thúc bán không được sau khi sự kiện bắt đầu");

            // Validate tổng MaxCapacity không vượt Event.MaxCapacity
            var currentTotalCapacity = await _ticketTypeRepository.GetTotalMaxCapacityByEventAsync(eventId);
            if (currentTotalCapacity + request.MaxCapacity > @event.MaxCapacity)
                throw new InvalidOperationException(
                    $"Tổng sức chứa sẽ vượt quá giới hạn của sự kiện. " +
                    $"Hiện tại: {currentTotalCapacity}, yêu cầu thêm: {request.MaxCapacity}, " +
                    $"giới hạn: {@event.MaxCapacity}");

            // Tạo entity TicketType
            var ticketType = new Domain.Entities.TicketType
            {
                EventId = eventId,
                Name = request.Name.Trim(),
                Price = request.Price,
                MaxCapacity = request.MaxCapacity,
                RemainingCapacity = request.MaxCapacity, // Ban đầu bằng MaxCapacity
                MaxPerPerson = request.MaxPerUser,
                SaleStartTime = request.SaleStartTime,
                SaleEndTime = request.SaleEndTime,
                DisplayOrder = request.DisplayOrder,
                IsActive = request.IsActive,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = createdBy
            };

            // Lưu vào database
            var created = await _ticketTypeRepository.AddAsync(ticketType);

            // Ghi AuditLog
            await LogAuditAsync(new AuditLog
            {
                Action = "CREATE_TICKET_TYPE",
                EntityId = created.Id,
                EntityType = nameof(Domain.Entities.TicketType),
                Details = $"Tạo mới loại vé: {created.Name} (Giá: {created.Price}, Sức chứa: {created.MaxCapacity})",
                PerformedBy = createdBy,
                Timestamp = DateTime.UtcNow
            });

            return MapToDto(created);
        }

        // Cập nhật TicketType
        // Validate: maxCapacity không nhỏ hơn vé đã bán, capacity tổng, thời gian bán
        public async Task<TicketTypeDto> UpdateTicketTypeAsync(Guid id, UpdateTicketTypeDto request, string updatedBy)
        {
            // Lấy TicketType hiện tại
            var ticketType = await _ticketTypeRepository.GetByIdAsync(id);
            if (ticketType == null)
                throw new InvalidOperationException($"Không tìm thấy loại vé với ID: {id}");

            // Lấy Event để validate
            var @event = await _eventRepository.GetByIdAsync(ticketType.EventId);
            if (@event == null)
                throw new InvalidOperationException($"Không tìm thấy sự kiện");

            // Lưu giá trị cũ để logging
            var oldPrice = ticketType.Price;
            var oldMaxCapacity = ticketType.MaxCapacity;
            var oldSaleTimes = $"{ticketType.SaleStartTime:yyyy-MM-dd HH:mm} - {ticketType.SaleEndTime:yyyy-MM-dd HH:mm}";

            // Validate tên duy nhất (nếu thay đổi tên)
            if (!string.IsNullOrEmpty(request.Name) && request.Name != ticketType.Name)
            {
                var isNameUnique = await _ticketTypeRepository.IsNameUniqueInEventAsync(ticketType.EventId, request.Name, id);
                if (!isNameUnique)
                    throw new InvalidOperationException($"Tên loại vé '{request.Name}' đã tồn tại trong sự kiện này");
                
                ticketType.Name = request.Name.Trim();
            }

            // Cập nhật fields
            ticketType.Name = request.Name.Trim();
            ticketType.Price = request.Price;
            ticketType.MaxCapacity = request.MaxCapacity;
            ticketType.MaxPerPerson = request.MaxPerUser;
            ticketType.SaleStartTime = request.SaleStartTime;
            ticketType.SaleEndTime = request.SaleEndTime;
            ticketType.DisplayOrder = request.DisplayOrder;
            ticketType.AccessType = (Domain.Entities.TicketAccessType)request.AccessType;
            ticketType.IsActive = request.IsActive;

            // Cập nhật metadata
            ticketType.UpdatedAt = DateTime.UtcNow;
            ticketType.UpdatedBy = updatedBy;

            // Lưu vào database
            var updated = await _ticketTypeRepository.UpdateAsync(ticketType);

            // Ghi AuditLog
            var changes = new List<string>();
            if (oldPrice != updated.Price) changes.Add($"Giá: {oldPrice} → {updated.Price}");
            if (oldMaxCapacity != updated.MaxCapacity) changes.Add($"Sức chứa: {oldMaxCapacity} → {updated.MaxCapacity}");
            if (oldSaleTimes != $"{updated.SaleStartTime:yyyy-MM-dd HH:mm} - {updated.SaleEndTime:yyyy-MM-dd HH:mm}")
                changes.Add($"Thời gian bán: {oldSaleTimes} → {updated.SaleStartTime:yyyy-MM-dd HH:mm} - {updated.SaleEndTime:yyyy-MM-dd HH:mm}");

            await LogAuditAsync(new AuditLog
            {
                Action = "UPDATE_TICKET_TYPE",
                EntityId = updated.Id,
                EntityType = nameof(Domain.Entities.TicketType),
                Details = $"Cập nhật loại vé: {updated.Name}. Thay đổi: {string.Join(", ", changes)}",
                PerformedBy = updatedBy,
                Timestamp = DateTime.UtcNow
            });

            return MapToDto(updated);
        }

        // Xóa TicketType - không cho xóa nếu đã có vé bán
        public async Task<bool> DeleteTicketTypeAsync(Guid id, string deletedBy)
        {
            var ticketType = await _ticketTypeRepository.GetByIdAsync(id);
            if (ticketType == null)
                throw new InvalidOperationException($"Không tìm thấy loại vé với ID: {id}");

            // Kiểm tra nếu đã có vé bán thì không cho xóa
            var soldCount = await _ticketTypeRepository.GetSoldCountAsync(id);
            if (soldCount > 0)
                throw new InvalidOperationException(
                    $"Không thể xóa loại vé này vì đã có {soldCount} vé được bán");

            // Xóa
            var result = await _ticketTypeRepository.DeleteAsync(id);

            if (result)
            {
                // Ghi AuditLog
                await LogAuditAsync(new AuditLog
                {
                    Action = "DELETE_TICKET_TYPE",
                    EntityId = id,
                    EntityType = nameof(Domain.Entities.TicketType),
                    Details = $"Xóa loại vé: {ticketType.Name}",
                    PerformedBy = deletedBy,
                    Timestamp = DateTime.UtcNow
                });
            }

            return result;
        }

        // Trừ sức chứa khi mua vé
        public async Task<bool> ReserveCapacityAsync(Guid ticketTypeId, int count, string performedBy)
        {
            if (count <= 0)
                throw new InvalidOperationException("Số lượng phải lớn hơn 0");

            var ticketType = await _ticketTypeRepository.GetByIdAsync(ticketTypeId);
            if (ticketType == null)
                throw new InvalidOperationException($"Không tìm thấy loại vé với ID: {ticketTypeId}");

            // Gọi method ReserveCapacity trên entity (nó sẽ validate và ném exception nếu không đủ)
            ticketType.ReserveCapacity(count);

            // Lưu
            await _ticketTypeRepository.UpdateAsync(ticketType);

            // Ghi AuditLog
            await LogAuditAsync(new AuditLog
            {
                Action = "RESERVE_CAPACITY",
                EntityId = ticketTypeId,
                EntityType = nameof(Domain.Entities.TicketType),
                Details = $"Đặt chỗ {count} vé của loại '{ticketType.Name}'. Còn lại: {ticketType.RemainingCapacity}",
                PerformedBy = performedBy,
                Timestamp = DateTime.UtcNow
            });

            return true;
        }

        // Cộng lại sức chứa khi hủy vé
        public async Task<bool> ReleaseCapacityAsync(Guid ticketTypeId, int count, string performedBy)
        {
            if (count <= 0)
                throw new InvalidOperationException("Số lượng phải lớn hơn 0");

            var ticketType = await _ticketTypeRepository.GetByIdAsync(ticketTypeId);
            if (ticketType == null)
                throw new InvalidOperationException($"Không tìm thấy loại vé với ID: {ticketTypeId}");

            // Gọi method ReleaseCapacity trên entity
            ticketType.ReleaseCapacity(count);

            // Lưu
            await _ticketTypeRepository.UpdateAsync(ticketType);

            // Ghi AuditLog
            await LogAuditAsync(new AuditLog
            {
                Action = "RELEASE_CAPACITY",
                EntityId = ticketTypeId,
                EntityType = nameof(Domain.Entities.TicketType),
                Details = $"Hoàn lại {count} vé của loại '{ticketType.Name}'. Còn lại: {ticketType.RemainingCapacity}",
                PerformedBy = performedBy,
                Timestamp = DateTime.UtcNow
            });

            return true;
        }

        // Map TicketType entity sang DTO
        private TicketTypeDto MapToDto(Domain.Entities.TicketType ticketType)
        {
            return new TicketTypeDto
            {
                Id = ticketType.Id,
                EventId = ticketType.EventId,
                Name = ticketType.Name,
                Price = ticketType.Price,
                MaxCapacity = ticketType.MaxCapacity,
                RemainingCapacity = ticketType.RemainingCapacity,
                MaxPerUser = ticketType.MaxPerPerson,
                SaleStartTime = ticketType.SaleStartTime,
                SaleEndTime = ticketType.SaleEndTime,
                DisplayOrder = ticketType.DisplayOrder,
                AccessType = (int)ticketType.AccessType,
                IsActive = ticketType.IsActive,
                CreatedAt = ticketType.CreatedAt,
                CreatedBy = ticketType.CreatedBy,
                UpdatedAt = ticketType.UpdatedAt,
                UpdatedBy = ticketType.UpdatedBy
            };
        }

        // Ghi log AuditLog
        private async Task LogAuditAsync(AuditLog log)
        {
            await _auditLogRepository.AddAsync(log);
        }
    }
}
