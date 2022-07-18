using Microsoft.EntityFrameworkCore.Migrations;

namespace PlatformExampleApp.TextSnippet.Persistence.Migrations
{
    public partial class SupportConcurrencyUpdate : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Address_Number",
                table: "TextSnippetEntity",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Address_Street",
                table: "TextSnippetEntity",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedByUserId",
                table: "TextSnippetEntity",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ConcurrencyUpdateToken",
                table: "TextSnippetEntity",
                type: "uniqueidentifier",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Address_Number",
                table: "TextSnippetEntity");

            migrationBuilder.DropColumn(
                name: "Address_Street",
                table: "TextSnippetEntity");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "TextSnippetEntity");

            migrationBuilder.DropColumn(
                name: "ConcurrencyUpdateToken",
                table: "TextSnippetEntity");
        }
    }
}
