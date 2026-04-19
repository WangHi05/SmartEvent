using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Interfaces;
using TicketSystem.Domain.Entities;
using TicketSystem.Domain.Interfaces;
using TicketSystem.Domain.Common;

namespace TicketSystem.Application.Services
{
    public class UserService : IUserService
    {
        private readonly IUserRepository _userRepository;
        private readonly IGenericRepository<AuditLog> _auditLogRepository;
        private readonly IPasswordHasher _passwordHasher;
        private readonly IJwtTokenGenerator _jwtTokenGenerator;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public UserService(
            IUserRepository userRepository,
            IGenericRepository<AuditLog> auditLogRepository,
            IPasswordHasher passwordHasher,
            IJwtTokenGenerator jwtTokenGenerator,
            IHttpContextAccessor httpContextAccessor)
        {
            _userRepository = userRepository;
            _auditLogRepository = auditLogRepository;
            _passwordHasher = passwordHasher;
            _jwtTokenGenerator = jwtTokenGenerator;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<UserListDto> GetUsersAsync(int pageNumber = 1, int pageSize = 10, string? searchTerm = null, string? role = null)
        {
            UserRole? roleEnum = null;
            if (!string.IsNullOrEmpty(role) && Enum.TryParse<UserRole>(role, true, out var parsedRole))
                roleEnum = parsedRole;

            var (users, totalCount) = await _userRepository.GetPagedUsersAsync(pageNumber, pageSize, searchTerm, roleEnum);

            return new UserListDto
            {
                Items = users.Select(MapToResponseDto).ToList(),
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize = pageSize
            };
        }

        public async Task<UserResponseDto?> GetUserByIdAsync(Guid id)
        {
            var user = await _userRepository.GetByIdAsync(id);
            if (user == null) return null;
            return MapToResponseDto(user);
        }

        public async Task<UserResponseDto> CreateUserAsync(CreateUserDto dto, string createdBy)
        {
            if (!await _userRepository.IsUsernameUniqueAsync(dto.Username))
                throw new ArgumentException($"Username '{dto.Username}' đã tồn tại");

            if (!await _userRepository.IsEmailUniqueAsync(dto.Email))
                throw new ArgumentException($"Email '{dto.Email}' đã được sử dụng");

            if (!Enum.TryParse<UserRole>(dto.Role, true, out var roleEnum))
                throw new ArgumentException("Role không hợp lệ.");

            var passwordHash = _passwordHasher.HashPassword(dto.Password);
            var user = User.Create(dto.Username, passwordHash, dto.FullName, dto.Email, roleEnum, createdBy);

            await _userRepository.AddAsync(user);
            await LogAuditAsync("Create", "User", user.Id, createdBy, $"Created user: {user.Username}");

            return MapToResponseDto(user);
        }

        public async Task<UserResponseDto?> UpdateUserAsync(UpdateUserDto dto, string updatedBy)
        {
            var user = await _userRepository.GetByIdAsync(dto.Id);
            if (user == null) return null;

            if (!string.IsNullOrEmpty(dto.Email) && !await _userRepository.IsEmailUniqueAsync(dto.Email, dto.Id))
                throw new ArgumentException($"Email '{dto.Email}' đã được sử dụng");

            var roleEnum = string.IsNullOrEmpty(dto.Role) ? user.Role : Enum.Parse<UserRole>(dto.Role, true);
            user.UpdateProfile(dto.FullName ?? user.FullName, dto.Email ?? user.Email, roleEnum, updatedBy);

            if (dto.IsActive.HasValue)
                user.SetStatus(dto.IsActive.Value, updatedBy);

            if (!string.IsNullOrEmpty(dto.NewPassword))
            {
                var newHash = _passwordHasher.HashPassword(dto.NewPassword);
                user.ChangePassword(newHash, updatedBy);
            }

            await _userRepository.UpdateAsync(user);
            await LogAuditAsync("Update", "User", user.Id, updatedBy, $"Updated user: {user.Username}");

            return MapToResponseDto(user);
        }

        public async Task<bool> DeleteUserAsync(Guid id, string deletedBy)
        {
            var user = await _userRepository.GetByIdAsync(id);
            if (user == null) return false;

            var username = user.Username;
            var success = await _userRepository.DeleteAsync(id);

            if (success)
            {
                // FIX LỖI 4: Truyền đúng tham số cho private method LogAuditAsync
                await LogAuditAsync("Delete", "User", id, deletedBy, $"Deleted user: {username}");
            }

            return success;
        }

        // FIX LỖI 2 & 3: Đổi kiểu trả về và sử dụng _jwtTokenGenerator
        public async Task<AuthResponseDto?> AuthenticateAsync(string username, string password)
        {
            var user = await _userRepository.GetByUsernameAsync(username);
            
            if (user == null || !user.IsActive)
            {
                // Log failed login attempt
                await LogAuditAsync("Login", "User", Guid.Empty, username, "Failed login attempt - user not found or inactive");
                return null;
            }

            if (!_passwordHasher.VerifyPassword(password, user.PasswordHash))
            {
                // Log failed login attempt
                await LogAuditAsync("Login", "User", user.Id, username, "Failed login attempt - invalid password");
                return null;
            }

            var token = _jwtTokenGenerator.GenerateToken(user);

            // Log successful login
            await LogAuditAsync("Login", "User", user.Id, username, $"User {username} logged in successfully");

            return new AuthResponseDto
            {
                User = MapToResponseDto(user),
                Token = token
            };
        }

        private UserResponseDto MapToResponseDto(User user)
        {
            return new UserResponseDto
            {
                Id = user.Id,
                Username = user.Username,
                FullName = user.FullName,
                Email = user.Email,
                Role = user.Role.ToString(),
                IsActive = user.IsActive,
                CreatedAt = user.CreatedAt
            };
        }

        private async Task LogAuditAsync(string action, string entityType, Guid entityId, string performedBy, string details)
        {
            var log = new AuditLog
            {
                Action = action,
                EntityType = entityType,
                EntityId = entityId,
                PerformedBy = performedBy,
                Details = details,
                Timestamp = DateTime.UtcNow,
                IpAddress = GetClientIpAddress()
            };
            await _auditLogRepository.AddAsync(log);
        }

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
    }
}