using System;
using TicketSystem.Domain.Common;

namespace TicketSystem.Domain.Entities
{
    /// <summary>
    /// Tài khoản nhân viên nội bộ (Admin/Manager/Staff/Director).
    /// Tách riêng khỏi Customer theo yêu cầu thiết kế CSDL mới.
    /// </summary>
    public class Employee : BaseEntity
    {
        public string Username { get; private set; } = string.Empty;
        public string PasswordHash { get; private set; } = string.Empty;
        public string FullName { get; private set; } = string.Empty;
        public string Email { get; private set; } = string.Empty;
        public string? PhoneNumber { get; set; }

        /// <summary>
        /// Ảnh đại diện — BẮT BUỘC đối với nhân viên (theo yêu cầu nghiệp vụ)
        /// </summary>
        public string AvatarUrl { get; set; } = string.Empty;

        public string? Position { get; set; } // Chức vụ hiển thị (tùy chọn, không thay thế Role)

        public UserRole Role { get; private set; }
        public bool IsActive { get; private set; } = true;

        public string? ResetPasswordToken { get; private set; }
        public DateTime? ResetPasswordExpiry { get; private set; }

        protected Employee() { }

        public static Employee Create(string username, string passwordHash, string fullName, string email, UserRole role, string avatarUrl, string createdBy)
        {
            return new Employee
            {
                Id = Guid.NewGuid(),
                Username = username,
                PasswordHash = passwordHash,
                FullName = fullName,
                Email = email,
                Role = role,
                AvatarUrl = avatarUrl,
                IsActive = true,
                CreatedBy = createdBy,
                CreatedAt = DateTime.UtcNow
            };
        }

        public void UpdateProfile(string fullName, string email, string? phoneNumber, UserRole role, string? avatarUrl, string updatedBy)
        {
            FullName = fullName;
            Email = email;
            PhoneNumber = phoneNumber;
            Role = role;
            if (!string.IsNullOrWhiteSpace(avatarUrl))
            {
                AvatarUrl = avatarUrl;
            }
            UpdatedBy = updatedBy;
            UpdatedAt = DateTime.UtcNow;
        }

        public void ChangePassword(string newHash, string updatedBy)
        {
            PasswordHash = newHash;
            UpdatedBy = updatedBy;
            UpdatedAt = DateTime.UtcNow;
        }

        public void SetStatus(bool isActive, string updatedBy)
        {
            IsActive = isActive;
            UpdatedBy = updatedBy;
            UpdatedAt = DateTime.UtcNow;
        }

        public string GeneratePasswordResetToken()
        {
            ResetPasswordToken = Guid.NewGuid().ToString("N");
            ResetPasswordExpiry = DateTime.UtcNow.AddMinutes(15);
            return ResetPasswordToken;
        }

        public bool ResetPassword(string token, string newPasswordHash)
        {
            if (ResetPasswordToken != token || ResetPasswordExpiry < DateTime.UtcNow)
                return false;

            PasswordHash = newPasswordHash;
            ResetPasswordToken = null;
            ResetPasswordExpiry = null;
            UpdatedAt = DateTime.UtcNow;
            return true;
        }
    }
}