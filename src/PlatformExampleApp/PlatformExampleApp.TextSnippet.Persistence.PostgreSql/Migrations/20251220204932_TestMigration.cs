using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PlatformExampleApp.TextSnippet.Persistence.PostgreSql.Migrations
{
    /// <inheritdoc />
    public partial class TestMigration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_TaskItem_Description_FullTextSearch",
                table: "TaskItemEntity",
                column: "Description")
                .Annotation("Npgsql:IndexMethod", "GIN")
                .Annotation("Npgsql:IndexOperators", new[] { "gin_trgm_ops" })
                .Annotation("Npgsql:TsVectorConfig", "english");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TaskItem_Description_FullTextSearch",
                table: "TaskItemEntity");
        }
    }
}
