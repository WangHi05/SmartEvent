using System;
using System.Threading.Tasks;
using TicketSystem.Application.DTOs;

namespace TicketSystem.Application.Interfaces
{
    public interface IEmployeeService
    {
        Task<UserListDto> GetEmployeesAsync(int pageNumber, int pageSize, string? searchTerm, string? role);
        Task<UserResponseDto?> GetEmployeeByIdAsync(Guid id);
        Task<UserResponseDto> CreateEmployeeAsync(CreateUserDto dto, string avatarUrl, string createdBy);
        Task<UserResponseDto?> UpdateEmployeeAsync(UpdateUserDto dto, string? avatarUrl, string updatedBy);
        Task<bool> DeleteEmployeeAsync(Guid id, string deletedBy);

        Task<bool> SetActiveStatusAsync(Guid id, bool isActive, string updatedBy);

        

        /// <summary>
        /// Admin reset mật khẩu cho nhân viên: sinh mật khẩu ngẫu nhiên mới, lưu hash vào DB,
        /// trả về mật khẩu dạng plain-text (chỉ hiển thị 1 lần cho Admin copy gửi nhân viên).
        /// </summary>
        Task<string?> ResetPasswordAsync(Guid id, string updatedBy);
    }
}