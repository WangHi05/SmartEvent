using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TicketSystem.Application.Common;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Interfaces;
using TicketSystem.Domain.Entities;

namespace TicketSystem.Application.Services
{
    /// <summary>
    /// Xử lý Login/Register/ForgotPassword cho cả 2 bảng Employee và Customer.
    /// Username là duy nhất trên toàn hệ thống (kiểm tra cả 2 bảng khi tạo mới).
    /// </summary>
    public class AuthService : IAuthService
    {
        private readonly IApplicationDbContext _context;
        private readonly IPasswordHasher _passwordHasher;
        private readonly IJwtTokenGenerator _jwtTokenGenerator;
        private readonly Microsoft.AspNetCore.Http.IHttpContextAccessor _httpContextAccessor;

        public AuthService(
            IApplicationDbContext context,
            IPasswordHasher passwordHasher,
            IJwtTokenGenerator jwtTokenGenerator,
            Microsoft.AspNetCore.Http.IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _passwordHasher = passwordHasher;
            _jwtTokenGenerator = jwtTokenGenerator;
            _httpContextAccessor = httpContextAccessor;
        }

        private string? GetClientIpAddress()
        {
            var ipAddress = _httpContextAccessor.HttpContext?.Connection.RemoteIpAddress;
            if (ipAddress == null) return null;
            if (ipAddress.ToString() == "::1") return "127.0.0.1";
            if (ipAddress.IsIPv4MappedToIPv6) return ipAddress.MapToIPv4().ToString();
            return ipAddress.ToString();
        }

        public async Task<AuthResponseDto?> AuthenticateAsync(string username, string password)
        {
            // Thử tìm ở bảng Employee trước (Admin/Manager/Staff/Director)
            var employee = await _context.Employees.FirstOrDefaultAsync(e => e.Username == username);
            if (employee != null)
            {
                if (!employee.IsActive || !_passwordHasher.VerifyPassword(password, employee.PasswordHash))
                {
                    // Trong AuthenticateAsync — Employee
                    await LogAuditAsync("Login", "Employee", employee.Id, username, "Đăng nhập thất bại (sai tài khoản hoặc mật khẩu)");
                    return null;
                }

                var token = _jwtTokenGenerator.GenerateToken(employee.Id, employee.Username, employee.Email, employee.FullName, employee.Role.ToString());
                await LogAuditAsync("Login", "Employee", employee.Id, username, "Nhân viên đăng nhập thành công");

                return new AuthResponseDto
                {
                    User = MapEmployeeToDto(employee),
                    Token = token
                };
            }

            // Không có trong Employee -> tìm ở bảng Customer
            var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Username == username);
            if (customer == null || !customer.IsActive || !_passwordHasher.VerifyPassword(password, customer.PasswordHash))
            {
                
                await LogAuditAsync("Login", "Customer", customer?.Id ?? Guid.Empty, username, "Đăng nhập thất bại (sai tài khoản hoặc mật khẩu)");
                return null;
            }

            var customerToken = _jwtTokenGenerator.GenerateToken(customer.Id, customer.Username, customer.Email, customer.FullName, "Customer");
            await LogAuditAsync("Login", "Customer", customer.Id, username, "Khách hàng đăng nhập thành công");

            return new AuthResponseDto
            {
                User = MapCustomerToDto(customer),
                Token = customerToken
            };
        }

        public async Task<UserResponseDto> RegisterCustomerAsync(CreateUserDto dto, string createdBy)
        {
            if (await _context.Employees.AnyAsync(e => e.Username == dto.Username) ||
                await _context.Customers.AnyAsync(c => c.Username == dto.Username))
            {
                throw new ArgumentException($"Username '{dto.Username}' đã tồn tại");
            }

            if (await _context.Employees.AnyAsync(e => e.Email == dto.Email) ||
                await _context.Customers.AnyAsync(c => c.Email == dto.Email))
            {
                throw new ArgumentException($"Email '{dto.Email}' đã được sử dụng");
            }

            var passwordHash = _passwordHasher.HashPassword(dto.Password);
            var customer = Customer.Create(dto.Username, passwordHash, dto.FullName, dto.Email, createdBy);

            _context.Customers.Add(customer);
            await _context.SaveChangesAsync();
            // RegisterCustomerAsync
            await LogAuditAsync("Register", "Customer", customer.Id, createdBy, $"Đăng ký tài khoản khách hàng mới: {customer.Username}");

            return MapCustomerToDto(customer);
        }

        public async Task<bool> ForgotPasswordAsync(string email)
        {
            var employee = await _context.Employees.FirstOrDefaultAsync(e => e.Email == email);
            if (employee != null && employee.IsActive)
            {
                employee.GeneratePasswordResetToken();
                await _context.SaveChangesAsync();
                // ForgotPasswordAsync
                await LogAuditAsync("ForgotPassword", "Employee", employee.Id, "System", $"Tạo mã đặt lại mật khẩu cho email {email}");
                return true;
            }

            var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Email == email);
            if (customer != null && customer.IsActive)
            {
                customer.GeneratePasswordResetToken();
                await _context.SaveChangesAsync();
                // ForgotPasswordAsync
                await LogAuditAsync("ForgotPassword", "Customer", customer.Id, "System", $"Tạo mã đặt lại mật khẩu cho email {email}");
                return true;
            }

            return false;
        }

        public async Task<bool> ResetPasswordAsync(string email, string token, string newPassword)
        {
            var newHash = _passwordHasher.HashPassword(newPassword);

            var employee = await _context.Employees.FirstOrDefaultAsync(e => e.Email == email);
            if (employee != null)
            {
                var success = employee.ResetPassword(token, newHash);
                if (success)
                {
                    await _context.SaveChangesAsync();
                    await LogAuditAsync("ResetPassword", "Employee", employee.Id, "System", $"Đặt lại mật khẩu thành công cho email {email}");
                }
                return success;
            }

            var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Email == email);
            if (customer != null)
            {
                var success = customer.ResetPassword(token, newHash);
                if (success)
                {
                    await _context.SaveChangesAsync();
                    await LogAuditAsync("ResetPassword", "Customer", customer.Id, "System", $"Đặt lại mật khẩu thành công cho email {email}");
                }
                return success;
            }

            return false;
        }

        public async Task<AuthResponseDto?> ExternalLoginAsync(string email, string fullName, string provider, string providerId)
        {
            // Social login chỉ áp dụng cho Customer
            var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Email == email);

            if (customer == null)
            {
                customer = Customer.CreateSocialUser(email, fullName, provider, providerId);
                _context.Customers.Add(customer);
                await _context.SaveChangesAsync();
                await LogAuditAsync("Register", "Customer", customer.Id, "System", $"Tự động tạo tài khoản qua {provider}");
            }

            var token = _jwtTokenGenerator.GenerateToken(customer.Id, customer.Username, customer.Email, customer.FullName, "Customer");
            await LogAuditAsync("Login", "Customer", customer.Id, customer.Username, $"Đăng nhập qua {provider}");

            return new AuthResponseDto
            {
                User = MapCustomerToDto(customer),
                Token = token
            };
        }

        private static UserResponseDto MapEmployeeToDto(Employee e) => new UserResponseDto
        {
            Id = e.Id,
            Username = e.Username,
            FullName = e.FullName,
            Email = e.Email,
            PhoneNumber = e.PhoneNumber,
            Role = e.Role.ToString(),
            IsActive = e.IsActive,
            AvatarUrl = e.AvatarUrl,
            CreatedAt = e.CreatedAt
        };

        private static UserResponseDto MapCustomerToDto(Customer c) => new UserResponseDto
        {
            Id = c.Id,
            Username = c.Username,
            FullName = c.FullName,
            Email = c.Email,
            PhoneNumber = c.PhoneNumber,
            Role = "Customer",
            IsActive = c.IsActive,
            AvatarUrl = c.AvatarUrl,
            CreatedAt = c.CreatedAt
        };

        private async Task LogAuditAsync(string action, string entityType, Guid entityId, string performedBy, string details)
        {
            _context.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                Action = action,
                EntityType = entityType,
                EntityId = entityId,
                PerformedBy = performedBy,
                Details = details,
                IpAddress = GetClientIpAddress(),
                Timestamp = VietnamTime.Now,
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();
        }
    }
}