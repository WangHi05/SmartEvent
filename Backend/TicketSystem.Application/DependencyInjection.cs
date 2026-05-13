// Application/DependencyInjection.cs
using Microsoft.Extensions.DependencyInjection;
using System.Reflection;
using TicketSystem.Application.Interfaces;
using TicketSystem.Application.Services;

namespace TicketSystem.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        // 1. Đăng ký MediatR
        services.AddMediatR(cfg => {
            cfg.RegisterServicesFromAssembly(Assembly.GetExecutingAssembly());
        });

        // 2. Đăng ký các Service khác của tầng Application
        services.AddScoped<ITicketCheckInService, TicketCheckInService>();
        services.AddScoped<IOrderService, OrderService>();
        services.AddScoped<IDashboardService, DashboardService>();
        // services.AddScoped<ICancelOrderService, CancelOrderService>(); // Các service khác...

        return services;
    }
}