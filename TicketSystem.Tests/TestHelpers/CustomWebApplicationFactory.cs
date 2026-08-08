using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System.Collections.Generic;
using System.Linq;
using TicketSystem.Infrastructure.Data;

namespace TicketSystem.Tests.TestHelpers
{
    /// <summary>
    /// Dựng toàn bộ app TicketSystem.API thật lên trong bộ nhớ (không cần chạy dotnet run,
    /// không cần cổng mạng thật) để test bằng HTTP request giống hệt lúc khách hàng/VNPay gọi API thật.
    ///
    /// Thay thế DUY NHẤT so với app thật: database Postgres/Neon được đổi thành SQLite
    /// chạy hoàn toàn trong RAM, để mỗi lần chạy test là 1 database sạch, không đụng dữ liệu thật.
    /// Toàn bộ Controller, Middleware, Authentication, business logic khác giữ nguyên 100%.
    /// </summary>
    public class CustomWebApplicationFactory : WebApplicationFactory<Program>
    {
        private readonly SqliteConnection _connection;

        public CustomWebApplicationFactory()
        {
            // Dùng biến môi trường vì Program.cs gọi Configuration.Sources.Clear().
            // EnvironmentVariables được add lại sau đó nên các giá trị này vẫn còn.
            Environment.SetEnvironmentVariable(
                "JwtSettings__Secret",
                TestJwtHelper.TestSecret);

            Environment.SetEnvironmentVariable(
                "JwtSettings__Issuer",
                TestJwtHelper.TestIssuer);

            Environment.SetEnvironmentVariable(
                "JwtSettings__Audience",
                TestJwtHelper.TestAudience);

            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Testing");

            // Ép cấu hình JWT/Cloudinary về giá trị cố định cho môi trường test,
            // không phụ thuộc appsettings.json thật (tránh test bị ảnh hưởng bởi secret thật).
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["CloudinarySettings:CloudName"] = "test",
                    ["CloudinarySettings:ApiKey"] = "test",
                    ["CloudinarySettings:ApiSecret"] = "test",
                });
            });

            builder.ConfigureServices(services =>
            {
                // Gỡ TOÀN BỘ descriptor liên quan tới ApplicationDbContext (không chỉ DbContextOptions<T>)
                var descriptorsToRemove = services.Where(d =>
                    d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>) ||
                    d.ServiceType == typeof(DbContextOptions) ||
                    (d.ServiceType.IsGenericType &&
                     d.ServiceType.GetGenericTypeDefinition() == typeof(IDbContextOptionsConfiguration<>))
                ).ToList();

                foreach (var descriptor in descriptorsToRemove)
                {
                    services.Remove(descriptor);
                }

                // Đăng ký lại bằng SQLite In-Memory
                services.AddDbContext<ApplicationDbContext>(options =>
                {
                    options.UseSqlite(_connection);
                });
            });
        }

        /// <summary>
        /// Tạo bảng cho SQLite In-Memory dựa thẳng trên model hiện tại (không qua migration).
        ///
        /// Lý do cần bước này: Program.cs khi khởi động tự gọi context.Database.MigrateAsync()
        /// bằng migration viết riêng cho Postgres. Trên SQLite bước đó sẽ lỗi, nhưng Program.cs
        /// đã tự bọc try-catch quanh đoạn migrate/seed và chỉ log lỗi chứ không crash app
        /// (hành vi có sẵn, không phải do Test project can thiệp). Vì vậy bảng không được tạo
        /// tự động, và ta phải tự gọi EnsureCreated() ở đây trước khi test chạy.
        /// </summary>
        public void EnsureDatabaseCreated()
        {
            using var scope = Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            context.Database.EnsureCreated();
        }

        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);
            _connection.Dispose();
        }
    }
}