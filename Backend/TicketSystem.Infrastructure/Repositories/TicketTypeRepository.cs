using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TicketSystem.Application.Interfaces;
using TicketSystem.Domain.Entities;
using TicketSystem.Infrastructure.Data;

namespace TicketSystem.Infrastructure.Repositories
{
    // Repository implementation cho TicketType
    // Triển khai các câu query chuyên biệt cho TicketType
    public class TicketTypeRepository : GenericRepository<TicketType>, ITicketTypeRepository
    {
        private readonly ApplicationDbContext _context;

        public TicketTypeRepository(ApplicationDbContext context) : base(context)
        {
            _context = context;
        }

        // Lấy danh sách TicketType của một Event, sắp xếp theo DisplayOrder
        public async Task<IEnumerable<TicketType>> GetByEventIdAsync(Guid eventId)
        {
            return await _context.TicketTypes
                .Where(tt => tt.EventId == eventId && tt.IsActive)
                .OrderBy(tt => tt.DisplayOrder)
                .ToListAsync();
        }

        // Lấy danh sách TicketType của một Event với phân trang
        public async Task<(IEnumerable<TicketType> TicketTypes, int TotalCount)> GetPagedTicketTypesByEventAsync(
            Guid eventId, int pageNumber, int pageSize)
        {
            // Validate phân trang
            if (pageNumber < 1) pageNumber = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100;

            var query = _context.TicketTypes.Where(tt => tt.EventId == eventId);
            
            var totalCount = await query.CountAsync();
            
            var ticketTypes = await query
                .OrderBy(tt => tt.DisplayOrder)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (ticketTypes, totalCount);
        }

        // Lấy số lượng vé đã bán cho một TicketType
        // Đếm số Ticket có TicketTypeId = ticketTypeId và Status != CANCELLED
        public async Task<int> GetSoldCountAsync(Guid ticketTypeId)
        {
            return await _context.Tickets
                .Where(t => t.TicketTypeId == ticketTypeId && 
                           t.Status != Domain.Entities.TicketStatus.CANCELLED)
                .CountAsync();
        }

        // Tính tổng MaxCapacity của tất cả TicketTypes trong một Event
        public async Task<int> GetTotalMaxCapacityByEventAsync(Guid eventId)
        {
            return await _context.TicketTypes
                .Where(tt => tt.EventId == eventId)
                .SumAsync(tt => tt.MaxCapacity);
        }

        // Kiểm tra xem tên TicketType có duy nhất trong một Event không
        // Có thể exclude một TicketType nếu cập nhật
        public async Task<bool> IsNameUniqueInEventAsync(Guid eventId, string name, Guid? excludeTicketTypeId = null)
        {
            var query = _context.TicketTypes
                .Where(tt => tt.EventId == eventId && tt.Name.ToLower() == name.ToLower());

            if (excludeTicketTypeId.HasValue)
                query = query.Where(tt => tt.Id != excludeTicketTypeId.Value);

            return !await query.AnyAsync();
        }

        // Lấy TicketType của một Event theo tên
        public async Task<TicketType?> GetByNameAndEventAsync(Guid eventId, string name)
        {
            return await _context.TicketTypes
                .FirstOrDefaultAsync(tt => tt.EventId == eventId && tt.Name.ToLower() == name.ToLower());
        }
    }
}
