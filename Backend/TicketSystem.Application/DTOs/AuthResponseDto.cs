namespace TicketSystem.Application.DTOs
{
    // DTO trả về khi đăng nhập thành công
    public class AuthResponseDto
    {
        public UserResponseDto User { get; set; } = null!;
        public string Token { get; set; } = string.Empty;
    }
}