using MediatR;
using TicketSystem.Domain.Entities;

namespace TicketSystem.Application.Events;

public class TicketCheckedInEvent : INotification
{
    public Guid EventId { get; }
    public int PeopleCount { get; }
    public ScanType ScanType { get; }

    public TicketCheckedInEvent(Guid eventId, int peopleCount, ScanType scanType)
    {
        EventId = eventId;
        PeopleCount = peopleCount;
        ScanType = scanType;
    }
}