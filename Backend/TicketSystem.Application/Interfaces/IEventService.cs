using TicketSystem.Application.DTOs;
using TicketSystem.Domain.Common;

namespace TicketSystem.Application.Interfaces
{
    public interface IEventService
    {
        Task<PagedResult<EventResponseDto>> SearchEventsAsync(EventSearchRequest request);
        Task<bool> UpdateStatusAsync(Guid eventId, EventStatus newStatus);

        Task<EventListDto> GetEventsAsync(int pageNumber, int pageSize);
        
        Task<EventResponseDto?> GetEventByIdAsync(Guid id);
        
        Task<EventResponseDto> CreateEventAsync(CreateEventDto request, string createdBy);
        
        Task<EventResponseDto?> UpdateEventAsync(UpdateEventDto request, string updatedBy);
        
        Task<bool> DeleteEventAsync(Guid id, string deletedBy);
    }
}