using System;
using System.Collections.Generic;
using TicketSystem.Domain.Common;

namespace TicketSystem.Domain.Entities
{
    /// <summary>
    /// Tài khoản khách hàng — tách riêng khỏi Employee.
    /// </summary>
    public class Customer : BaseEntity
    {
        public string Username { get; private set; } = string.Empty;
        public string PasswordHash { get; private set; } = string.Empty;
        public string FullName { get; private set; } = string.Empty;
        public string Email { get; private set; } = string.Empty;
        public string? PhoneNumber { get; set; }

        /// <summary>
        /// Ảnh đại diện — KHÔNG bắt buộc, khách tự thêm trong trang cá nhân nếu muốn
        /// </summary>
        public string? AvatarUrl { get; set; }

        public bool IsActive { get; private set; } = true;

        public string? ResetPasswordToken { get; private set; }
        public DateTime? ResetPasswordExpiry { get; private set; }

        public string Provider { get; private set; } = "Local"; // Local, Google, Facebook
        public string? ProviderId { get; private set; }

        public virtual ICollection<Order> Orders { get; set; } = new List<Order>();

        protected Customer() { }

        public static Customer Create(string username, string passwordHash, string fullName, string email, string createdBy)
        {
            return new Customer
            {
                Id = Guid.NewGuid(),
                Username = username,
                PasswordHash = passwordHash,
                FullName = fullName,
                Email = email,
                IsActive = true,
                CreatedBy = createdBy,
                CreatedAt = DateTime.UtcNow
            };
        }

        public static Customer CreateSocialUser(string email, string fullName, string provider, string providerId)
        {
            return new Customer
            {
                Id = Guid.NewGuid(),
                Username = email,
                PasswordHash = "SOCIAL_LOGIN_NO_PASSWORD",
                FullName = fullName,
                Email = email,
                IsActive = true,
                Provider = provider,
                ProviderId = providerId,
                CreatedBy = "System",
                CreatedAt = DateTime.UtcNow
            };
        }

        public void UpdateProfile(string fullName, string email, string? phoneNumber, string? avatarUrl, string updatedBy)
        {
            FullName = fullName;
            Email = email;
            PhoneNumber = phoneNumber;
            if (avatarUrl != null)
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