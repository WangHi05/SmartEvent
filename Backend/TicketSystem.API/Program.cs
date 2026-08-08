using TicketSystem.Infrastructure.Data;
using TicketSystem.Infrastructure.Repositories;
using TicketSystem.Infrastructure.Security;
using TicketSystem.Infrastructure.Repositories;
using TicketSystem.Application.Services;
using TicketSystem.Infrastructure.AI;
using TicketSystem.Infrastructure;
using TicketSystem.Application;
using TicketSystem.Application.Interfaces;
using TicketSystem.Domain.Interfaces;
using TicketSystem.API.Middleware;
using TicketSystem.API.Hubs;
using TicketSystem.Application.Strategies;
using TicketSystem.Infrastructure.AI;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using System.Threading.RateLimiting;
using Hangfire;
using Hangfire.InMemory; 
using Hangfire.PostgreSql;
using Npgsql;
using System.Security.Claims;

// ====== FIX TRIỆT ĐỂ LỖI "inotify instance limit (128) reached" TRÊN RENDER/DOCKER ======
// WebApplication.CreateBuilder() mặc định bật reloadOnChange cho appsettings.json,
// dùng FileSystemWatcher (inotify). Container Linux của Render giới hạn inotify rất thấp
// -> app crash ngay lúc khởi động (Exited with status 139).
// Set biến môi trường này TRƯỚC khi builder được tạo để tắt hẳn tính năng reload.
Environment.SetEnvironmentVariable("DOTNET_hostBuilder:reloadConfigOnChange", "false");

var builder = WebApplication.CreateBuilder(args);

// Phòng hờ thêm lần nữa: xóa toàn bộ json config source mặc định (có reloadOnChange = true)
// và add lại với reloadOnChange = false, đảm bảo 100% không tạo FileSystemWatcher.
builder.Configuration.Sources.Clear();
builder.Configuration
    .SetBasePath(builder.Environment.ContentRootPath)
    .AddJsonFile("appsettings.json", optional: true, reloadOnChange: false)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true, reloadOnChange: false);

if (builder.Environment.IsDevelopment())
{
    builder.Configuration.AddUserSecrets<Program>(optional: true, reloadOnChange: false);
}

builder.Configuration
    .AddEnvironmentVariables()
    .AddCommandLine(args);

// 1. Lấy chuỗi kết nối gốc
var rawConnectionString = builder.Configuration.GetConnectionString("DefaultConnection");

bool isPostgres = !string.IsNullOrEmpty(rawConnectionString) &&
    (rawConnectionString.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
     rawConnectionString.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase) ||
     rawConnectionString.Contains("Host=", StringComparison.OrdinalIgnoreCase));

var databaseProvider = isPostgres ? "PostgreSQL" : "SQLServer";

string connectionString = rawConnectionString ?? string.Empty;

if (isPostgres && !string.IsNullOrEmpty(rawConnectionString) &&
    (rawConnectionString.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
     rawConnectionString.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase)))
{
    connectionString = ConvertPostgresUriToKeywordValue(rawConnectionString);
}

// Cấu hình Npgsql Builder để chống Timeout
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
        TrustServerCertificate = true,
        Timeout = 60,            
        CommandTimeout = 120,    
        KeepAlive = 30,          
        Pooling = true,
        MaxPoolSize = 100
    };

    return builder.ConnectionString;
}

// 2. CẤU HÌNH HANGFIRE BẰNG IN-MEMORY STORAGE (FIX TRIỆT ĐỂ LỖI NEON TIMEOUT)
builder.Services.AddHangfire(configuration =>
{
    configuration.SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
                 .UseSimpleAssemblyNameTypeSerializer()
                 .UseRecommendedSerializerSettings()
                 .UseInMemoryStorage(); // Giải thoát Database, chuyển toàn bộ Background Job lên RAM
});

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

builder.Services.AddScoped<IApplicationDbContext>(provider => 
    provider.GetRequiredService<ApplicationDbContext>());

// 4. Đăng ký Repositories và Hạ tầng
builder.Services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<ITicketTypeRepository, TicketTypeRepository>();
builder.Services.AddScoped<IPasswordHasher, PasswordHasher>();
builder.Services.AddHttpContextAccessor();


// 5. Đăng ký Application Services (DEPENDENCY INVERSION)
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IEmployeeService, EmployeeService>();
builder.Services.AddScoped<ICustomerService, CustomerService>();
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
builder.Services.AddScoped<IAuditLogService, AuditLogService>();

// FIX DI LỖI RAG CHATBOT BẰNG CÁCH GỌI FULL NAMESPACE
builder.Services.AddScoped<TicketSystem.Application.Interfaces.IAdminChatbotService, TicketSystem.Infrastructure.AI.AdminChatbotService>();
builder.Services.AddTransient<IRealTimeUpdateService, TicketSystem.API.Services.RealTimeUpdateService>();
builder.Services.AddScoped<TicketSystem.Application.Interfaces.IGateNotificationService, TicketSystem.API.Services.GateNotificationService>();


// 6. Đăng ký Database Seeder & Strategy & HttpClients
builder.Services.AddScoped<DatabaseSeeder>();
builder.Services.AddScoped<IRefundStrategy, PartialRefundStrategy>();
builder.Services.AddScoped<IRefundStrategy, FullRefundStrategy>();
builder.Services.AddScoped<IRefundStrategy, NoRefundStrategy>();


builder.Services.AddHttpClient<IAiAnalysisService, GeminiAiService>();
builder.Services.AddScoped<IAiAnalysisService, GeminiAiService>();
builder.Services.AddHttpClient<IGeminiService, GeminiService>();
// THÊM DÒNG NÀY:
builder.Services.AddHttpClient<IOpenAiFallbackService, OpenAiFallbackService>();
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "TicketSystem API", Version = "v1" });

    // Cấu hình UI nhập Token
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = @"Đăng nhập bằng JWT Token. \r\n\r\n 
                      Nhập 'Bearer' [khoảng trắng] và chuỗi token của bạn vào ô bên dưới.
                      \r\n\r\nVí dụ: 'Bearer 12345abcdef'",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    // Ép Swagger gán token vào Header của mỗi request
    c.AddSecurityRequirement(new OpenApiSecurityRequirement()
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                },
                Scheme = "oauth2",
                Name = "Bearer",
                In = ParameterLocation.Header,
            },
            new List<string>()
        }
    });
});


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

builder.Services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();

var jwtSecret = builder.Configuration["JwtSettings:Secret"];
if (string.IsNullOrWhiteSpace(jwtSecret))
{
    jwtSecret = "dev-secret-key-change-me-in-production-please";
}
var jwtIssuer = builder.Configuration["JwtSettings:Issuer"] ?? "TicketSystem_API";
var jwtAudience = builder.Configuration["JwtSettings:Audience"] ?? "TicketSystem_ReactApp";

builder.Configuration["JwtSettings:Secret"] = jwtSecret;
builder.Configuration["JwtSettings:Issuer"] = jwtIssuer;
builder.Configuration["JwtSettings:Audience"] = jwtAudience;

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

builder.Services.Configure<TicketSystem.API.CloudinarySettings>(builder.Configuration.GetSection("CloudinarySettings"));
builder.Services.AddSingleton(sp =>
{
    var config = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<TicketSystem.API.CloudinarySettings>>().Value;
    var account = new CloudinaryDotNet.Account(config.CloudName, config.ApiKey, config.ApiSecret);
    return new CloudinaryDotNet.Cloudinary(account);
});
builder.Services.AddScoped<TicketSystem.API.Services.UploadService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173", 
                "http://localhost:5174",
                "http://localhost:5175",
                "http://localhost:3000",
                "https://*.vercel.app"   
               )
              .SetIsOriginAllowedToAllowWildcardSubdomains() 
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); 
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.MapHub<GateHub>("/gateHub");
app.MapHub<TicketSystem.API.Hubs.GateHub>("/hubs/gate");

app.UseGlobalExceptionHandler(); 
app.UseCors("AllowFrontend"); // Đã xóa phần gọi UseCors bị lặp
app.UseRateLimiter();
app.UseAuthentication(); 
app.UseAuthorization(); 
app.UseHangfireDashboard("/hangfire");

RecurringJob.AddOrUpdate<EventService>(
    "update-expired-events-status", 
    service => service.AutoUpdateCompletedEventsAsync(), 
    Cron.Hourly());

app.MapControllers();

// ====== TỰ ĐỘNG MIGRATE VÀ SEED DATABASE (ĐÃ TỐI ƯU THÀNH 1 KHỐI DUY NHẤT) ======
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    try
    {
        var context = services.GetRequiredService<ApplicationDbContext>();
        
        logger.LogInformation("Đang kiểm tra và áp dụng Migrations...");
        // TĂNG TIMEOUT RIÊNG CHO MIGRATE (5 phút) ĐỂ TRÁNH LỖI NEON SLEEP
        context.Database.SetCommandTimeout(TimeSpan.FromMinutes(5));
        await context.Database.MigrateAsync();
        logger.LogInformation("Migration hoàn tất.");

        // Chạy Seeder (Chỉ gọi 1 lần)
        var configuration = services.GetRequiredService<IConfiguration>();
        bool shouldSeedData = configuration.GetValue<bool>("DatabaseSettings:SeedMockData", false);
        
        var appSeederLogger = services.GetRequiredService<ILogger<AppDbSeeder>>();
        await AppDbSeeder.SeedDataAsync(context, appSeederLogger, forceSeed: shouldSeedData);
        
        if (shouldSeedData)
        {
            logger.LogInformation("LƯU Ý: Chế độ ép buộc tạo Mock Data đang BẬT. Nhớ tắt đi trong appsettings.json sau khi dùng xong.");
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Có lỗi nghiêm trọng xảy ra khi tự động migrate hoặc seed database.");
    }
    
}


app.Run();
public partial class Program { }