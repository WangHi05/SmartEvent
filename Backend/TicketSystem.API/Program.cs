using TicketSystem.Infrastructure.Data;
using TicketSystem.Infrastructure.Repositories;
using TicketSystem.Application.Services;
using TicketSystem.Domain.Interfaces;
using TicketSystem.API.Middleware;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// 1. Đăng ký DbContext và kết nối SQL Server
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"),
        b => b.MigrationsAssembly("TicketSystem.Infrastructure")));

// 2. Đăng ký Repositories (Generic Repository Pattern)
builder.Services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));

// 2.1. Đăng ký HttpContextAccessor để lấy IP trong Service
builder.Services.AddHttpContextAccessor();

// 3. Đăng ký Application Services
builder.Services.AddScoped<EventService>();
builder.Services.AddScoped<TicketService>();
builder.Services.AddScoped<UserService>();

// 4. Đăng ký Database Seeder
builder.Services.AddScoped<DatabaseSeeder>();

// 4. CORS Configuration (cho phép Frontend gọi API)
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

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Enable CORS
app.UseCors("AllowFrontend");

// Custom Middleware - Role Authorization
app.UseRoleAuthorization();

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
        
        // Tự động migrate database
        logger.LogInformation("Checking for pending migrations...");
        await context.Database.MigrateAsync();
        logger.LogInformation("Database migration completed.");
        
        // Tự động seed data nếu DB rỗng
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