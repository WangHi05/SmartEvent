using System.Net;
using System.Text.Json;

namespace TicketSystem.API.Middleware
{
    public class GlobalExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<GlobalExceptionMiddleware> _logger;

        public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                // Cho phép request đi tiếp vào Controller
                await _next(context);
            }
            catch (Exception ex)
            {
                // Bắt mọi lỗi xảy ra và xử lý tập trung
                _logger.LogError(ex, "Một lỗi hệ thống không mong muốn đã xảy ra.");
                await HandleExceptionAsync(context, ex);
            }
        }

        private static Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            context.Response.ContentType = "application/json";

            // Phân loại lỗi để trả về HTTP Status Code cho Frontend (React) xử lý
            var statusCode = exception switch
            {
                ArgumentException => (int)HttpStatusCode.BadRequest, // Lỗi logic đầu vào (400)
                KeyNotFoundException => (int)HttpStatusCode.NotFound, // Không tìm thấy dữ liệu (404)
                UnauthorizedAccessException => (int)HttpStatusCode.Unauthorized, // Không có quyền (401)
                _ => (int)HttpStatusCode.InternalServerError // Lỗi server chưa xác định (500)
            };

            context.Response.StatusCode = statusCode;

            // Trả về JSON chuẩn mực
            var result = JsonSerializer.Serialize(new
            {
                StatusCode = statusCode,
                Message = exception.Message,
                // Trong môi trường thực tế, không nên trả chi tiết StackTrace ra ngoài để bảo mật
                // StackTrace = exception.StackTrace 
            });

            return context.Response.WriteAsync(result);
        }
    }
    
    // Extension method cho gọn file Program.cs
    public static class GlobalExceptionMiddlewareExtensions
    {
        public static IApplicationBuilder UseGlobalExceptionHandler(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<GlobalExceptionMiddleware>();
        }
    }
}
