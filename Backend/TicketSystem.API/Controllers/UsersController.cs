using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Logging;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Services;

namespace TicketSystem.API.Controllers
{
    // Controller quản lý Users - CRUD operations và Authentication
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        // DEPENDENCY INVERSION: Tiêm Interface IUserService thay vì Class cụ thể
        private readonly IUserService _userService; 
        private readonly ILogger<UsersController> _logger;

        public UsersController(IUserService userService, ILogger<UsersController> logger)
        {
            _userService = userService;
            _logger = logger;
        }

        // Lấy danh sách Users với phân trang và filter
        [HttpGet]
        [Authorize(Roles = "Admin,Manager")] // Chỉ Admin và Manager mới xem được danh sách
        public async Task<ActionResult<UserListDto>> GetUsers(
            [FromQuery] int pageNumber = 1, 
            [FromQuery] int pageSize = 10,
            [FromQuery] string? searchTerm = null,
            [FromQuery] string? role = null)
        {
            var result = await _userService.GetUsersAsync(pageNumber, pageSize, searchTerm, role);
            return Ok(result);
        }

        // Lấy thông tin chi tiết một User theo ID
        [HttpGet("{id}")]
        [Authorize] // Yêu cầu phải đăng nhập (Bất kỳ Role nào)
        public async Task<ActionResult<UserResponseDto>> GetUserById(Guid id)
        {
            var user = await _userService.GetUserByIdAsync(id);
            if (user == null) return NotFound(new { message = "Không tìm thấy người dùng" });
            return Ok(user);
        }

        [HttpGet("me")]
        [Authorize(Roles = "Customer")]
        public async Task<ActionResult<UserResponseDto>> GetMe()
        {
            var user = await _userService.GetCurrentUserAsync();
            if (user == null) return NotFound(new { message = "Không tìm thấy thông tin tài khoản" });

            return Ok(user);
        }

        // Admin tạo tài khoản mới cho nhân viên
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<UserResponseDto>> CreateUser([FromBody] CreateUserDto dto)
        {
            var currentUser = User.Identity?.Name ?? "System";
            var result = await _userService.CreateUserAsync(dto, currentUser);
            return CreatedAtAction(nameof(GetUserById), new { id = result.Id }, result);
        }

        // Đăng ký tài khoản mới cho Khách hàng/Nhân viên mới (Public API)
        [HttpPost("register")]
        [AllowAnonymous] // Bất kỳ ai cũng có thể truy cập
        public async Task<ActionResult<UserResponseDto>> Register([FromBody] CreateUserDto dto)
        {
            // Fix cứng Role là Staff (hoặc Customer) cho người dùng tự đăng ký
            dto.Role = "Customer"; 
            var result = await _userService.CreateUserAsync(dto, "System_Register");
            return CreatedAtAction(nameof(GetUserById), new { id = result.Id }, result);
        }

        // Xác thực đăng nhập (Login)
        [HttpPost("authenticate")]
        [AllowAnonymous] // Bất kỳ ai cũng có thể gọi API này để lấy Token
        public async Task<ActionResult<AuthResponseDto>> Authenticate([FromBody] LoginDto dto)
        {
            // Nếu sai mật khẩu hoặc tài khoản khóa, Service sẽ trả về null
            var result = await _userService.AuthenticateAsync(dto.Username, dto.Password);
            if (result == null)
                return Unauthorized(new { message = "Username hoặc password không đúng, hoặc tài khoản đã bị khóa!" });

            return Ok(result);
        }

        // 1. API QUÊN MẬT KHẨU
        [HttpPost("forgot-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
        {
            var success = await _userService.ForgotPasswordAsync(dto.Email);
            if (!success) 
                return BadRequest(new { message = "Không tìm thấy email hoặc tài khoản chưa kích hoạt." });
            
            return Ok(new { message = "Email xác nhận đã được gửi." });
        }

        // 2. API ĐẶT LẠI MẬT KHẨU
        [HttpPost("reset-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
        {
            var success = await _userService.ResetPasswordAsync(dto.Email, dto.Token, dto.NewPassword);
            if (!success) 
                return BadRequest(new { message = "Mã xác nhận không đúng hoặc đã hết hạn." });
            
            return Ok(new { message = "Đặt lại mật khẩu thành công." });
        }

        // 3. API SOCIAL LOGIN (GOOGLE / FACEBOOK)
        [HttpPost("external-login")]
        [AllowAnonymous]
        public async Task<ActionResult<AuthResponseDto>> ExternalLogin([FromBody] ExternalLoginDto dto)
        {
            var result = await _userService.ExternalLoginAsync(dto.Email, dto.Name, dto.Provider, dto.ProviderId);
            if (result == null) 
                return BadRequest(new { message = "Đăng nhập thất bại." });
            
            return Ok(result);
        }

        // Cập nhật thông tin User
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<UserResponseDto>> UpdateUser(Guid id, [FromBody] UpdateUserDto dto)
        {
            if (id != dto.Id) return BadRequest(new { message = "ID không khớp" });

            var currentUser = User.Identity?.Name ?? "System";
            var result = await _userService.UpdateUserAsync(dto, currentUser);
            
            if (result == null) return NotFound(new { message = "Không tìm thấy người dùng" });
            return Ok(result);
        }

        [HttpPut("me")]
        [Authorize(Roles = "Customer")]
        public async Task<ActionResult<UserResponseDto>> UpdateMe([FromBody] CustomerProfileDto dto)
        {
            try
            {
                var currentUser = User.Identity?.Name ?? "Customer";
                var result = await _userService.UpdateCurrentUserAsync(dto, currentUser);

                if (result == null) return NotFound(new { message = "Không tìm thấy thông tin tài khoản" });
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("me/change-password")]
        [Authorize(Roles = "Customer")]
        public async Task<IActionResult> ChangeMyPassword([FromBody] ChangePasswordDto dto)
        {
            var currentUser = User.Identity?.Name ?? "Customer";
            var result = await _userService.ChangeCurrentUserPasswordAsync(dto, currentUser);

            if (!result.Success)
                return BadRequest(new { message = result.ErrorMessage ?? "Không thể đổi mật khẩu." });

            return Ok(new { message = "Đổi mật khẩu thành công." });
        }

        // Xóa người dùng (Chỉ Admin)
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult> DeleteUser(Guid id)
        {
            var currentUser = User.Identity?.Name ?? "System";
            var success = await _userService.DeleteUserAsync(id, currentUser);
            
            if (!success) return NotFound(new { message = "Không tìm thấy người dùng" });
            return NoContent();
        }
    }

    // DTO cho login request (Chứa gọn trong file này hoặc em có thể chuyển sang thư mục DTOs)
    public class LoginDto
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class ForgotPasswordDto
    {
        public string Email { get; set; } = string.Empty;
    }

    public class ResetPasswordDto
    {
        public string Email { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }

    public class ExternalLoginDto
    {
        public string Email { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Provider { get; set; } = string.Empty;
        public string ProviderId { get; set; } = string.Empty;
    }
}