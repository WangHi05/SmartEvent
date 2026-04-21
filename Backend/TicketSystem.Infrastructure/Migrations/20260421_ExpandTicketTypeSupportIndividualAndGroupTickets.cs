using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TicketSystem.Infrastructure.Migrations
{
    public partial class ExpandTicketTypeSupportIndividualAndGroupTickets : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Step 1: Add new columns first
            migrationBuilder.AddColumn<int>(
                name: "TicketMode",
                table: "TicketTypes",
                type: "int",
                nullable: false,
                defaultValue: 1); // Default to INDIVIDUAL

            migrationBuilder.AddColumn<int>(
                name: "UsageType",
                table: "TicketTypes",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MinGroupSize",
                table: "TicketTypes",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MaxGroupSize",
                table: "TicketTypes",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "QRMode",
                table: "TicketTypes",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PriceMode",
                table: "TicketTypes",
                type: "int",
                nullable: true);

            // Step 2: Rename columns (MaxCapacity -> Quantity, RemainingCapacity -> RemainingQuantity, MaxPerPerson -> MaxPerUser)
            // Note: SQL Server doesn't have direct column rename in EF Core, so we:
            // 1. Create new columns
            // 2. Copy data
            // 3. Drop old columns
            // 4. Rename new columns

            // For SQL Server compatibility:
            migrationBuilder.Sql(@"
                -- Create new columns
                ALTER TABLE TicketTypes ADD Quantity_New INT NOT NULL DEFAULT 0;
                ALTER TABLE TicketTypes ADD RemainingQuantity_New INT NOT NULL DEFAULT 0;
                ALTER TABLE TicketTypes ADD MaxPerUser_New INT NOT NULL DEFAULT 1;
                
                -- Copy data from old columns to new columns
                UPDATE TicketTypes 
                SET Quantity_New = MaxCapacity, 
                    RemainingQuantity_New = RemainingCapacity,
                    MaxPerUser_New = MaxPerPerson;
                
                -- Drop old columns
                ALTER TABLE TicketTypes DROP COLUMN MaxCapacity;
                ALTER TABLE TicketTypes DROP COLUMN RemainingCapacity;
                ALTER TABLE TicketTypes DROP COLUMN MaxPerPerson;
                
                -- Rename new columns to final names
                EXEC sp_rename 'TicketTypes.Quantity_New', 'Quantity', 'COLUMN';
                EXEC sp_rename 'TicketTypes.RemainingQuantity_New', 'RemainingQuantity', 'COLUMN';
                EXEC sp_rename 'TicketTypes.MaxPerUser_New', 'MaxPerUser', 'COLUMN';
            ");

            // Step 3: Add NOT NULL constraint after data migration
            migrationBuilder.AlterColumn<int>(
                name: "Quantity",
                table: "TicketTypes",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<int>(
                name: "RemainingQuantity",
                table: "TicketTypes",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<int>(
                name: "MaxPerUser",
                table: "TicketTypes",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");

            // Step 4: Add validation constraints
            migrationBuilder.Sql(@"
                ALTER TABLE TicketTypes 
                ADD CONSTRAINT CK_Quantity CHECK (Quantity > 0);
                
                ALTER TABLE TicketTypes 
                ADD CONSTRAINT CK_RemainingQuantity CHECK (RemainingQuantity >= 0);
                
                ALTER TABLE TicketTypes 
                ADD CONSTRAINT CK_MaxPerUser CHECK (MaxPerUser > 0);
                
                ALTER TABLE TicketTypes 
                ADD CONSTRAINT CK_MinMaxGroupSize CHECK (MinGroupSize IS NULL OR MaxGroupSize IS NULL OR MinGroupSize <= MaxGroupSize);
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Step 1: Drop new columns and constraints
            migrationBuilder.Sql(@"
                ALTER TABLE TicketTypes DROP CONSTRAINT IF EXISTS CK_Quantity;
                ALTER TABLE TicketTypes DROP CONSTRAINT IF EXISTS CK_RemainingQuantity;
                ALTER TABLE TicketTypes DROP CONSTRAINT IF EXISTS CK_MaxPerUser;
                ALTER TABLE TicketTypes DROP CONSTRAINT IF EXISTS CK_MinMaxGroupSize;
            ");

            // Step 2: Rename columns back (Quantity -> MaxCapacity, RemainingQuantity -> RemainingCapacity, MaxPerUser -> MaxPerPerson)
            migrationBuilder.Sql(@"
                -- Create old column names
                ALTER TABLE TicketTypes ADD MaxCapacity_Old INT NOT NULL DEFAULT 0;
                ALTER TABLE TicketTypes ADD RemainingCapacity_Old INT NOT NULL DEFAULT 0;
                ALTER TABLE TicketTypes ADD MaxPerPerson_Old INT NOT NULL DEFAULT 1;
                
                -- Copy data back
                UPDATE TicketTypes 
                SET MaxCapacity_Old = Quantity, 
                    RemainingCapacity_Old = RemainingQuantity,
                    MaxPerPerson_Old = MaxPerUser;
                
                -- Drop renamed columns
                ALTER TABLE TicketTypes DROP COLUMN Quantity;
                ALTER TABLE TicketTypes DROP COLUMN RemainingQuantity;
                ALTER TABLE TicketTypes DROP COLUMN MaxPerUser;
                
                -- Rename old columns back to original names
                EXEC sp_rename 'TicketTypes.MaxCapacity_Old', 'MaxCapacity', 'COLUMN';
                EXEC sp_rename 'TicketTypes.RemainingCapacity_Old', 'RemainingCapacity', 'COLUMN';
                EXEC sp_rename 'TicketTypes.MaxPerPerson_Old', 'MaxPerPerson', 'COLUMN';
            ");

            // Step 3: Drop new columns
            migrationBuilder.DropColumn(
                name: "PriceMode",
                table: "TicketTypes");

            migrationBuilder.DropColumn(
                name: "QRMode",
                table: "TicketTypes");

            migrationBuilder.DropColumn(
                name: "MaxGroupSize",
                table: "TicketTypes");

            migrationBuilder.DropColumn(
                name: "MinGroupSize",
                table: "TicketTypes");

            migrationBuilder.DropColumn(
                name: "UsageType",
                table: "TicketTypes");

            migrationBuilder.DropColumn(
                name: "TicketMode",
                table: "TicketTypes");
        }
    }
}
