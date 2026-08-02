using System;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TicketSystem.Application.Common;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Interfaces;
using TicketSystem.Domain.Common;
using TicketSystem.Domain.Entities;

namespace TicketSystem.Application.Services
{
    public class EmployeeService : IEmployeeService
    {
        private readonly IApplicationDbContext _context;
        private readonly IPasswordHasher _passwordHasher;

        public EmployeeService(IApplicationDbContext context, IPasswordHasher passwordHasher)
        {
            _context = context;
            _passwordHasher = passwordHasher;
        }

        public async Task<UserListDto> GetEmployeesAsync(int pageNumber, int pageSize, string? searchTerm, string? role)
        {
            var query = _context.Employees.AsQueryable();

            if (!string.IsNullOrEmpty(searchTerm))
            {
                var term = searchTerm.ToLower();
                query = query.Where(e => e.Username.ToLower().Contains(term) ||
                                          e.FullName.ToLower().Contains(term) ||
                                          e.Email.ToLower().Contains(term));
            }

            if (!string.IsNullOrEmpty(role) && Enum.TryParse<UserRole>(role, true, out var roleEnum))
            {
                query = query.Where(e => e.Role == roleEnum);
            }

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(e => e.CreatedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new UserListDto
            {
                Items = items.Select(MapToDto).ToList(),
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize = pageSize
            };
        }

        public async Task<UserResponseDto?> GetEmployeeByIdAsync(Guid id)
        {
            var employee = await _context.Employees.FirstOrDefaultAsync(e => e.Id == id);
            return employee == null ? null : MapToDto(employee);
        }

        public async Task<UserResponseDto> CreateEmployeeAsync(CreateUserDto dto, string avatarUrl, string createdBy)
        {
            if (await _context.Employees.AnyAsync(e => e.Username == dto.Username) ||
                await _context.Customers.AnyAsync(c => c.Username == dto.Username))
                throw new ArgumentException($"Username '{dto.Username}' đã tồn tại");

            if (await _context.Employees.AnyAsync(e => e.Email == dto.Email) ||
                await _context.Customers.AnyAsync(c => c.Email == dto.Email))
                throw new ArgumentException($"Email '{dto.Email}' đã được sử dụng");

            if (!Enum.TryParse<UserRole>(dto.Role, true, out var roleEnum))
                throw new ArgumentException("Role không hợp lệ.");

            if (string.IsNullOrWhiteSpace(avatarUrl))
                throw new ArgumentException("Ảnh đại diện là bắt buộc đối với tài khoản nhân viên.");

            var passwordHash = _passwordHasher.HashPassword(dto.Password);
            var employee = Employee.Create(dto.Username, passwordHash, dto.FullName, dto.Email, roleEnum, avatarUrl, createdBy);

            _context.Employees.Add(employee);
            await _context.SaveChangesAsync();
            await LogAuditAsync("Create", "Employee", employee.Id, createdBy, $"Created employee: {employee.Username}");

            return MapToDto(employee);
        }

        public async Task<UserResponseDto?> UpdateEmployeeAsync(UpdateUserDto dto, string? avatarUrl, string updatedBy)
        {
            var employee = await _context.Employees.FirstOrDefaultAsync(e => e.Id == dto.Id);
            if (employee == null) return null;

            if (!string.IsNullOrEmpty(dto.Email) &&
                !string.Equals(dto.Email, employee.Email, StringComparison.OrdinalIgnoreCase) &&
                (await _context.Employees.AnyAsync(e => e.Email == dto.Email && e.Id != dto.Id) ||
                 await _context.Customers.AnyAsync(c => c.Email == dto.Email)))
            {
                throw new ArgumentException($"Email '{dto.Email}' đã được sử dụng");
            }

            var roleEnum = string.IsNullOrEmpty(dto.Role) ? employee.Role : Enum.Parse<UserRole>(dto.Role, true);

            employee.UpdateProfile(dto.FullName ?? employee.FullName, dto.Email ?? employee.Email, dto.PhoneNumber ?? employee.PhoneNumber, roleEnum, avatarUrl, updatedBy);

            if (dto.IsActive.HasValue)
                employee.SetStatus(dto.IsActive.Value, updatedBy);

            if (!string.IsNullOrEmpty(dto.NewPassword))
                employee.ChangePassword(_passwordHasher.HashPassword(dto.NewPassword), updatedBy);

            await _context.SaveChangesAsync();
            await LogAuditAsync("Update", "Employee", employee.Id, updatedBy, $"Updated employee: {employee.Username}");

            return MapToDto(employee);
        }

        public async Task<bool> DeleteEmployeeAsync(Guid id, string deletedBy)
        {
            var employee = await _context.Employees.FirstOrDefaultAsync(e => e.Id == id);
            if (employee == null) return false;

            var username = employee.Username;
            _context.Employees.Remove(employee);
            await _context.SaveChangesAsync();

            await LogAuditAsync("Delete", "Employee", id, deletedBy, $"Deleted employee: {username}");
            return true;
        }

        public async Task<bool> SetActiveStatusAsync(Guid id, bool isActive, string updatedBy)
        {
            var employee = await _context.Employees.FirstOrDefaultAsync(e => e.Id == id);
            if (employee == null) return false;

            employee.SetStatus(isActive, updatedBy);
            await _context.SaveChangesAsync();

            var action = isActive ? "Unlock" : "Lock";
            await LogAuditAsync(action, "Employee", employee.Id, updatedBy, $"{action} employee: {employee.Username}");

            return true;
        }

        public async Task<string?> ResetPasswordAsync(Guid id, string updatedBy)
        {
            var employee = await _context.Employees.FirstOrDefaultAsync(e => e.Id == id);
            if (employee == null) return null;

            var newPassword = GenerateRandomPassword();
            employee.ChangePassword(_passwordHasher.HashPassword(newPassword), updatedBy);

            await _context.SaveChangesAsync();
            await LogAuditAsync("ResetPassword", "Employee", employee.Id, updatedBy, $"Admin reset password for employee: {employee.Username}");

            return newPassword;
        }

        private static string GenerateRandomPassword()
        {
            // Bỏ các ký tự dễ nhầm lẫn (0/O, 1/I/l)
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
            var bytes = RandomNumberGenerator.GetBytes(10);
            var sb = new StringBuilder(10);
            foreach (var b in bytes)
            {
                sb.Append(chars[b % chars.Length]);
            }
            return sb.ToString();
        }

        private static UserResponseDto MapToDto(Employee e) => new UserResponseDto
        {
            Id = e.Id,
            Username = e.Username,
            FullName = e.FullName,
            Email = e.Email,
            PhoneNumber = e.PhoneNumber,
            Role = e.Role.ToString(),
            IsActive = e.IsActive,
            AvatarUrl = e.AvatarUrl,
            CreatedAt = e.CreatedAt
        };



        private async Task LogAuditAsync(string action, string entityType, Guid entityId, string performedBy, string details)
        {
            _context.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                Action = action,
                EntityType = entityType,
                EntityId = entityId,
                PerformedBy = performedBy,
                Details = details,
                Timestamp = VietnamTime.Now,
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();
        }
    }
}