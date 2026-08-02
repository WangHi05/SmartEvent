using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using TicketSystem.Application.Common;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Interfaces;
using TicketSystem.Domain.Entities;

namespace TicketSystem.Application.Services
{
    public class CustomerService : ICustomerService
    {
        private readonly IApplicationDbContext _context;
        private readonly IPasswordHasher _passwordHasher;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public CustomerService(IApplicationDbContext context, IPasswordHasher passwordHasher, IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _passwordHasher = passwordHasher;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<UserListDto> GetCustomersAsync(int pageNumber, int pageSize, string? searchTerm)
        {
            var query = _context.Customers.AsQueryable();

            if (!string.IsNullOrEmpty(searchTerm))
            {
                var term = searchTerm.ToLower();
                query = query.Where(c => c.Username.ToLower().Contains(term) ||
                                          c.FullName.ToLower().Contains(term) ||
                                          c.Email.ToLower().Contains(term));
            }

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(c => c.CreatedAt)
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

        public async Task<UserResponseDto?> GetCustomerByIdAsync(Guid id)
        {
            var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Id == id);
            return customer == null ? null : MapToDto(customer);
        }

        public async Task<UserResponseDto?> GetCurrentCustomerAsync()
        {
            var id = GetCurrentUserId();
            if (!id.HasValue) return null;
            return await GetCustomerByIdAsync(id.Value);
        }

        public async Task<UserResponseDto?> UpdateCustomerByAdminAsync(UpdateUserDto dto, string updatedBy)
        {
            var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Id == dto.Id);
            if (customer == null) return null;

            if (!string.IsNullOrEmpty(dto.Email) &&
                !string.Equals(dto.Email, customer.Email, StringComparison.OrdinalIgnoreCase) &&
                (await _context.Customers.AnyAsync(c => c.Email == dto.Email && c.Id != dto.Id) ||
                 await _context.Employees.AnyAsync(e => e.Email == dto.Email)))
            {
                throw new ArgumentException($"Email '{dto.Email}' đã được sử dụng");
            }

            customer.UpdateProfile(dto.FullName ?? customer.FullName, dto.Email ?? customer.Email, dto.PhoneNumber ?? customer.PhoneNumber, dto.AvatarUrl, updatedBy);

            if (dto.IsActive.HasValue)
                customer.SetStatus(dto.IsActive.Value, updatedBy);

            if (!string.IsNullOrEmpty(dto.NewPassword))
                customer.ChangePassword(_passwordHasher.HashPassword(dto.NewPassword), updatedBy);

            await _context.SaveChangesAsync();
            await LogAuditAsync("Update", "Customer", customer.Id, updatedBy, $"Admin updated customer: {customer.Username}");

            return MapToDto(customer);
        }

        public async Task<UserResponseDto?> UpdateCurrentCustomerAsync(CustomerProfileDto dto, string updatedBy)
        {
            var id = GetCurrentUserId();
            if (!id.HasValue) return null;

            var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Id == id.Value);
            if (customer == null) return null;

            var fullName = NormalizeOptionalString(dto.FullName) ?? customer.FullName;
            var email = NormalizeOptionalString(dto.Email) ?? customer.Email;
            var phoneNumber = NormalizeOptionalString(dto.PhoneNumber) ?? customer.PhoneNumber;

            if (!string.Equals(email, customer.Email, StringComparison.OrdinalIgnoreCase) &&
                (await _context.Customers.AnyAsync(c => c.Email == email && c.Id != customer.Id) ||
                 await _context.Employees.AnyAsync(e => e.Email == email)))
            {
                throw new ArgumentException($"Email '{email}' đã được sử dụng");
            }

            customer.UpdateProfile(fullName, email, phoneNumber, dto.AvatarUrl, updatedBy);

            await _context.SaveChangesAsync();
            await LogAuditAsync("Update", "Customer", customer.Id, updatedBy, $"Customer updated own profile: {customer.Username}");

            return MapToDto(customer);
        }

        public async Task<(bool Success, string? ErrorMessage)> ChangeCurrentCustomerPasswordAsync(ChangePasswordDto dto, string updatedBy)
        {
            var id = GetCurrentUserId();
            if (!id.HasValue) return (false, "Không thể xác định người dùng hiện tại.");

            var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Id == id.Value);
            if (customer == null) return (false, "Không tìm thấy tài khoản của bạn.");

            if (!_passwordHasher.VerifyPassword(dto.CurrentPassword, customer.PasswordHash))
                return (false, "Mật khẩu hiện tại không đúng.");

            customer.ChangePassword(_passwordHasher.HashPassword(dto.NewPassword), updatedBy);
            await _context.SaveChangesAsync();
            await LogAuditAsync("ChangePassword", "Customer", customer.Id, updatedBy, $"Customer changed own password: {customer.Username}");

            return (true, null);
        }

        public async Task<bool> DeleteCustomerAsync(Guid id, string deletedBy)
        {
            var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Id == id);
            if (customer == null) return false;

            var username = customer.Username;
            _context.Customers.Remove(customer);
            await _context.SaveChangesAsync();

            await LogAuditAsync("Delete", "Customer", id, deletedBy, $"Deleted customer: {username}");
            return true;
        }

        public async Task<bool> SetActiveStatusAsync(Guid id, bool isActive, string updatedBy)
        {
            var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Id == id);
            if (customer == null) return false;

            customer.SetStatus(isActive, updatedBy);
            await _context.SaveChangesAsync();

            var action = isActive ? "Unlock" : "Lock";
            await LogAuditAsync(action, "Customer", customer.Id, updatedBy, $"{action} customer: {customer.Username}");

            return true;
        }

        private static UserResponseDto MapToDto(Customer c) => new UserResponseDto
        {
            Id = c.Id,
            Username = c.Username,
            FullName = c.FullName,
            Email = c.Email,
            PhoneNumber = c.PhoneNumber,
            Role = "Customer",
            IsActive = c.IsActive,
            AvatarUrl = c.AvatarUrl,
            CreatedAt = c.CreatedAt
        };

        private Guid? GetCurrentUserId()
        {
            var principal = _httpContextAccessor.HttpContext?.User;
            if (principal == null) return null;

            var userIdValue = principal.FindFirst("sub")?.Value ?? principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(userIdValue, out var userId) ? userId : null;
        }

        private static string? NormalizeOptionalString(string? value)
        {
            var trimmed = value?.Trim();
            return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
        }

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