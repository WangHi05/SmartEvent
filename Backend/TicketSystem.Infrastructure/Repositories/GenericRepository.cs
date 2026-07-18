using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TicketSystem.Domain.Common;
using TicketSystem.Domain.Interfaces;
using TicketSystem.Infrastructure.Data; 

namespace TicketSystem.Infrastructure.Repositories
{
    public class GenericRepository<T> : IGenericRepository<T> where T : Domain.Common.BaseEntity
    {
        // Sử dụng trực tiếp ApplicationDbContext của dự án
        protected readonly ApplicationDbContext _context;
        protected readonly DbSet<T> _dbSet;

        // Tiêm trực tiếp ApplicationDbContext vào
        public GenericRepository(ApplicationDbContext context)
        {
            _context = context; 
            _dbSet = _context.Set<T>();
        }

        public async Task<T?> GetByIdAsync(Guid id)
        {
            return await _dbSet.FindAsync(id);
        }

        public async Task<IEnumerable<T>> GetAllAsync()
        {
            return await _dbSet.ToListAsync();
        }

        public async Task<T> AddAsync(T entity)
        {
            await _dbSet.AddAsync(entity);
            return entity;
        }

        public Task<T> UpdateAsync(T entity)
        {
            _dbSet.Update(entity);
            return Task.FromResult(entity);
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var entity = await _dbSet.FindAsync(id);
            if (entity == null) return false;
            
            _dbSet.Remove(entity);
            return true;
        }

        public async Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> predicate)
        {
            return await _dbSet.Where(predicate).ToListAsync();
        }

        public async Task<T?> FirstOrDefaultAsync(Expression<Func<T, bool>> predicate)
        {
            return await _dbSet.FirstOrDefaultAsync(predicate);
        }
    }
}