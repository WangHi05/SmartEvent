using TicketSystem.Application.DTOs;
using System.Threading.Tasks;

namespace TicketSystem.Application.Interfaces
{
    public interface IAiAnalysisService
    {
        Task<AiAnalysisResponseDto> GetEventAnalysisAsync(TicketStatisticsDto statistics);
        Task<AiAnalysisResponseDto> GetGateCrowdAnalysisAsync(object gateData);
    }
}