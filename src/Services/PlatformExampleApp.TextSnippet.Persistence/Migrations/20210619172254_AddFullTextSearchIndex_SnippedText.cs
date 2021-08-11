using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using AngularDotnetPlatform.Platform.EfCore.Utils;
using PlatformExampleApp.TextSnippet.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Persistence.Migrations
{
    public partial class AddFullTextSearchIndex_SnippedText : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            SqlMigrationUtil.CreateFullTextCatalogIfNotExists(migrationBuilder, $"FTS_{nameof(TextSnippetEntity)}");
            SqlMigrationUtil.CreateFullTextIndexIfNotExists(migrationBuilder, nameof(TextSnippetEntity), new List<string>() { nameof(TextSnippetEntity.SnippetText) }, "IX_TextSnippetEntity_SnippetText", $"FTS_{nameof(TextSnippetEntity)}");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
