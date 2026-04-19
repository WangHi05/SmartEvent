using System;
using System.Linq;
using System.Threading.Tasks;
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

        public UserService(
            IUserRepository userRepository,
            IGenericRepository<AuditLog> auditLogRepository,
            IPasswordHasher passwordHasher,
            IJwtTokenGenerator jwtTokenGenerator)
        {
            _userRepository = userRepository;
            _auditLogRepository = auditLogRepository;
            _passwordHasher = passwordHasher;
            _jwtTokenGenerator = jwtTokenGenerator;
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
                return null;

            if (!_passwordHasher.VerifyPassword(password, user.PasswordHash))
                return null;

            var token = _jwtTokenGenerator.GenerateToken(user);

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
                Timestamp = DateTime.UtcNow
            };
            await _auditLogRepository.AddAsync(log);
        }
    }
}