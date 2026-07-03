using TicketSystem.Infrastructure.Data;
using TicketSystem.Infrastructure.Repositories;
using TicketSystem.Infrastructure.Security;
using TicketSystem.Application.Services;
using TicketSystem.Application;
using TicketSystem.Application.Interfaces;
using TicketSystem.Domain.Interfaces;
using TicketSystem.API.Middleware;
using TicketSystem.API.Hubs;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Threading.RateLimiting;
using Hangfire;
using Hangfire.PostgreSql;

var builder = WebApplication.CreateBuilder(args);

// 1. Lấy cấu hình Provider và Chuỗi kết nối từ appsettings/User Secrets
var databaseProvider = builder.Configuration["DatabaseProvider"] ?? "SQLServer";
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

// 2. CẤU HÌNH HANGFIRE THEO PROVIDER (Đã cập nhật rẽ nhánh Postgres)
builder.Services.AddHangfire(configuration =>
{
    configuration.SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
                 .UseSimpleAssemblyNameTypeSerializer()
                 .UseRecommendedSerializerSettings();

    if (databaseProvider.Equals("PostgreSQL", StringComparison.OrdinalIgnoreCase))
    {
        configuration.UsePostgreSqlStorage(options =>
        {
            options.UseNpgsqlConnection(connectionString);
        });
    }
    else
    {
        configuration.UseSqlServerStorage(connectionString);
    }
});

// Thêm Hangfire Server (Bộ máy chạy ngầm)
builder.Services.AddHangfireServer();

// 3. ĐĂNG KÝ DBCONTEXT THEO PROVIDER
builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    if (databaseProvider.Equals("PostgreSQL", StringComparison.OrdinalIgnoreCase))
    {
        options.UseNpgsql(connectionString,
            b => b.MigrationsAssembly("TicketSystem.Infrastructure"));
    }
    else
    {
        options.UseSqlServer(connectionString,
            b => b.MigrationsAssembly("TicketSystem.Infrastructure"));
    }
});

// Đăng ký IApplicationDbContext trỏ tới cùng một instance của ApplicationDbContext
// Điều này đảm bảo Request gửi lên dùng chung 1 kết nối Database
builder.Services.AddScoped<IApplicationDbContext>(provider => 
    provider.GetRequiredService<ApplicationDbContext>());

// 4. Đăng ký Repositories và Hạ tầng
builder.Services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
builder.Services.AddScoped<IUserRepository, UserRepository>(); // Đăng ký UserRepository cụ thể
builder.Services.AddScoped<ITicketTypeRepository, TicketTypeRepository>(); // Đăng ký TicketTypeRepository
builder.Services.AddScoped<IPasswordHasher, PasswordHasher>(); // Đăng ký PasswordHasher

// 4.1. Đăng ký HttpContextAccessor để lấy IP trong Service
builder.Services.AddHttpContextAccessor();

// 5. Đăng ký Application Services (DEPENDENCY INVERSION)
builder.Services.AddScoped<IUserService, UserService>();
// Các service khác cũng nên chuyển sang dùng Interface tương tự
builder.Services.AddScoped<EventService, EventService>();
builder.Services.AddScoped<ITicketTypeService, TicketTypeService>();
builder.Services.AddScoped<TicketTypeValidationService>();
builder.Services.AddScoped<IEventService, EventService>();
builder.Services.AddScoped<ITicketCheckInService, TicketCheckInService>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<ISettingsService, SettingsService>();
builder.Services.AddScoped<ICancelOrderService, CancelOrderService>();
builder.Services.AddScoped<IHelpDeskService, HelpDeskService>();
builder.Services.AddScoped<ITicketShareService, TicketShareService>();
builder.Services.AddScoped<IGateService, GateService>();

builder.Services.AddTransient<IRealTimeUpdateService, TicketSystem.API.Services.RealTimeUpdateService>();
// 6. Đăng ký Database Seeder
builder.Services.AddScoped<DatabaseSeeder>();

// Đăng ký IHttpClientFactory để quản lý kết nối mạng tối ưu
builder.Services.AddHttpClient<IAiAnalysisService, GeminiAiService>();

// Khai báo: Bất cứ khi nào một Controller cần IAiAnalysisService, 
// hãy cấp cho nó một instance của GeminiAiService.
builder.Services.AddScoped<IAiAnalysisService, GeminiAiService>();

// HttpClient cho GeminiService (Customer Support Chatbot)
builder.Services.AddHttpClient<IGeminiService, GeminiService>();

// 7. CORS Configuration (cho phép Frontend gọi API)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddApplicationServices();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Giúp Enum tự động biến thành String (Admin, Manager...) khi trả về JSON
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
        // Convert PascalCase thành camelCase cho API response
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("customer-support", httpContext =>
    {
        var ipAddress = httpContext.Connection.RemoteIpAddress?.ToString() ?? "anonymous";

        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: ipAddress,
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 20,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true
            });
    });
});

// Đăng ký JwtTokenGenerator cho DI
builder.Services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();

// ===== CẤU HÌNH JWT AUTHENTICATION =====
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["JwtSettings:Secret"]!)),
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["JwtSettings:Issuer"],
            ValidateAudience = true,
            ValidAudience = builder.Configuration["JwtSettings:Audience"],
            ValidateLifetime = true, // Kiểm tra Token hết hạn chưa
            ClockSkew = TimeSpan.Zero, // Chống sai lệch thời gian server
            RoleClaimType = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
        };
    });

// Đảm bảo có AddAuthorization()
builder.Services.AddAuthorization();

builder.Services.AddMemoryCache();

builder.Services.AddSignalR();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.MapHub<GateHub>("/gateHub");

// === ĐĂNG KÝ GLOBAL EXCEPTION MIDDLEWARE Ở ĐÂY ===
// Phải đăng ký sớm để hứng được lỗi từ các Middleware/Controller phía sau
app.UseGlobalExceptionHandler(); 

// Enable CORS
app.UseCors("AllowFrontend");

app.UseRateLimiter();

// ===== CẬP NHẬT PIPELINE =====
// 1. Phải gọi UseAuthentication (Xác minh thẻ căn cước) TRƯỚC
app.UseAuthentication(); 
// 2. Rồi mới gọi UseAuthorization (Kiểm tra quyền vào cổng)
app.UseAuthorization(); 

app.UseHangfireDashboard("/hangfire");

RecurringJob.AddOrUpdate<EventService>(
    "update-expired-events-status", 
    service => service.AutoUpdateCompletedEventsAsync(), 
    Cron.Hourly());

app.MapControllers();

// ====== TỰ ĐỘNG MIGRATE VÀ SEED DATABASE ======
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<ApplicationDbContext>();
        var logger = services.GetRequiredService<ILogger<Program>>();
        
        logger.LogInformation("Checking for pending migrations...");
        await context.Database.MigrateAsync();
        logger.LogInformation("Database migration completed.");
        
        var seeder = services.GetRequiredService<DatabaseSeeder>();
        await seeder.SeedAsync();
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while migrating or seeding the database.");
    }
}

// Tự động áp dụng Migration khi khởi động ứng dụng
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<IApplicationDbContext>() as DbContext;
        
        if (context != null)
        {
            await context.Database.MigrateAsync(); 
        }
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Có lỗi xảy ra khi tự động migrate database.");
    }
}

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<ApplicationDbContext>();
        var logger = services.GetRequiredService<ILogger<AppDbSeeder>>();

        var configuration = services.GetRequiredService<IConfiguration>();
        bool shouldSeedData = configuration.GetValue<bool>("DatabaseSettings:SeedMockData", false);

        context.Database.Migrate(); 
        
        await AppDbSeeder.SeedDataAsync(context, logger, forceSeed: shouldSeedData);
        
        if (shouldSeedData)
        {
            logger.LogInformation("LƯU Ý: Chế độ ép buộc tạo Mock Data đang BẬT. Nhớ tắt đi trong appsettings.json sau khi dùng xong.");
        }
    }
    catch (Exception ex)
    {
        var programLogger = services.GetRequiredService<ILogger<Program>>();
        programLogger.LogError(ex, "Có lỗi xảy ra khi tự động migrate hoặc seed database.");
    }
}

app.Run();