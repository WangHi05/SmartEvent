using System;
using System.Collections;
using System.Threading.Tasks;
using TicketSystem.Domain.Common;
using TicketSystem.Domain.Interfaces;
using TicketSystem.Infrastructure.Data; 

namespace TicketSystem.Infrastructure.Repositories
{
    public class UnitOfWork : IUnitOfWork
    {
        // Sử dụng trực tiếp ApplicationDbContext
        private readonly ApplicationDbContext _context;
        private Hashtable? _repositories;

        // Tiêm trực tiếp ApplicationDbContext vào
        public UnitOfWork(ApplicationDbContext context)
        {
            _context = context; 
        }

        public IGenericRepository<T> Repository<T>() where T : BaseEntity
        {
            if (_repositories == null)
                _repositories = new Hashtable();

            var type = typeof(T).Name;

            if (!_repositories.ContainsKey(type))
            {
                var repositoryType = typeof(GenericRepository<>);
                // Tạo instance của GenericRepository và truyền _context vào
                var repositoryInstance = Activator.CreateInstance(repositoryType.MakeGenericType(typeof(T)), _context);
                
                _repositories.Add(type, repositoryInstance);
            }

            return (IGenericRepository<T>)_repositories[type]!;
        }

        public async Task<int> Complete()
        {
            // Thực thi lưu xuống Database
            return await _context.SaveChangesAsync();
        }

        public void Dispose()
        {
            _context.Dispose();
            GC.SuppressFinalize(this);
        }
    }
}