using TicketSystem.Application.DTOs;
using TicketSystem.Domain.Common;

namespace TicketSystem.Application.Interfaces
{
    public interface IEventService
    {
        Task<PagedResult<EventResponseDto>> SearchEventsAsync(EventSearchRequest request);

        Task<EventListDto> GetEventsAsync(int pageNumber, int pageSize);
        
        Task<EventResponseDto?> GetEventByIdAsync(Guid id);
        
        Task<EventResponseDto> CreateEventAsync(CreateEventDto request, string createdBy);
        
        Task<EventResponseDto?> UpdateEventAsync(UpdateEventDto request, string updatedBy);
        
        Task<bool> DeleteEventAsync(Guid id, string deletedBy);

        Task AutoUpdateCompletedEventsAsync();

        Task<EventResponseDto?> ApproveEventAsync(Guid eventId, string approvedBy);

        Task<EventResponseDto?> ArchiveEventAsync(Guid eventId, string archivedBy);

        Task<EventResponseDto?> UnarchiveEventAsync(Guid eventId, string restoredBy);

        Task<PagedResult<EventResponseDto>> GetArchivedEventsAsync(int pageNumber, int pageSize, string? keyword = null);
    }
}