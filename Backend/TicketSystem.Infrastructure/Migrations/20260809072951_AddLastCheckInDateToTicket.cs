using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TicketSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddLastCheckInDateToTicket : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "LastCheckInDate",
                table: "Tickets",
                type: "date",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastCheckInDate",
                table: "Tickets");
        }
    }
}
