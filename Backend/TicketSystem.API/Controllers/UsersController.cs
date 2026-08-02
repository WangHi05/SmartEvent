using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Logging;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Interfaces;

namespace TicketSystem.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IEmployeeService _employeeService;
        private readonly ICustomerService _customerService;
        private readonly IOrderService _orderService;
        private readonly ILogger<UsersController> _logger;

        public UsersController(
            IAuthService authService,
            IEmployeeService employeeService,
            ICustomerService customerService,
            IOrderService orderService,
            ILogger<UsersController> logger)
        {
            _authService = authService;
            _employeeService = employeeService;
            _customerService = customerService;
            _orderService = orderService;
            _logger = logger;
        }

        [HttpGet]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<UserListDto>> GetUsers(
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? searchTerm = null,
            [FromQuery] string? role = null)
        {
            var result = await _employeeService.GetEmployeesAsync(pageNumber, pageSize, searchTerm, role);
            return Ok(result);
        }

        [HttpGet("customers")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<UserListDto>> GetCustomers(
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? searchTerm = null)
        {
            var result = await _customerService.GetCustomersAsync(pageNumber, pageSize, searchTerm);
            return Ok(result);
        }

        [HttpGet("{id}")]
        [Authorize]
        public async Task<ActionResult<UserResponseDto>> GetUserById(Guid id)
        {
            var employee = await _employeeService.GetEmployeeByIdAsync(id);
            if (employee != null) return Ok(employee);

            var customer = await _customerService.GetCustomerByIdAsync(id);
            if (customer != null) return Ok(customer);

            return NotFound(new { message = "Không tìm thấy người dùng" });
        }

        [HttpGet("me")]
        [Authorize(Roles = "Customer")]
        public async Task<ActionResult<UserResponseDto>> GetMe()
        {
            var user = await _customerService.GetCurrentCustomerAsync();
            if (user == null) return NotFound(new { message = "Không tìm thấy thông tin tài khoản" });
            return Ok(user);
        }

        /// <summary>
        /// Admin/Manager xem lịch sử đặt vé + thanh toán của 1 khách hàng cụ thể.
        /// PagedOrdersResponseDto đã kèm sẵn danh sách Payments trong mỗi Order.
        /// </summary>
        [HttpGet("{id}/orders")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<PagedOrdersResponseDto>> GetUserOrders(
            Guid id,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10)
        {
            var result = await _orderService.GetUserOrdersAsync(id, pageNumber, pageSize);
            return Ok(result);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<UserResponseDto>> CreateUser([FromBody] CreateUserDto dto)
        {
            var currentUser = User.Identity?.Name ?? "System";
            var result = await _employeeService.CreateEmployeeAsync(dto, dto.AvatarUrl ?? string.Empty, currentUser);
            return CreatedAtAction(nameof(GetUserById), new { id = result.Id }, result);
        }

        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<ActionResult<UserResponseDto>> Register([FromBody] CreateUserDto dto)
        {
            var result = await _authService.RegisterCustomerAsync(dto, "System_Register");
            return CreatedAtAction(nameof(GetUserById), new { id = result.Id }, result);
        }

        [HttpPost("authenticate")]
        [AllowAnonymous]
        public async Task<ActionResult<AuthResponseDto>> Authenticate([FromBody] LoginDto dto)
        {
            var result = await _authService.AuthenticateAsync(dto.Username, dto.Password);
            if (result == null)
                return Unauthorized(new { message = "Username hoặc password không đúng, hoặc tài khoản đã bị khóa!" });

            return Ok(result);
        }

        [HttpPost("forgot-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
        {
            var success = await _authService.ForgotPasswordAsync(dto.Email);
            if (!success)
                return BadRequest(new { message = "Không tìm thấy email hoặc tài khoản chưa kích hoạt." });

            return Ok(new { message = "Email xác nhận đã được gửi." });
        }

        [HttpPost("reset-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
        {
            var success = await _authService.ResetPasswordAsync(dto.Email, dto.Token, dto.NewPassword);
            if (!success)
                return BadRequest(new { message = "Mã xác nhận không đúng hoặc đã hết hạn." });

            return Ok(new { message = "Đặt lại mật khẩu thành công." });
        }

        /// <summary>
        /// Admin reset mật khẩu cho nhân viên: sinh mật khẩu mới ngẫu nhiên, trả về 1 lần để Admin gửi thủ công.
        /// </summary>
        [HttpPost("{id}/reset-password")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ResetEmployeePassword(Guid id)
        {
            var currentUser = User.Identity?.Name ?? "System";
            var newPassword = await _employeeService.ResetPasswordAsync(id, currentUser);

            if (newPassword == null)
                return NotFound(new { message = "Không tìm thấy nhân viên" });

            return Ok(new { newPassword });
        }

        [HttpPost("external-login")]
        [AllowAnonymous]
        public async Task<ActionResult<AuthResponseDto>> ExternalLogin([FromBody] ExternalLoginDto dto)
        {
            var result = await _authService.ExternalLoginAsync(dto.Email, dto.Name, dto.Provider, dto.ProviderId);
            if (result == null)
                return BadRequest(new { message = "Đăng nhập thất bại." });

            return Ok(result);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<UserResponseDto>> UpdateUser(Guid id, [FromBody] UpdateUserDto dto)
        {
            if (id != dto.Id) return BadRequest(new { message = "ID không khớp" });

            var currentUser = User.Identity?.Name ?? "System";

            var employeeResult = await _employeeService.UpdateEmployeeAsync(dto, dto.AvatarUrl, currentUser);
            if (employeeResult != null) return Ok(employeeResult);

            var customerResult = await _customerService.UpdateCustomerByAdminAsync(dto, currentUser);
            if (customerResult != null) return Ok(customerResult);

            return NotFound(new { message = "Không tìm thấy người dùng" });
        }

        /// <summary>
        /// Admin khóa/mở khóa tài khoản (nhân viên hoặc khách hàng) thay vì xóa cứng.
        /// </summary>
        [HttpPut("{id}/status")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> SetUserStatus(Guid id, [FromBody] SetStatusDto dto)
        {
            var currentUser = User.Identity?.Name ?? "System";

            if (await _employeeService.SetActiveStatusAsync(id, dto.IsActive, currentUser))
                return Ok(new { message = dto.IsActive ? "Đã mở khóa tài khoản" : "Đã khóa tài khoản" });

            if (await _customerService.SetActiveStatusAsync(id, dto.IsActive, currentUser))
                return Ok(new { message = dto.IsActive ? "Đã mở khóa tài khoản" : "Đã khóa tài khoản" });

            return NotFound(new { message = "Không tìm thấy người dùng" });
        }

        [HttpPut("me")]
        [Authorize(Roles = "Customer")]
        public async Task<ActionResult<UserResponseDto>> UpdateMe([FromBody] CustomerProfileDto dto)
        {
            try
            {
                var currentUser = User.Identity?.Name ?? "Customer";
                var result = await _customerService.UpdateCurrentCustomerAsync(dto, currentUser);

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
            var result = await _customerService.ChangeCurrentCustomerPasswordAsync(dto, currentUser);

            if (!result.Success)
                return BadRequest(new { message = result.ErrorMessage ?? "Không thể đổi mật khẩu." });

            return Ok(new { message = "Đổi mật khẩu thành công." });
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult> DeleteUser(Guid id)
        {
            var currentUser = User.Identity?.Name ?? "System";

            if (await _employeeService.DeleteEmployeeAsync(id, currentUser))
                return NoContent();

            if (await _customerService.DeleteCustomerAsync(id, currentUser))
                return NoContent();

            return NotFound(new { message = "Không tìm thấy người dùng" });
        }
    }

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

    public class SetStatusDto
    {
        public bool IsActive { get; set; }
    }
}