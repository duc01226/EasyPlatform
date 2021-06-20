using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using NoCeiling.Duc.Interview.Test.Platform.EfCore.Utils;
using NoCeiling.Duc.Interview.Test.TextSnippet.Domain.Entities;

namespace NoCeiling.Duc.Interview.Test.TextSnippet.Persistence.Migrations
{
    public partial class AddFullTextSearchIndex_SnippedText : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            MigrationUtil.CreateFullTextCatalogIfNotExists(migrationBuilder, $"FTS_{nameof(TextSnippetEntity)}");
            MigrationUtil.CreateFullTextIndexIfNotExists(migrationBuilder, nameof(TextSnippetEntity), new List<string>() { nameof(TextSnippetEntity.SnippetText) }, "IX_TextSnippetEntity_SnippetText", $"FTS_{nameof(TextSnippetEntity)}");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
