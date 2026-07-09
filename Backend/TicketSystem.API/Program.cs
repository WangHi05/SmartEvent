using TicketSystem.Infrastructure.Data;
using TicketSystem.Infrastructure.Repositories;
using TicketSystem.Infrastructure.Security;
using TicketSystem.Application.Services;
using TicketSystem.Application;
using TicketSystem.Application.Interfaces;
using TicketSystem.Domain.Interfaces;
using TicketSystem.API.Middleware;
using TicketSystem.API.Hubs;
using TicketSystem.Application.Strategies;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Threading.RateLimiting;
using Hangfire;
using Hangfire.PostgreSql;
using Npgsql;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

// 1. Lấy chuỗi kết nối gốc (có thể là URI postgresql:// hoặc keyword=value)
var rawConnectionString = builder.Configuration.GetConnectionString("DefaultConnection");

// TỰ ĐỘNG NHẬN DIỆN PROVIDER DỰA VÀO CONNECTION STRING
bool isPostgres = !string.IsNullOrEmpty(rawConnectionString) &&
    (rawConnectionString.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
     rawConnectionString.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase) ||
     rawConnectionString.Contains("Host=", StringComparison.OrdinalIgnoreCase));

var databaseProvider = isPostgres ? "PostgreSQL" : "SQLServer";

// TỰ ĐỘNG CONVERT URI (postgresql://user:pass@host/db?sslmode=...) 
// SANG FORMAT KEYWORD=VALUE MÀ NPGSQL HIỂU ĐƯỢC
string connectionString = rawConnectionString ?? string.Empty;

if (isPostgres && !string.IsNullOrEmpty(rawConnectionString) &&
    (rawConnectionString.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
     rawConnectionString.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase)))
{
    connectionString = ConvertPostgresUriToKeywordValue(rawConnectionString);
}

// Hàm chuyển đổi URI Postgres sang định dạng Keyword=Value chuẩn của Npgsql
static string ConvertPostgresUriToKeywordValue(string uriString)
{
    var uri = new Uri(uriString);
    var userInfo = uri.UserInfo.Split(':', 2);
    var username = Uri.UnescapeDataString(userInfo[0]);
    var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty;
    var database = uri.AbsolutePath.TrimStart('/');
    var port = uri.Port == -1 ? 5432 : uri.Port;

    var builder = new NpgsqlConnectionStringBuilder
    {
        Host = uri.Host,
        Port = port,
        Database = database,
        Username = username,
        Password = password,
        SslMode = SslMode.Require,
        TrustServerCertificate = true
    };

    return builder.ConnectionString;
}

// 2. CẤU HÌNH HANGFIRE THEO PROVIDER
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
        options.UseNpgsql(connectionString, b => 
        {
            b.MigrationsAssembly("TicketSystem.Infrastructure");
            b.UseVector(); 
        });
    }
    else
    {
        options.UseSqlServer(connectionString, b => 
            b.MigrationsAssembly("TicketSystem.Infrastructure"));
    }
});

// Đăng ký IApplicationDbContext trỏ tới cùng một instance của ApplicationDbContext
// Điều này đảm bảo Request gửi lên dùng chung 1 kết nối Database
builder.Services.AddScoped<IApplicationDbContext>(provider => 
    provider.GetRequiredService<ApplicationDbContext>());

// 4. Đăng ký Repositories và Hạ tầng
builder.Services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<ITicketTypeRepository, TicketTypeRepository>();
builder.Services.AddScoped<IPasswordHasher, PasswordHasher>();

// 4.1. Đăng ký HttpContextAccessor để lấy IP trong Service
builder.Services.AddHttpContextAccessor();

// 5. Đăng ký Application Services (DEPENDENCY INVERSION)
builder.Services.AddScoped<IUserService, UserService>();
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
builder.Services.AddScoped<ITicketService, TicketService>();

builder.Services.AddTransient<IRealTimeUpdateService, TicketSystem.API.Services.RealTimeUpdateService>();
// 6. Đăng ký Database Seeder
builder.Services.AddScoped<DatabaseSeeder>();

builder.Services.AddScoped<IRefundStrategy, PartialRefundStrategy>();
builder.Services.AddScoped<IRefundStrategy, FullRefundStrategy>();
builder.Services.AddScoped<IRefundStrategy, NoRefundStrategy>();
// Đăng ký IHttpClientFactory để quản lý kết nối mạng tối ưu
builder.Services.AddHttpClient<IAiAnalysisService, GeminiAiService>();
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
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
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

var jwtSecret = builder.Configuration["JwtSettings:Secret"];
var jwtIssuer = builder.Configuration["JwtSettings:Issuer"];
var jwtAudience = builder.Configuration["JwtSettings:Audience"];

if (string.IsNullOrWhiteSpace(jwtSecret))
{
    jwtSecret = "dev-secret-key-change-me-in-production";
}

if (string.IsNullOrWhiteSpace(jwtIssuer))
{
    jwtIssuer = "TicketSystem_API";
}

if (string.IsNullOrWhiteSpace(jwtAudience))
{
    jwtAudience = "TicketSystem_ReactApp";
}

// ===== CẤU HÌNH JWT AUTHENTICATION =====
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(5),
            RoleClaimType = ClaimTypes.Role
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddMemoryCache();

builder.Services.AddSignalR();

if (string.IsNullOrWhiteSpace(jwtSecret))
{
    jwtSecret = "local-dev-secret-change-me";
}

if (string.IsNullOrWhiteSpace(jwtIssuer))
{
    jwtIssuer = "TicketSystem_API";
}

if (string.IsNullOrWhiteSpace(jwtAudience))
{
    jwtAudience = "TicketSystem_ReactApp";
}

builder.Configuration["JwtSettings:Secret"] = jwtSecret;
builder.Configuration["JwtSettings:Issuer"] = jwtIssuer;
builder.Configuration["JwtSettings:Audience"] = jwtAudience;

// ===== CẤU HÌNH REDIS DISTRIBUTED CACHE (UPSTASH) =====
var redisConnectionString = builder.Configuration["Redis:ConnectionString"];
if (!string.IsNullOrWhiteSpace(redisConnectionString))
{
    builder.Services.AddStackExchangeRedisCache(options =>
    {
        options.Configuration = redisConnectionString;
        options.InstanceName = "TicketSystem_";
    });
}
else
{
    builder.Services.AddDistributedMemoryCache();
}

// ===== CẤU HÌNH CLOUDINARY (LƯU TRỮ HÌNH ẢNH) =====
// Cấu hình dịch vụ lưu trữ hình ảnh Cloudinary đọc tự động từ Biến môi trường hoặc appsettings
builder.Services.Configure<TicketSystem.API.CloudinarySettings>(builder.Configuration.GetSection("CloudinarySettings"));

// Đăng ký Cloudinary client để inject trực tiếp vào Service/Controller
builder.Services.AddSingleton(sp =>
{
    var config = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<TicketSystem.API.CloudinarySettings>>().Value;
    var account = new CloudinaryDotNet.Account(config.CloudName, config.ApiKey, config.ApiSecret);
    return new CloudinaryDotNet.Cloudinary(account);
});
// ⬇️ THÊM DÒNG NÀY
builder.Services.AddScoped<TicketSystem.API.Services.UploadService>();


// 1. Định nghĩa chính sách CORS (Cho phép Frontend gọi API)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173", // Cho phép React chạy thử dưới máy local của Tiến
                "https://*.vercel.app"   // Cho phép tất cả các domain deploy thử nghiệm của Vercel
               )
              .SetIsOriginAllowedToAllowWildcardSubdomains() // Kích hoạt cho phép wildcard dấu * ở trên
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // Cần thiết nếu hai bạn có dùng Cookie hoặc mã hóa Token
    });
});
var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// ⬇️ CHÈN CHÍNH XÁC DÒNG NÀY VÀO ĐÂY
app.UseCors("AllowFrontend");

app.UseHttpsRedirection();

app.MapHub<GateHub>("/gateHub");

app.UseGlobalExceptionHandler(); 

app.UseCors("AllowFrontend");

app.UseRateLimiter();

app.UseAuthentication(); 
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