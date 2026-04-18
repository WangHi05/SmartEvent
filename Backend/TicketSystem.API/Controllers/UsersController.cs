using Microsoft.AspNetCore.Mvc;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Services;

namespace TicketSystem.API.Controllers
{
    
    /// Controller quản lý Users - CRUD operations và Authentication
    
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly UserService _userService;
        private readonly ILogger<UsersController> _logger;

        public UsersController(UserService userService, ILogger<UsersController> logger)
        {
            _userService = userService;
            _logger = logger;
        }

        
        /// Lấy danh sách Users với phân trang và filter
        
        /// <param name="pageNumber">Số trang (mặc định: 1)</param>
        /// <param name="pageSize">Số item mỗi trang (mặc định: 10)</param>
        /// <param name="searchTerm">Tìm kiếm theo username, fullname, email</param>
        /// <param name="role">Filter theo role (Admin/Manager/Staff)</param>
        [HttpGet]
        public async Task<ActionResult<UserListDto>> GetUsers(
            [FromQuery] int pageNumber = 1, 
            [FromQuery] int pageSize = 10,
            [FromQuery] string? searchTerm = null,
            [FromQuery] string? role = null)
        {
            try
            {
                var result = await _userService.GetUsersAsync(pageNumber, pageSize, searchTerm, role);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting users list");
                return StatusCode(500, new { message = "Có lỗi xảy ra khi lấy danh sách người dùng" });
            }
        }

        
        /// Lấy thông tin User theo ID
        
        [HttpGet("{id}")]
        public async Task<ActionResult<UserResponseDto>> GetUserById(Guid id)
        {
            try
            {
                var result = await _userService.GetUserByIdAsync(id);
                if (result == null)
                    return NotFound(new { message = "Không tìm thấy người dùng" });

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user {UserId}", id);
                return StatusCode(500, new { message = "Có lỗi xảy ra" });
            }
        }

        
        /// Tạo mới User
        
        [HttpPost]
        // [Authorize(Roles = "Admin")] // Chỉ Admin mới được tạo user
        public async Task<ActionResult<UserResponseDto>> CreateUser([FromBody] CreateUserDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var createdBy = User.Identity?.Name ?? "System";

                var result = await _userService.CreateUserAsync(dto, createdBy);
                return CreatedAtAction(nameof(GetUserById), new { id = result.Id }, result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating user");
                return StatusCode(500, new { message = "Có lỗi xảy ra khi tạo người dùng" });
            }
        }

        
        /// Cập nhật User
        
        [HttpPut("{id}")]
        // [Authorize(Roles = "Admin")]
        public async Task<ActionResult<UserResponseDto>> UpdateUser(Guid id, [FromBody] UpdateUserDto dto)
        {
            try
            {
                if (id != dto.Id)
                    return BadRequest(new { message = "ID không khớp" });

                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var updatedBy = User.Identity?.Name ?? "System";

                var result = await _userService.UpdateUserAsync(dto, updatedBy);
                if (result == null)
                    return NotFound(new { message = "Không tìm thấy người dùng" });

                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating user {UserId}", id);
                return StatusCode(500, new { message = "Có lỗi xảy ra khi cập nhật người dùng" });
            }
        }

        
        /// Xóa User
        
        [HttpDelete("{id}")]
        // [Authorize(Roles = "Admin")]
        public async Task<ActionResult> DeleteUser(Guid id)
        {
            try
            {
                var deletedBy = User.Identity?.Name ?? "System";

                var success = await _userService.DeleteUserAsync(id, deletedBy);
                if (!success)
                    return NotFound(new { message = "Không tìm thấy người dùng" });

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting user {UserId}", id);
                return StatusCode(500, new { message = "Có lỗi xảy ra khi xóa người dùng" });
            }
        }

        
        /// Xác thực đăng nhập (Bonus API)
        
        [HttpPost("authenticate")]
        public async Task<ActionResult<UserResponseDto>> Authenticate([FromBody] LoginDto dto)
        {
            try
            {
                var user = await _userService.AuthenticateAsync(dto.Username, dto.Password);
                if (user == null)
                    return Unauthorized(new { message = "Username hoặc password không đúng" });

                return Ok(user);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error authenticating user");
                return StatusCode(500, new { message = "Có lỗi xảy ra" });
            }
        }
    }

    
    /// DTO cho login request
    
    public class LoginDto
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}
