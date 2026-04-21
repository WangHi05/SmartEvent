using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TicketSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class TicketTypeExpandedFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "MaxGroupSize",
                table: "TicketTypes",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MaxPerUser",
                table: "TicketTypes",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "MinGroupSize",
                table: "TicketTypes",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PriceMode",
                table: "TicketTypes",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "QRMode",
                table: "TicketTypes",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Quantity",
                table: "TicketTypes",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "RemainingQuantity",
                table: "TicketTypes",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TicketMode",
                table: "TicketTypes",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "UsageType",
                table: "TicketTypes",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MaxGroupSize",
                table: "TicketTypes");

            migrationBuilder.DropColumn(
                name: "MaxPerUser",
                table: "TicketTypes");

            migrationBuilder.DropColumn(
                name: "MinGroupSize",
                table: "TicketTypes");

            migrationBuilder.DropColumn(
                name: "PriceMode",
                table: "TicketTypes");

            migrationBuilder.DropColumn(
                name: "QRMode",
                table: "TicketTypes");

            migrationBuilder.DropColumn(
                name: "Quantity",
                table: "TicketTypes");

            migrationBuilder.DropColumn(
                name: "RemainingQuantity",
                table: "TicketTypes");

            migrationBuilder.DropColumn(
                name: "TicketMode",
                table: "TicketTypes");

            migrationBuilder.DropColumn(
                name: "UsageType",
                table: "TicketTypes");
        }
    }
}
