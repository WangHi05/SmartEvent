using Microsoft.EntityFrameworkCore;
using TicketSystem.Application.Interfaces;
using TicketSystem.Domain.Entities;
using TicketSystem.Domain.Common;
using TicketSystem.Infrastructure.Data;

namespace TicketSystem.Infrastructure.Repositories
{
    // Kế thừa GenericRepository và implement IUserRepository
    public class UserRepository : GenericRepository<User>, IUserRepository
    {
        private readonly ApplicationDbContext _context;

        public UserRepository(ApplicationDbContext context) : base(context)
        {
            _context = context;
        }

        // XỬ LÝ HIỆU NĂNG: Phân trang trực tiếp bằng SQL Query thông qua EF Core
        public async Task<(IEnumerable<User> Users, int TotalCount)> GetPagedUsersAsync(int pageNumber, int pageSize, string? searchTerm, UserRole? role)
        {
            var query = _context.Set<User>().AsQueryable();

            if (!string.IsNullOrEmpty(searchTerm))
            {
                var term = searchTerm.ToLower();
                query = query.Where(u => u.Username.ToLower().Contains(term) || 
                                         u.FullName.ToLower().Contains(term) || 
                                         u.Email.ToLower().Contains(term));
            }

            if (role.HasValue)
            {
                query = query.Where(u => u.Role == role.Value);
            }

            var totalCount = await query.CountAsync();
            var users = await query
                .OrderByDescending(u => u.CreatedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (users, totalCount);
        }

        public async Task<bool> IsUsernameUniqueAsync(string username) => 
            !await _context.Set<User>().AnyAsync(u => u.Username == username);

        public async Task<bool> IsEmailUniqueAsync(string email, Guid? excludeUserId = null) =>
            !await _context.Set<User>().AnyAsync(u => u.Email == email && u.Id != excludeUserId);

        public async Task<User?> GetByUsernameAsync(string username) =>
            await _context.Set<User>().FirstOrDefaultAsync(u => u.Username == username);
    }
}