using System.Threading.Tasks;

namespace TicketSystem.Application.Interfaces
{
    /// <summary>
    /// Giao diện định nghĩa các nghiệp vụ quản lý Database cấp thấp.
    /// Thuộc Layer: Application (Core)
    /// </summary>
    public interface IDatabaseManagementService
    {
        /// <summary>
        /// Xóa toàn bộ dữ liệu giao dịch và master data (chỉ dùng cho môi trường Dev).
        /// </summary>
        Task ClearAllMockDataAsync();
    }
}