using System.Collections.Generic;
using TicketSystem.Domain.Common;


namespace TicketSystem.Domain.Entities
{
    public class User : BaseEntity 
    {
        public string Username { get; private set; }
        public string? PhoneNumber { get; set; }
        public string PasswordHash { get; private set; }
        public string FullName { get; private set; }
        public string Email { get; private set; }
        public UserRole Role { get; private set; }
        public bool IsActive { get; private set; }
        public string? ResetPasswordToken { get; private set; }
        public DateTime? ResetPasswordExpiry { get; private set; }
        public string Provider { get; private set; } = "Local"; // Local, Google, Facebook
        public string? ProviderId { get; private set; } // ID từ Google/Facebook

        // Navigation properties
        public virtual ICollection<Order> Orders { get; set; } = new List<Order>();

        protected User() { } 

        public static User Create(string username, string passwordHash, string fullName, string email, UserRole role, string createdBy)
        {
            return new User
            {
                Id = Guid.NewGuid(),
                Username = username,
                PasswordHash = passwordHash,
                FullName = fullName,
                Email = email,
                Role = role,
                IsActive = true,
                CreatedBy = createdBy,
                CreatedAt = DateTime.UtcNow
            };
        }

        public void UpdateProfile(string fullName, string email, UserRole role, string updatedBy)
        {
            FullName = fullName;
            Email = email;
            Role = role;
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

        // 1. Tạo token đặt lại mật khẩu (Hết hạn sau 15 phút)
        public string GeneratePasswordResetToken()
        {
            ResetPasswordToken = Guid.NewGuid().ToString("N"); // Tạo chuỗi ngẫu nhiên
            ResetPasswordExpiry = DateTime.UtcNow.AddMinutes(15);
            return ResetPasswordToken;
        }

        // 2. Xác thực và đổi mật khẩu mới
        public bool ResetPassword(string token, string newPasswordHash)
        {
            if (ResetPasswordToken != token || ResetPasswordExpiry < DateTime.UtcNow)
                return false; // Token sai hoặc đã hết hạn

            PasswordHash = newPasswordHash;
            ResetPasswordToken = null; // Xóa token sau khi dùng
            ResetPasswordExpiry = null;
            UpdatedAt = DateTime.UtcNow;
            return true;
        }

        // 3. Factory Method cho Social User
        public static User CreateSocialUser(string email, string fullName, string provider, string providerId)
        {
            var user = new User
            {
                Id = Guid.NewGuid(),
                Username = email, // Dùng email làm username cho tài khoản social
                PasswordHash = "SOCIAL_LOGIN_NO_PASSWORD",
                FullName = fullName,
                Email = email,
                Role = UserRole.Customer, // Mặc định là khách hàng
                IsActive = true,
                Provider = provider,
                ProviderId = providerId,
                CreatedBy = "System",
                CreatedAt = DateTime.UtcNow
            };
            return user;
        }
    }
}