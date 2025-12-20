using Easy.Platform.EfCore.Utils;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PlatformExampleApp.TextSnippet.Persistence.Migrations;

/// <inheritdoc />
public partial class UpdateLatestChanges : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        SqlServerMigrationUtil.CreateFullTextIndexIfNotExists(
            migrationBuilder,
            "TaskItemEntity",
            ["Title", "Description"],
            "PK_TaskItemEntity",
            "FTS_TaskItem");
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {

    }
}
