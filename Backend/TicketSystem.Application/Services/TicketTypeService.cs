using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TicketSystem.Application.Common;
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
            // Check if event exists
            var @event = await _eventRepository.GetByIdAsync(eventId);
            if (@event == null)
                throw new InvalidOperationException($"Không tìm thấy sự kiện với ID: {eventId}");

            // Validate Price
            if (request.Price < 0)
                throw new InvalidOperationException("Giá vé không được là số âm");

            // Validate Quantity
            if (request.Quantity <= 0)
                throw new InvalidOperationException("Số lượng phải > 0");

            if (request.Quantity > @event.MaxCapacity)
                throw new InvalidOperationException($"Số lượng không được vượt quá sức chứa sự kiện ({@event.MaxCapacity})");

            // Validate MaxPerUser must be positive
            if (request.MaxPerUser <= 0)
                throw new InvalidOperationException("Số vé tối đa trên một người phải > 0");

            // Validate name is unique
            var isNameUnique = await _ticketTypeRepository.IsNameUniqueInEventAsync(eventId, request.Name);
            if (!isNameUnique)
                throw new InvalidOperationException($"Tên loại vé '{request.Name}' đã tồn tại trong sự kiện này");

            // Validate SaleEndTime > SaleStartTime
            if (request.SaleEndTime <= request.SaleStartTime)
                throw new InvalidOperationException("Thời gian kết thúc bán phải sau thời gian bắt đầu bán");

            // Validate sale end depends on event type
            var saleDeadline = GetSaleDeadline(@event);
            if (request.SaleEndTime > saleDeadline)
            {
                throw new InvalidOperationException(@event.GetEventMode() == EventMode.ShortDay
                    ? "Sự kiện 1 ngày: thời gian kết thúc bán phải trước giờ bắt đầu sự kiện"
                    : "Sự kiện dài ngày: thời gian kết thúc bán phải trước giờ kết thúc sự kiện");
            }

            // Validate total quantity doesn't exceed event capacity
            var currentTotalCapacity = await _ticketTypeRepository.GetTotalMaxCapacityByEventAsync(eventId);
            if (currentTotalCapacity + request.Quantity > @event.MaxCapacity)
                throw new InvalidOperationException(
                    $"Tổng số lượng sẽ vượt quá giới hạn của sự kiện. " +
                    $"Hiện tại: {currentTotalCapacity}, yêu cầu thêm: {request.Quantity}, " +
                    $"giới hạn: {@event.MaxCapacity}");

            // Tạo entity TicketType
            var ticketType = new Domain.Entities.TicketType
            {
                EventId = eventId,
                Name = request.Name.Trim(),
                Price = request.Price,
                Quantity = request.Quantity,
                RemainingQuantity = request.Quantity,
                MaxPerUser = request.MaxPerUser,
                TicketMode = (TicketMode)request.TicketMode,
                UsageType = request.UsageType.HasValue ? (UsageType)request.UsageType : null,
                MinGroupSize = request.MinGroupSize,
                MaxGroupSize = request.MaxGroupSize,
                QRMode = request.QRMode.HasValue ? (QRMode)request.QRMode : null,
                PriceMode = request.PriceMode.HasValue ? (PriceMode)request.PriceMode : null,
                SaleStartTime = request.SaleStartTime,
                SaleEndTime = request.SaleEndTime,
                DisplayOrder = request.DisplayOrder,
                IsActive = request.IsActive,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = createdBy
            };

            // Lưu vào database
            var created = await _ticketTypeRepository.AddAsync(ticketType);

            // Ghi AuditLogố lượng: {created.Quant
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

            // Validate Price
            if (request.Price < 0)
                throw new InvalidOperationException("Giá vé không được là số âm");

            // Validate Quantity
            if (request.Quantity <= 0)
                throw new InvalidOperationException("Số lượng phải > 0");

            if (request.Quantity > @event.MaxCapacity)
                throw new InvalidOperationException($"Số lượng không được vượt quá sức chứa sự kiện ({@event.MaxCapacity})");

            // Validate MaxPerUser
            if (request.MaxPerUser <= 0)
                throw new InvalidOperationException("Số vé tối đa trên một người phải > 0");

            // Lưu giá trị cũ để logging
            var oldPrice = ticketType.Price;
            var oldQuantity = ticketType.Quantity;
            var oldRemainingQuantity = ticketType.RemainingQuantity;
            var oldSaleTimes = $"{ticketType.SaleStartTime:yyyy-MM-dd HH:mm} - {ticketType.SaleEndTime:yyyy-MM-dd HH:mm}";

            // Sold count lấy từ dữ liệu Ticket thực tế để tự phục hồi các bản ghi bị lệch RemainingQuantity.
            var soldCount = await _ticketTypeRepository.GetSoldCountAsync(id);

            // Không cho giảm Quantity xuống thấp hơn số vé đã bán
            if (request.Quantity < soldCount)
            {
                throw new InvalidOperationException(
                    $"Không thể cập nhật số lượng xuống {request.Quantity} vì đã có {soldCount} vé được bán");
            }

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
            ticketType.Quantity = request.Quantity;
            // Đồng bộ RemainingQuantity theo số vé đã bán để tránh bị kẹt 0 vé còn lại.
            ticketType.RemainingQuantity = request.Quantity - soldCount;
            ticketType.MaxPerUser = request.MaxPerUser;
            ticketType.TicketMode = (TicketMode)request.TicketMode;
            ticketType.UsageType = request.UsageType.HasValue ? (UsageType)request.UsageType : null;
            ticketType.MinGroupSize = request.MinGroupSize;
            ticketType.MaxGroupSize = request.MaxGroupSize;
            ticketType.QRMode = request.QRMode.HasValue ? (QRMode)request.QRMode : null;
            ticketType.PriceMode = request.PriceMode.HasValue ? (PriceMode)request.PriceMode : null;
            ticketType.SaleStartTime = request.SaleStartTime;
            ticketType.SaleEndTime = request.SaleEndTime;
            ticketType.DisplayOrder = request.DisplayOrder;
            ticketType.IsActive = request.IsActive;

            // Update metadata
            ticketType.UpdatedAt = DateTime.UtcNow;
            ticketType.UpdatedBy = updatedBy;

            // Save to database
            var updated = await _ticketTypeRepository.UpdateAsync(ticketType);

            // Log audit
            var changes = new List<string>();
            if (oldPrice != updated.Price) changes.Add($"Giá: {oldPrice} → {updated.Price}");
            if (oldQuantity != updated.Quantity) changes.Add($"Số lượng: {oldQuantity} → {updated.Quantity}");
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
                Details = $"Đặt chỗ {count} vé của loại '{ticketType.Name}'. Còn lại: {ticketType.RemainingQuantity}",
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
                Details = $"Hoàn lại {count} vé của loại '{ticketType.Name}'. Còn lại: {ticketType.RemainingQuantity}",
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
                TicketMode = (int)ticketType.TicketMode,
                Name = ticketType.Name,
                Price = ticketType.Price,
                Quantity = ticketType.Quantity,
                RemainingQuantity = ticketType.RemainingQuantity,
                MaxPerUser = ticketType.MaxPerUser,
                UsageType = ticketType.UsageType.HasValue ? (int)ticketType.UsageType : null,
                MinGroupSize = ticketType.MinGroupSize,
                MaxGroupSize = ticketType.MaxGroupSize,
                QRMode = ticketType.QRMode.HasValue ? (int)ticketType.QRMode : null,
                PriceMode = ticketType.PriceMode.HasValue ? (int)ticketType.PriceMode : null,
                SaleStartTime = ticketType.SaleStartTime,
                SaleEndTime = ticketType.SaleEndTime,
                IsCurrentlyOnSale = IsCurrentlyOnSale(ticketType),
                SaleStatusName = GetSaleStatusName(ticketType),
                DisplayOrder = ticketType.DisplayOrder,
                IsActive = ticketType.IsActive,
                CreatedAt = ticketType.CreatedAt,
                CreatedBy = ticketType.CreatedBy ?? string.Empty,
                UpdatedAt = ticketType.UpdatedAt,
                UpdatedBy = ticketType.UpdatedBy
            };
        }

        private static DateTime GetSaleDeadline(Event @event)
        {
            return @event.GetEventMode() == EventMode.ShortDay ? @event.StartTime : @event.EndTime;
        }

        private static bool IsCurrentlyOnSale(Domain.Entities.TicketType ticketType)
        {
            var now = VietnamTime.Now;
            var saleStartTime = VietnamTime.ToVietnamTime(ticketType.SaleStartTime);
            var saleEndTime = VietnamTime.ToVietnamTime(ticketType.SaleEndTime);
            return ticketType.IsActive && saleStartTime <= now && now <= saleEndTime;
        }

        private static string GetSaleStatusName(Domain.Entities.TicketType ticketType)
        {
            if (!ticketType.IsActive)
                return "Tắt";

            var now = VietnamTime.Now;
            var saleStartTime = VietnamTime.ToVietnamTime(ticketType.SaleStartTime);
            var saleEndTime = VietnamTime.ToVietnamTime(ticketType.SaleEndTime);

            if (now < saleStartTime)
                return "Chưa mở bán";

            if (now <= saleEndTime)
                return "Đang mở bán";

            return "Đã kết thúc";
        }

        // Ghi log AuditLog
        private async Task LogAuditAsync(AuditLog log)
        {
            await _auditLogRepository.AddAsync(log);
        }
    }
}
