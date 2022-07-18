using Microsoft.EntityFrameworkCore.Migrations;

namespace PlatformExampleApp.TextSnippet.Persistence.Migrations
{
    public partial class InitialCreate : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TextSnippetEntity",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SnippetText = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    FullText = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    LastUpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastUpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TextSnippetEntity", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TextSnippetEntity_CreatedBy",
                table: "TextSnippetEntity",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_TextSnippetEntity_CreatedDate",
                table: "TextSnippetEntity",
                column: "CreatedDate");

            migrationBuilder.CreateIndex(
                name: "IX_TextSnippetEntity_LastUpdatedBy",
                table: "TextSnippetEntity",
                column: "LastUpdatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_TextSnippetEntity_LastUpdatedDate",
                table: "TextSnippetEntity",
                column: "LastUpdatedDate");

            migrationBuilder.CreateIndex(
                name: "IX_TextSnippetEntity_SnippetText",
                table: "TextSnippetEntity",
                column: "SnippetText",
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TextSnippetEntity");
        }
    }
}
