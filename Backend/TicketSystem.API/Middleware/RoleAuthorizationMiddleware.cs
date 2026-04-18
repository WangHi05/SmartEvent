using TicketSystem.Domain.Common;

namespace TicketSystem.API.Middleware
{
    
    /// Middleware kiểm tra quyền truy cập cơ bản
    /// Trong thực tế nên sử dụng ASP.NET Core Identity hoặc JWT Authentication
    
    public class RoleAuthorizationMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<RoleAuthorizationMiddleware> _logger;

        public RoleAuthorizationMiddleware(RequestDelegate next, ILogger<RoleAuthorizationMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var path = context.Request.Path.Value?.ToLower() ?? "";

            // Endpoints cần kiểm tra quyền
            var protectedPaths = new Dictionary<string, UserRole[]>
            {
                { "/api/events", new[] { UserRole.Admin, UserRole.Manager } },
                { "/api/settings", new[] { UserRole.Admin } },
                { "/api/auditlogs", new[] { UserRole.Admin, UserRole.Manager } }
            };

            // Kiểm tra nếu là endpoint cần bảo vệ
            var needsAuth = protectedPaths.Any(kvp => path.StartsWith(kvp.Key));

            if (needsAuth && context.Request.Method != "GET")
            {
                // Mock: Kiểm tra header X-User-Role (trong thực tế dùng JWT Claims)
                var userRoleHeader = context.Request.Headers["X-User-Role"].FirstOrDefault();
                
                if (string.IsNullOrEmpty(userRoleHeader))
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    await context.Response.WriteAsJsonAsync(new { message = "Unauthorized - Missing role header" });
                    return;
                }

                // Parse role
                if (!Enum.TryParse<UserRole>(userRoleHeader, out var userRole))
                {
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    await context.Response.WriteAsJsonAsync(new { message = "Forbidden - Invalid role" });
                    return;
                }

                // Kiểm tra quyền cho từng endpoint
                var requiredRoles = protectedPaths.FirstOrDefault(kvp => path.StartsWith(kvp.Key)).Value;
                if (requiredRoles != null && !requiredRoles.Contains(userRole))
                {
                    _logger.LogWarning("User with role {Role} attempted to access {Path}", userRole, path);
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    await context.Response.WriteAsJsonAsync(new { message = "Forbidden - Insufficient permissions" });
                    return;
                }
            }

            await _next(context);
        }
    }

    
    /// Extension method để đăng ký middleware
    
    public static class RoleAuthorizationMiddlewareExtensions
    {
        public static IApplicationBuilder UseRoleAuthorization(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<RoleAuthorizationMiddleware>();
        }
    }
}
