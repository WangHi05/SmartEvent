using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using TicketSystem.Domain.Entities;

namespace TicketSystem.Infrastructure.Data
{
    public class DatabaseSeeder
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<DatabaseSeeder> _logger;

        public DatabaseSeeder(ApplicationDbContext context, ILogger<DatabaseSeeder> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task SeedAsync()
        {
            try
            {
                var hasEvents = await _context.Events.AnyAsync();
                if (hasEvents)
                {
                    _logger.LogInformation("Database already has events. Skipping seed.");
                    return;
                }

                _logger.LogInformation("Database has no events yet. Manual SQL seeding is expected, so no default data was inserted.");
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "Error occurred during database seeding");
            }
        }
    }
}
