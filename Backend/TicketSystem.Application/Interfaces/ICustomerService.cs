using System;
using System.Security.Claims;
using System.Threading.Tasks;
using TicketSystem.Application.DTOs;

namespace TicketSystem.Application.Interfaces
{
    public interface ICustomerService
    {
        Task<UserListDto> GetCustomersAsync(int pageNumber, int pageSize, string? searchTerm);
        Task<UserResponseDto?> GetCustomerByIdAsync(Guid id);
        Task<UserResponseDto?> GetCurrentCustomerAsync();
        Task<UserResponseDto?> UpdateCustomerByAdminAsync(UpdateUserDto dto, string updatedBy);
        Task<UserResponseDto?> UpdateCurrentCustomerAsync(CustomerProfileDto dto, string updatedBy);
        Task<(bool Success, string? ErrorMessage)> ChangeCurrentCustomerPasswordAsync(ChangePasswordDto dto, string updatedBy);
        Task<bool> DeleteCustomerAsync(Guid id, string deletedBy);
        Task<bool> SetActiveStatusAsync(Guid id, bool isActive, string updatedBy);
        
    }
}