using TicketSystem.Application.DTOs;
using System.Threading.Tasks;

namespace TicketSystem.Application.Interfaces
{
    public interface IGeminiService
    {
        Task<string> GenerateContentAsync(string prompt, CancellationToken cancellationToken = default);
    }
}
