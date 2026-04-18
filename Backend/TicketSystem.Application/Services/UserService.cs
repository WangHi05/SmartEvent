using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using TicketSystem.Application.DTOs;
using TicketSystem.Domain.Entities;
using TicketSystem.Domain.Interfaces;
using TicketSystem.Domain.Common;

namespace TicketSystem.Application.Services
{
    
    /// Service xử lý logic nghiệp vụ liên quan đến User
    
    public class UserService
    {
        private readonly IGenericRepository<User> _userRepository;
        private readonly IGenericRepository<AuditLog> _auditLogRepository;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public UserService(
            IGenericRepository<User> userRepository,
            IGenericRepository<AuditLog> auditLogRepository,
            IHttpContextAccessor httpContextAccessor)
        {
            _userRepository = userRepository;
            _auditLogRepository = auditLogRepository;
            _httpContextAccessor = httpContextAccessor;
        }

        
        /// Lấy danh sách User với phân trang
        
        public async Task<UserListDto> GetUsersAsync(int pageNumber = 1, int pageSize = 10, string? searchTerm = null, string? role = null)
        {
            var users = await _userRepository.GetAllAsync();
            
            // Filter by search term
            if (!string.IsNullOrEmpty(searchTerm))
            {
                searchTerm = searchTerm.ToLower();
                users = users.Where(u => 
                    u.Username.ToLower().Contains(searchTerm) ||
                    u.FullName.ToLower().Contains(searchTerm) ||
                    u.Email.ToLower().Contains(searchTerm));
            }

            // Filter by role
            if (!string.IsNullOrEmpty(role) && Enum.TryParse<UserRole>(role, true, out var roleEnum))
            {
                users = users.Where(u => u.Role == roleEnum);
            }

            var totalCount = users.Count();

            var pagedUsers = users
                .OrderBy(u => u.Username)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(MapToResponseDto)
                .ToList();

            return new UserListDto
            {
                Items = pagedUsers,
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize = pageSize
            };
        }

        
        /// Lấy thông tin User theo Id
        
        public async Task<UserResponseDto?> GetUserByIdAsync(Guid id)
        {
            var user = await _userRepository.GetByIdAsync(id);
            return user == null ? null : MapToResponseDto(user);
        }

        
        /// Tạo mới User
        
        public async Task<UserResponseDto> CreateUserAsync(CreateUserDto dto, string createdBy)
        {
            // Kiểm tra username đã tồn tại
            var existingUsers = await _userRepository.GetAllAsync();
            if (existingUsers.Any(u => u.Username.Equals(dto.Username, StringComparison.OrdinalIgnoreCase)))
            {
                throw new ArgumentException($"Username '{dto.Username}' đã tồn tại");
            }

            // Kiểm tra email đã tồn tại
            if (existingUsers.Any(u => u.Email.Equals(dto.Email, StringComparison.OrdinalIgnoreCase)))
            {
                throw new ArgumentException($"Email '{dto.Email}' đã được sử dụng");
            }

            // Parse role string to enum
            if (!Enum.TryParse<UserRole>(dto.Role, true, out var roleEnum))
            {
                throw new ArgumentException($"Role '{dto.Role}' không hợp lệ. Chỉ chấp nhận: Admin, Manager, Staff");
            }

            var user = new User
            {
                Username = dto.Username,
                PasswordHash = HashPassword(dto.Password),
                FullName = dto.FullName,
                Email = dto.Email,
                Role = roleEnum,
                IsActive = true,
                CreatedBy = createdBy
            };

            await _userRepository.AddAsync(user);

            // Ghi log
            await LogAuditAsync(new AuditLog
            {
                Action = "Create",
                EntityType = "User",
                EntityId = user.Id,
                PerformedBy = createdBy,
                Details = $"Created user: {user.Username} ({user.Role})"
            });

            return MapToResponseDto(user);
        }

        
        /// Cập nhật User
        
        public async Task<UserResponseDto?> UpdateUserAsync(UpdateUserDto dto, string updatedBy)
        {
            var user = await _userRepository.GetByIdAsync(dto.Id);
            if (user == null)
                return null;

            // Cập nhật các trường nếu có giá trị mới
            if (!string.IsNullOrEmpty(dto.FullName))
                user.FullName = dto.FullName;

            if (!string.IsNullOrEmpty(dto.Email))
            {
                // Kiểm tra email mới đã tồn tại chưa (trừ user hiện tại)
                var existingUsers = await _userRepository.GetAllAsync();
                if (existingUsers.Any(u => u.Id != dto.Id && u.Email.Equals(dto.Email, StringComparison.OrdinalIgnoreCase)))
                {
                    throw new ArgumentException($"Email '{dto.Email}' đã được sử dụng");
                }
                user.Email = dto.Email;
            }

            if (!string.IsNullOrEmpty(dto.Role))
            {
                // Parse role string to enum
                if (!Enum.TryParse<UserRole>(dto.Role, true, out var roleEnum))
                {
                    throw new ArgumentException($"Role '{dto.Role}' không hợp lệ. Chỉ chấp nhận: Admin, Manager, Staff");
                }
                user.Role = roleEnum;
            }

            if (dto.IsActive.HasValue)
                user.IsActive = dto.IsActive.Value;

            // Cập nhật password nếu có
            if (!string.IsNullOrEmpty(dto.NewPassword))
                user.PasswordHash = HashPassword(dto.NewPassword);

            user.UpdatedBy = updatedBy;

            await _userRepository.UpdateAsync(user);

            // Ghi log
            await LogAuditAsync(new AuditLog
            {
                Action = "Update",
                EntityType = "User",
                EntityId = user.Id,
                PerformedBy = updatedBy,
                Details = $"Updated user: {user.Username}"
            });

            return MapToResponseDto(user);
        }

        
        /// Xóa User
        
        public async Task<bool> DeleteUserAsync(Guid id, string deletedBy)
        {
            var user = await _userRepository.GetByIdAsync(id);
            if (user == null)
                return false;

            var username = user.Username;
            var success = await _userRepository.DeleteAsync(id);

            if (success)
            {
                // Ghi log
                await LogAuditAsync(new AuditLog
                {
                    Action = "Delete",
                    EntityType = "User",
                    EntityId = id,
                    PerformedBy = deletedBy,
                    Details = $"Deleted user: {username}"
                });
            }

            return success;
        }

        
        /// Xác thực đăng nhập (bonus feature)
        
        public async Task<UserResponseDto?> AuthenticateAsync(string username, string password)
        {
            var users = await _userRepository.GetAllAsync();
            var user = users.FirstOrDefault(u => 
                u.Username.Equals(username, StringComparison.OrdinalIgnoreCase) && 
                u.IsActive);

            if (user == null)
                return null;

            // Verify password
            if (!VerifyPassword(password, user.PasswordHash))
                return null;

            return MapToResponseDto(user);
        }

        #region Private Helper Methods

        private UserResponseDto MapToResponseDto(User user)
        {
            return new UserResponseDto
            {
                Id = user.Id,
                Username = user.Username,
                FullName = user.FullName,
                Email = user.Email,
                Role = user.Role.ToString(), // Convert enum to string
                IsActive = user.IsActive,
                CreatedAt = user.CreatedAt
            };
        }

        private async Task LogAuditAsync(AuditLog log)
        {
            log.Timestamp = DateTime.UtcNow;
            log.IpAddress = GetClientIpAddress();
            await _auditLogRepository.AddAsync(log);
        }

        
        /// Lấy IP address của client (IPv4 format)
        
        private string? GetClientIpAddress()
        {
            var ipAddress = _httpContextAccessor.HttpContext?.Connection.RemoteIpAddress;
            if (ipAddress == null) return null;

            // Convert IPv6 localhost (::1) to IPv4 (127.0.0.1)
            if (ipAddress.ToString() == "::1")
                return "127.0.0.1";

            // Nếu là IPv4 mapped trong IPv6 (::ffff:192.168.1.1) → Extract IPv4
            if (ipAddress.IsIPv4MappedToIPv6)
                return ipAddress.MapToIPv4().ToString();

            return ipAddress.ToString();
        }

        
        /// Hash password bằng SHA256
        
        private string HashPassword(string password)
        {
            using (var sha256 = SHA256.Create())
            {
                var bytes = Encoding.UTF8.GetBytes(password);
                var hash = sha256.ComputeHash(bytes);
                return Convert.ToBase64String(hash);
            }
        }

        
        /// Verify password
        
        private bool VerifyPassword(string password, string passwordHash)
        {
            var hash = HashPassword(password);
            return hash == passwordHash;
        }

        #endregion
    }
}
