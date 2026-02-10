 using System;
using System.Collections.Generic;
using System.Threading.Tasks;
 using TicketSystem.Domain.Common;


namespace TicketSystem.Domain.Interfaces
{
    /// <summary>
    /// Repository Pattern mẫu để dùng chung cho tất cả thực thể
    /// </summary>
    public interface IGenericRepository<T> where T : BaseEntity
    {
        Task<T?> GetByIdAsync(Guid id);
        Task<IEnumerable<T>> GetAllAsync();
        Task AddAsync(T entity);
        void Update(T entity);
        void Delete(T entity);
    }

     public interface IUnitOfWork : IDisposable
    {
        IGenericRepository<T> Repository<T>() where T : BaseEntity;
        Task<int> Complete(); // Tương đương SaveChangesAsync
    }
}