using TicketSystem.Domain.Entities;
using TicketSystem.Domain.Common;
using TicketSystem.Domain.Interfaces;

namespace TicketSystem.Application.Interfaces
{
    // Mở rộng từ IGenericRepository để định nghĩa các câu query chuyên biệt cho User
    public interface IUserRepository : IGenericRepository<User>
    {
        // Hàm này sẽ được implement bằng EF Core IQueryable để phân trang tại Database
        Task<(IEnumerable<User> Users, int TotalCount)> GetPagedUsersAsync(
            int pageNumber, int pageSize, string? searchTerm, UserRole? role);
            
        Task<bool> IsUsernameUniqueAsync(string username);
        Task<bool> IsEmailUniqueAsync(string email, Guid? excludeUserId = null);
        Task<User?> GetByUsernameAsync(string username);
    }
}
