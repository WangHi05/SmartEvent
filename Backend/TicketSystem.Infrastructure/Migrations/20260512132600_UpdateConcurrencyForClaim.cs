using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TicketSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateConcurrencyForClaim : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsClaimed",
                table: "Tickets",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ShareToken",
                table: "Tickets",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsClaimed",
                table: "Tickets");

            migrationBuilder.DropColumn(
                name: "ShareToken",
                table: "Tickets");
        }
    }
}
