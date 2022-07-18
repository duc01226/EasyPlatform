using Microsoft.EntityFrameworkCore.Migrations;

namespace PlatformExampleApp.TextSnippet.Persistence.Migrations
{
    public partial class SupportInboxUpdate : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "ConsumerDate",
                table: "PlatformInboxEventBusMessageDbSet",
                newName: "LastConsumeDate");

            migrationBuilder.RenameIndex(
                name: "IX_PlatformInboxEventBusMessageDbSet_ConsumerDate",
                table: "PlatformInboxEventBusMessageDbSet",
                newName: "IX_PlatformInboxEventBusMessageDbSet_LastConsumeDate");

            migrationBuilder.AddColumn<string>(
                name: "ConsumeStatus",
                table: "PlatformInboxEventBusMessageDbSet",
                type: "nvarchar(450)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedDate",
                table: "PlatformInboxEventBusMessageDbSet",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "LastConsumeError",
                table: "PlatformInboxEventBusMessageDbSet",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PlatformInboxEventBusMessageDbSet_ConsumeStatus_CreatedDate",
                table: "PlatformInboxEventBusMessageDbSet",
                columns: new[] { "ConsumeStatus", "CreatedDate" });

            migrationBuilder.CreateIndex(
                name: "IX_PlatformInboxEventBusMessageDbSet_ConsumeStatus_LastConsumeDate",
                table: "PlatformInboxEventBusMessageDbSet",
                columns: new[] { "ConsumeStatus", "LastConsumeDate" });

            migrationBuilder.CreateIndex(
                name: "IX_PlatformInboxEventBusMessageDbSet_CreatedDate",
                table: "PlatformInboxEventBusMessageDbSet",
                column: "CreatedDate");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PlatformInboxEventBusMessageDbSet_ConsumeStatus_CreatedDate",
                table: "PlatformInboxEventBusMessageDbSet");

            migrationBuilder.DropIndex(
                name: "IX_PlatformInboxEventBusMessageDbSet_ConsumeStatus_LastConsumeDate",
                table: "PlatformInboxEventBusMessageDbSet");

            migrationBuilder.DropIndex(
                name: "IX_PlatformInboxEventBusMessageDbSet_CreatedDate",
                table: "PlatformInboxEventBusMessageDbSet");

            migrationBuilder.DropColumn(
                name: "ConsumeStatus",
                table: "PlatformInboxEventBusMessageDbSet");

            migrationBuilder.DropColumn(
                name: "CreatedDate",
                table: "PlatformInboxEventBusMessageDbSet");

            migrationBuilder.DropColumn(
                name: "LastConsumeError",
                table: "PlatformInboxEventBusMessageDbSet");

            migrationBuilder.RenameColumn(
                name: "LastConsumeDate",
                table: "PlatformInboxEventBusMessageDbSet",
                newName: "ConsumerDate");

            migrationBuilder.RenameIndex(
                name: "IX_PlatformInboxEventBusMessageDbSet_LastConsumeDate",
                table: "PlatformInboxEventBusMessageDbSet",
                newName: "IX_PlatformInboxEventBusMessageDbSet_ConsumerDate");
        }
    }
}
