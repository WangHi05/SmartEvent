using TicketSystem.Infrastructure.Data;
using TicketSystem.Infrastructure.Repositories;
using TicketSystem.Infrastructure.Security;
using TicketSystem.Application.Services;
using TicketSystem.Application;
using TicketSystem.Application.Interfaces;
using TicketSystem.Domain.Interfaces;
using TicketSystem.API.Middleware;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// 1. Đăng ký DbContext và kết nối SQL Server
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"),
        b => b.MigrationsAssembly("TicketSystem.Infrastructure")));

// Đăng ký IApplicationDbContext trỏ tới cùng một instance của ApplicationDbContext
// Điều này đảm bảo Request gửi lên dùng chung 1 kết nối Database
builder.Services.AddScoped<IApplicationDbContext>(provider => 
    provider.GetRequiredService<ApplicationDbContext>());

// 2. Đăng ký Repositories và Hạ tầng
builder.Services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
builder.Services.AddScoped<IUserRepository, UserRepository>(); // Đăng ký UserRepository cụ thể
builder.Services.AddScoped<ITicketTypeRepository, TicketTypeRepository>(); // Đăng ký TicketTypeRepository
builder.Services.AddScoped<IPasswordHasher, PasswordHasher>(); // Đăng ký PasswordHasher

// 2.1. Đăng ký HttpContextAccessor để lấy IP trong Service
builder.Services.AddHttpContextAccessor();

// 3. Đăng ký Application Services (DEPENDENCY INVERSION)
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
// 4. Đăng ký Database Seeder
builder.Services.AddScoped<DatabaseSeeder>();

// 5. CORS Configuration (cho phép Frontend gọi API)
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

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// === ĐĂNG KÝ GLOBAL EXCEPTION MIDDLEWARE Ở ĐÂY ===
// Phải đăng ký sớm để hứng được lỗi từ các Middleware/Controller phía sau
app.UseGlobalExceptionHandler(); 

// Enable CORS
app.UseCors("AllowFrontend");

// ===== CẬP NHẬT PIPELINE =====
// 1. Phải gọi UseAuthentication (Xác minh thẻ căn cước) TRƯỚC
app.UseAuthentication(); 
// 2. Rồi mới gọi UseAuthorization (Kiểm tra quyền vào cổng)
app.UseAuthorization();   

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

app.Run();
