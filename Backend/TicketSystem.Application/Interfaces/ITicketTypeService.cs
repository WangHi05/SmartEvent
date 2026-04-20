using TicketSystem.Application.DTOs;

namespace TicketSystem.Application.Interfaces
{
    // Interface service cho TicketType
    // Chứa business logic liên quan đến quản lý loại vé
    public interface ITicketTypeService
    {
        // Lấy danh sách TicketType của một Event
        Task<IEnumerable<TicketTypeDto>> GetTicketTypesByEventAsync(Guid eventId);

        // Lấy danh sách TicketType với phân trang
        Task<(IEnumerable<TicketTypeDto> TicketTypes, int TotalCount)> GetPagedTicketTypesByEventAsync(
            Guid eventId, int pageNumber, int pageSize);

        // Lấy chi tiết một TicketType
        Task<TicketTypeDto?> GetTicketTypeByIdAsync(Guid id);

        // Tạo mới TicketType - validate tên, capacity, thời gian bán
        Task<TicketTypeDto> CreateTicketTypeAsync(Guid eventId, CreateTicketTypeDto request, string createdBy);

        // Cập nhật TicketType - validate maxCapacity không nhỏ hơn vé đã bán
        Task<TicketTypeDto> UpdateTicketTypeAsync(Guid id, UpdateTicketTypeDto request, string updatedBy);

        // Xóa TicketType - không cho xóa nếu đã có vé bán
        Task<bool> DeleteTicketTypeAsync(Guid id, string deletedBy);

        // Trừ sức chứa khi mua vé - ghi log RESERVE_CAPACITY
        Task<bool> ReserveCapacityAsync(Guid ticketTypeId, int count, string performedBy);

        // Cộng lại sức chứa khi hủy vé - ghi log RELEASE_CAPACITY
        Task<bool> ReleaseCapacityAsync(Guid ticketTypeId, int count, string performedBy);
    }
}
