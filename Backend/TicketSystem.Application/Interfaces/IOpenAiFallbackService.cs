using System.Threading;
using System.Threading.Tasks;

namespace TicketSystem.Application.Interfaces
{
    public interface IOpenAiFallbackService
    {
        Task<string> GenerateContentAsync(string prompt, CancellationToken cancellationToken = default);
    }
}