using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
namespace TicketSystem.Tests.TestHelpers
{
    /// <summary>
    /// Sinh JWT token hợp lệ để giả lập 1 khách hàng/nhân viên đã đăng nhập, dùng để gọi API
    /// cần [Authorize] trong Integration Test — không cần đăng nhập thật qua UI.
    /// </summary>
    public static class TestJwtHelper
    {
        public const string TestSecret = "integration-test-secret-key-minimum-32-characters-long!";
        public const string TestIssuer = "TicketSystem_API";
        public const string TestAudience = "TicketSystem_ReactApp";

        public static string GenerateCustomerToken(Guid customerId, string username)
        {
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, customerId.ToString()),
                new Claim(ClaimTypes.Name, username),
                new Claim(ClaimTypes.Role, "Customer"),
            };
            return BuildToken(claims);
        }

        /// <summary>
        /// Sinh token cho nhân viên quét QR tại cổng. CheckinController yêu cầu role
        /// Admin, Manager hoặc Staff — mặc định dùng "Staff".
        /// </summary>
        public static string GenerateStaffToken(string? staffId = null, string role = "Staff")
        {
            staffId ??= $"staff_{Guid.NewGuid():N}".Substring(0, 12);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, staffId),
                new Claim(ClaimTypes.Name, staffId),
                new Claim(ClaimTypes.Role, role),
            };
            return BuildToken(claims);
        }

        private static string BuildToken(Claim[] claims)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(TestSecret));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var token = new JwtSecurityToken(
                issuer: TestIssuer,
                audience: TestAudience,
                claims: claims,
                expires: DateTime.UtcNow.AddHours(1),
                signingCredentials: creds);
            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}