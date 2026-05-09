using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TicketSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveUniqueIndexCheckinLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_CheckInLogs_TicketId_CheckinDate",
                table: "CheckInLogs");

            migrationBuilder.CreateIndex(
                name: "IX_CheckInLogs_TicketId_CheckinDate",
                table: "CheckInLogs",
                columns: new[] { "TicketId", "CheckinDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_CheckInLogs_TicketId_CheckinDate",
                table: "CheckInLogs");

            migrationBuilder.CreateIndex(
                name: "IX_CheckInLogs_TicketId_CheckinDate",
                table: "CheckInLogs",
                columns: new[] { "TicketId", "CheckinDate" },
                unique: true);
        }
    }
}
