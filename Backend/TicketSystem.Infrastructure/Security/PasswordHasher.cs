using System.Security.Cryptography;
using System.Text;
using TicketSystem.Application.Interfaces;

namespace TicketSystem.Infrastructure.Security
{
    // Tách riêng logic mã hóa mật khẩu, đảm bảo nguyên tắc Single Responsibility
    public class PasswordHasher : IPasswordHasher
    {
        public string HashPassword(string password)
        {
            // Tạm thời dùng SHA256 như code cũ của bạn.
            // *Lưu ý nâng cao: Trong thực tế khóa luận, tôi khuyến khích bạn dùng thư viện BCrypt.Net-Next (chứa sẵn Salt) để bảo mật cao hơn.
            using var sha256 = SHA256.Create();
            var bytes = Encoding.UTF8.GetBytes(password);
            var hash = sha256.ComputeHash(bytes);
            return Convert.ToBase64String(hash);
        }

        public bool VerifyPassword(string password, string hash)
        {
            return HashPassword(password) == hash;
        }
    }
}

