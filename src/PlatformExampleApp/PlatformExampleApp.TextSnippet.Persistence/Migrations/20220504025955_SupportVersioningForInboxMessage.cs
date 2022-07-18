using Microsoft.EntityFrameworkCore.Migrations;

namespace PlatformExampleApp.TextSnippet.Persistence.Migrations
{
    public partial class SupportVersioningForInboxMessage : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ConcurrencyUpdateToken",
                table: "PlatformInboxEventBusMessageDbSet",
                type: "uniqueidentifier",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ConcurrencyUpdateToken",
                table: "PlatformInboxEventBusMessageDbSet");
        }
    }
}
