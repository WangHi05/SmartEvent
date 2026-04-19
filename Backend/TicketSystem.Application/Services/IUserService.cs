using TicketSystem.Application.DTOs;

namespace TicketSystem.Application.Services
{
    public interface IUserService
    {
        Task<UserListDto> GetUsersAsync(int pageNumber, int pageSize, string? searchTerm, string? role);
        Task<UserResponseDto?> GetUserByIdAsync(Guid id);
        Task<UserResponseDto> CreateUserAsync(CreateUserDto dto, string createdBy);
        Task<UserResponseDto?> UpdateUserAsync(UpdateUserDto dto, string updatedBy);
        Task<bool> DeleteUserAsync(Guid id, string deletedBy);
        Task<AuthResponseDto?> AuthenticateAsync(string username, string password);
    }
}