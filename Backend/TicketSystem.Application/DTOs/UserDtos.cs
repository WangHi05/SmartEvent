using System;
using System.ComponentModel.DataAnnotations;

namespace TicketSystem.Application.DTOs
{
    
    /// DTO cho Response User
    
    public class UserResponseDto
    {
        public Guid Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty; // String để dễ serialization
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    
    /// DTO cho tạo User mới
    
    public class CreateUserDto
    {
        [Required(ErrorMessage = "Username là bắt buộc")]
        [StringLength(50, MinimumLength = 3, ErrorMessage = "Username phải từ 3-50 ký tự")]
        public string Username { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password là bắt buộc")]
        [StringLength(100, MinimumLength = 6, ErrorMessage = "Password phải ít nhất 6 ký tự")]
        public string Password { get; set; } = string.Empty;

        [Required(ErrorMessage = "FullName là bắt buộc")]
        [StringLength(100, ErrorMessage = "FullName tối đa 100 ký tự")]
        public string FullName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email là bắt buộc")]
        [EmailAddress(ErrorMessage = "Email không hợp lệ")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Role là bắt buộc")]
        [RegularExpression("Admin|Manager|Staff|Customer", ErrorMessage = "Role phải là Admin, Manager hoặc Staff hoặc Customer")]
        public string Role { get; set; } = string.Empty;
    }

    
    /// DTO cho cập nhật User
    
    public class UpdateUserDto
    {
        [Required]
        public Guid Id { get; set; }

        [StringLength(100, ErrorMessage = "FullName tối đa 100 ký tự")]
        public string? FullName { get; set; }

        [EmailAddress(ErrorMessage = "Email không hợp lệ")]
        public string? Email { get; set; }

        [RegularExpression("Admin|Manager|Staff|Customer", ErrorMessage = "Role phải là Admin, Manager, Staff hoặc Customer")]
        public string? Role { get; set; }

        public bool? IsActive { get; set; }

        [StringLength(100, MinimumLength = 6, ErrorMessage = "Password phải ít nhất 6 ký tự")]
        public string? NewPassword { get; set; } // Optional - chỉ update nếu có giá trị
    }

    
    /// DTO cho danh sách User với phân trang
    
    public class UserListDto
    {
        public List<UserResponseDto> Items { get; set; } = new List<UserResponseDto>();
        public int TotalCount { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
    }
}
