using System;
using System.Collections.Generic;
using System.Linq.Expressions;
using System.Threading.Tasks;
using TicketSystem.Domain.Common;

namespace TicketSystem.Domain.Interfaces
{
    
    /// Repository Pattern mẫu để dùng chung cho tất cả thực thể
    /// Cung cấp các operations CRUD cơ bản và query
    
    public interface IGenericRepository<T> where T : BaseEntity
    {
        Task<T?> GetByIdAsync(Guid id);
        Task<IEnumerable<T>> GetAllAsync();
        Task<T> AddAsync(T entity);
        Task<T> UpdateAsync(T entity);
        Task<bool> DeleteAsync(Guid id);
        Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> predicate);
        Task<T?> FirstOrDefaultAsync(Expression<Func<T, bool>> predicate);
    }

     public interface IUnitOfWork : IDisposable
    {
        IGenericRepository<T> Repository<T>() where T : BaseEntity;
        Task<int> Complete(); // Tương đương SaveChangesAsync
    }

}