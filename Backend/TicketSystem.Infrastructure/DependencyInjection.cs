using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TicketSystem.Application.Interfaces;
using TicketSystem.Infrastructure.Notifications;

namespace TicketSystem.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddScoped<IEmailService, EmailService>();
        services.AddScoped<IZaloNotificationService, ZaloZnsService>();
        services.AddScoped<INotificationService, NotificationService>();

        services.AddHttpClient<EmailService>();

        services.AddHttpClient<ZaloZnsService>();

        return services;
    }
}