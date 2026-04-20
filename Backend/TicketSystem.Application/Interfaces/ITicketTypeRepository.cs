using TicketSystem.Domain.Entities;
using TicketSystem.Domain.Interfaces;

namespace TicketSystem.Application.Interfaces
{
    // Interface repository cho TicketType
    // Mở rộng IGenericRepository để định nghĩa các câu query chuyên biệt
    public interface ITicketTypeRepository : IGenericRepository<TicketType>
    {
        // Lấy danh sách TicketType của một Event, sắp xếp theo DisplayOrder
        Task<IEnumerable<TicketType>> GetByEventIdAsync(Guid eventId);

        // Lấy danh sách TicketType của một Event với phân trang
        Task<(IEnumerable<TicketType> TicketTypes, int TotalCount)> GetPagedTicketTypesByEventAsync(
            Guid eventId, int pageNumber, int pageSize);

        // Lấy số lượng vé đã bán cho một TicketType (dùng để kiểm tra trước khi xóa)
        Task<int> GetSoldCountAsync(Guid ticketTypeId);

        // Tính tổng MaxCapacity của tất cả TicketTypes trong một Event
        // Dùng để validate: tổng không được vượt Event.MaxCapacity
        Task<int> GetTotalMaxCapacityByEventAsync(Guid eventId);

        // Kiểm tra xem tên TicketType có duy nhất trong một Event không
        Task<bool> IsNameUniqueInEventAsync(Guid eventId, string name, Guid? excludeTicketTypeId = null);

        // Lấy TicketType của một Event theo tên
        Task<TicketType?> GetByNameAndEventAsync(Guid eventId, string name);
    }
}
