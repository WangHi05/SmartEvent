using TicketSystem.Domain.Entities;

namespace TicketSystem.Application.Interfaces
{
    public interface IJwtTokenGenerator
    {
        string GenerateToken(User user);
    }
}