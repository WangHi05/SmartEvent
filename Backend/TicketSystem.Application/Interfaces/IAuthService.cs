using System.Threading.Tasks;
using TicketSystem.Application.DTOs;

namespace TicketSystem.Application.Interfaces
{
    public interface IAuthService
    {
        Task<AuthResponseDto?> AuthenticateAsync(string username, string password);
        Task<UserResponseDto> RegisterCustomerAsync(CreateUserDto dto, string createdBy);
        Task<bool> ForgotPasswordAsync(string email);
        Task<bool> ResetPasswordAsync(string email, string token, string newPassword);
        Task<AuthResponseDto?> ExternalLoginAsync(string email, string fullName, string provider, string providerId);
    }
}