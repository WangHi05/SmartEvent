using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TicketSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SetEventManagerCreatedByForExistingEvents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // EventManager UserId: 509C0E36-3BEB-431E-BD02-F5074B0F9DD4
            // Assign all existing events (created by seeder) to the event manager account
            migrationBuilder.Sql(
                @"UPDATE Events 
                  SET CreatedBy = '509C0E36-3BEB-431E-BD02-F5074B0F9DD4'
                  WHERE CreatedBy IS NULL OR CreatedBy = 'System (Seed)'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Revert: set all events back to System (Seed)
            migrationBuilder.Sql(
                @"UPDATE Events 
                  SET CreatedBy = 'System (Seed)'
                  WHERE CreatedBy = '509C0E36-3BEB-431E-BD02-F5074B0F9DD4'");
        }
    }
}
