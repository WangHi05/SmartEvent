namespace TicketSystem.Application.Interfaces
{
    public interface ITicketService
    {
        Task<string?> GetUnusedQrForTestAsync();
    }
}
