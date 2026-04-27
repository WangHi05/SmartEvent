using System.Collections.Generic;
using TicketSystem.Domain.Common;


namespace TicketSystem.Domain.Entities
{
    public class User : BaseEntity 
    {
        public string Username { get; private set; }
        public string PasswordHash { get; private set; }
        public string FullName { get; private set; }
        public string Email { get; private set; }
        public UserRole Role { get; private set; }
        public bool IsActive { get; private set; }

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
    }
}