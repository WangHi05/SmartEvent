using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TicketSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SplitUsersIntoEmployeesAndCustomers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Orders_Users_UserId",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_Orders_UserId_EventId",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_Orders_UserId_OrderStatus",
                table: "Orders");

            migrationBuilder.AlterColumn<Guid>(
                name: "UserId",
                table: "Orders",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<Guid>(
                name: "CustomerId",
                table: "Orders",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateTable(
                name: "Customers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Username = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    FullName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    PhoneNumber = table.Column<string>(type: "text", nullable: true),
                    AvatarUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    ResetPasswordToken = table.Column<string>(type: "text", nullable: true),
                    ResetPasswordExpiry = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Provider = table.Column<string>(type: "text", nullable: false),
                    ProviderId = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Customers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Employees",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Username = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    FullName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    PhoneNumber = table.Column<string>(type: "text", nullable: true),
                    AvatarUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Position = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Role = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    ResetPasswordToken = table.Column<string>(type: "text", nullable: true),
                    ResetPasswordExpiry = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Employees", x => x.Id);
                });

            // ====== BƯỚC MỚI: COPY DỮ LIỆU TỪ Users SANG Employees / Customers ======
            // Giữ nguyên Id để không vỡ liên kết với Orders, AuditLogs...

            // 1. Copy user có Role <> Customer (3) sang Employees
            //    AvatarUrl bắt buộc -> dùng chuỗi rỗng làm placeholder, Admin có thể cập nhật sau
            migrationBuilder.Sql(@"
                INSERT INTO ""Employees""
                    (""Id"", ""Username"", ""PasswordHash"", ""FullName"", ""Email"", ""PhoneNumber"",
                    ""AvatarUrl"", ""Position"", ""Role"", ""IsActive"",
                    ""ResetPasswordToken"", ""ResetPasswordExpiry"",
                    ""CreatedAt"", ""UpdatedAt"", ""CreatedBy"", ""UpdatedBy"")
                SELECT
                    ""Id"", ""Username"", ""PasswordHash"", ""FullName"", ""Email"", ""PhoneNumber"",
                    '', NULL, ""Role"", ""IsActive"",
                    ""ResetPasswordToken"", ""ResetPasswordExpiry"",
                    ""CreatedAt"", ""UpdatedAt"", ""CreatedBy"", ""UpdatedBy""
                FROM ""Users""
                WHERE ""Role"" <> 3;
            ");

            // 2. Copy user có Role = Customer (3) sang Customers
            migrationBuilder.Sql(@"
                INSERT INTO ""Customers""
                    (""Id"", ""Username"", ""PasswordHash"", ""FullName"", ""Email"", ""PhoneNumber"",
                    ""AvatarUrl"", ""IsActive"", ""ResetPasswordToken"", ""ResetPasswordExpiry"",
                    ""Provider"", ""ProviderId"",
                    ""CreatedAt"", ""UpdatedAt"", ""CreatedBy"", ""UpdatedBy"")
                SELECT
                    ""Id"", ""Username"", ""PasswordHash"", ""FullName"", ""Email"", ""PhoneNumber"",
                    NULL, ""IsActive"", ""ResetPasswordToken"", ""ResetPasswordExpiry"",
                    ""Provider"", ""ProviderId"",
                    ""CreatedAt"", ""UpdatedAt"", ""CreatedBy"", ""UpdatedBy""
                FROM ""Users""
                WHERE ""Role"" = 3;
            ");

            // 3. Gán CustomerId cho toàn bộ Order cũ, dựa theo UserId cũ (Id đã giữ nguyên ở bước 1-2)
            migrationBuilder.Sql(@"
                UPDATE ""Orders""
                SET ""CustomerId"" = ""UserId""
                WHERE ""UserId"" IS NOT NULL;
            ");

            // 4. Lưới an toàn: nếu có Order nào trỏ tới 1 user KHÔNG phải Role Customer
            //    (ví dụ dữ liệu mock cho Admin/Staff đặt vé), tạo thêm 1 bản ghi Customer
            //    tương ứng để không vỡ ràng buộc khóa ngoại ở bước sau.
            migrationBuilder.Sql(@"
                INSERT INTO ""Customers""
                    (""Id"", ""Username"", ""PasswordHash"", ""FullName"", ""Email"", ""PhoneNumber"",
                    ""AvatarUrl"", ""IsActive"", ""ResetPasswordToken"", ""ResetPasswordExpiry"",
                    ""Provider"", ""ProviderId"",
                    ""CreatedAt"", ""UpdatedAt"", ""CreatedBy"", ""UpdatedBy"")
                SELECT
                    u.""Id"", u.""Username"", u.""PasswordHash"", u.""FullName"", u.""Email"", u.""PhoneNumber"",
                    NULL, u.""IsActive"", NULL, NULL,
                    u.""Provider"", u.""ProviderId"",
                    u.""CreatedAt"", u.""UpdatedAt"", u.""CreatedBy"", u.""UpdatedBy""
                FROM ""Users"" u
                WHERE u.""Role"" <> 3
                AND EXISTS (SELECT 1 FROM ""Orders"" o WHERE o.""UserId"" = u.""Id"")
                AND NOT EXISTS (SELECT 1 FROM ""Customers"" c WHERE c.""Id"" = u.""Id"");
            ");
            // ====== HẾT BƯỚC MỚI ======

            migrationBuilder.CreateIndex(
                name: "IX_Orders_CustomerId_EventId",
                table: "Orders",
                columns: new[] { "CustomerId", "EventId" });

            migrationBuilder.CreateIndex(
                name: "IX_Orders_CustomerId_OrderStatus",
                table: "Orders",
                columns: new[] { "CustomerId", "OrderStatus" });

            migrationBuilder.CreateIndex(
                name: "IX_Orders_UserId",
                table: "Orders",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Customers_Email",
                table: "Customers",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Customers_Username",
                table: "Customers",
                column: "Username",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Employees_Email",
                table: "Employees",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Employees_Username",
                table: "Employees",
                column: "Username",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Orders_Customers_CustomerId",
                table: "Orders",
                column: "CustomerId",
                principalTable: "Customers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Orders_Users_UserId",
                table: "Orders",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Orders_Customers_CustomerId",
                table: "Orders");

            migrationBuilder.DropForeignKey(
                name: "FK_Orders_Users_UserId",
                table: "Orders");

            migrationBuilder.DropTable(
                name: "Customers");

            migrationBuilder.DropTable(
                name: "Employees");

            migrationBuilder.DropIndex(
                name: "IX_Orders_CustomerId_EventId",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_Orders_CustomerId_OrderStatus",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_Orders_UserId",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "CustomerId",
                table: "Orders");

            migrationBuilder.AlterColumn<Guid>(
                name: "UserId",
                table: "Orders",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Orders_UserId_EventId",
                table: "Orders",
                columns: new[] { "UserId", "EventId" });

            migrationBuilder.CreateIndex(
                name: "IX_Orders_UserId_OrderStatus",
                table: "Orders",
                columns: new[] { "UserId", "OrderStatus" });

            migrationBuilder.AddForeignKey(
                name: "FK_Orders_Users_UserId",
                table: "Orders",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
