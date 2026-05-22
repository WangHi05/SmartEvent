using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TicketSystem.Infrastructure.Migrations
{
    public partial class AddCheckInOutcomeFields : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "EventId",
                table: "CheckInLogs",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: Guid.Empty);

            migrationBuilder.AddColumn<string>(
                name: "CheckInResult",
                table: "CheckInLogs",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Success");

            migrationBuilder.AddColumn<string>(
                name: "FailureReason",
                table: "CheckInLogs",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "QRCodeData",
                table: "CheckInLogs",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EventId",
                table: "CheckInLogs");

            migrationBuilder.DropColumn(
                name: "CheckInResult",
                table: "CheckInLogs");

            migrationBuilder.DropColumn(
                name: "FailureReason",
                table: "CheckInLogs");

            migrationBuilder.DropColumn(
                name: "QRCodeData",
                table: "CheckInLogs");
        }
    }
}