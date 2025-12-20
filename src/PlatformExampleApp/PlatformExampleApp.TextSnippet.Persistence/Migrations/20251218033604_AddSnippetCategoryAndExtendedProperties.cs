using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable
#pragma warning disable IDE0300 // Collection initialization can be simplified

namespace PlatformExampleApp.TextSnippet.Persistence.Migrations;

/// <inheritdoc />
public partial class AddSnippetCategoryAndExtendedProperties : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "CategoryId",
            table: "TextSnippetEntity",
            type: "nvarchar(450)",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "DisplayTitle",
            table: "TextSnippetEntity",
            type: "nvarchar(max)",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "FullTextSearch",
            table: "TextSnippetEntity",
            type: "nvarchar(4000)",
            maxLength: 4000,
            nullable: true);

        migrationBuilder.AddColumn<bool>(
            name: "IsDeleted",
            table: "TextSnippetEntity",
            type: "bit",
            nullable: false,
            defaultValue: false);

        migrationBuilder.AddColumn<bool>(
            name: "IsPublished",
            table: "TextSnippetEntity",
            type: "bit",
            nullable: false,
            defaultValue: false);

        migrationBuilder.AddColumn<bool>(
            name: "IsRecentlyModified",
            table: "TextSnippetEntity",
            type: "bit",
            nullable: false,
            defaultValue: false);

        migrationBuilder.AddColumn<DateTime>(
            name: "PublishedDate",
            table: "TextSnippetEntity",
            type: "datetime2",
            nullable: true);

        migrationBuilder.AddColumn<int>(
            name: "Status",
            table: "TextSnippetEntity",
            type: "int",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.AddColumn<string>(
            name: "Tags",
            table: "TextSnippetEntity",
            type: "nvarchar(max)",
            nullable: true);

        migrationBuilder.AddColumn<int>(
            name: "ViewCount",
            table: "TextSnippetEntity",
            type: "int",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.AddColumn<int>(
            name: "WordCount",
            table: "TextSnippetEntity",
            type: "int",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.CreateTable(
            name: "TextSnippetCategory",
            columns: table => new
            {
                Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                ParentCategoryId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                SortOrder = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                IconName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                ColorCode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                IsRootCategory = table.Column<bool>(type: "bit", nullable: false),
                DisplayName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                ConcurrencyUpdateToken = table.Column<string>(type: "nvarchar(max)", nullable: true),
                CreatedBy = table.Column<string>(type: "nvarchar(450)", nullable: true),
                LastUpdatedBy = table.Column<string>(type: "nvarchar(450)", nullable: true),
                CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                LastUpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_TextSnippetCategory", x => x.Id);
                table.ForeignKey(
                    name: "FK_TextSnippetCategory_TextSnippetCategory_ParentCategoryId",
                    column: x => x.ParentCategoryId,
                    principalTable: "TextSnippetCategory",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex(
            name: "IX_TextSnippetEntity_CategoryId",
            table: "TextSnippetEntity",
            column: "CategoryId");

        migrationBuilder.CreateIndex(
            name: "IX_TextSnippetEntity_IsDeleted",
            table: "TextSnippetEntity",
            column: "IsDeleted");

        migrationBuilder.CreateIndex(
            name: "IX_TextSnippetEntity_Status",
            table: "TextSnippetEntity",
            column: "Status");

        migrationBuilder.CreateIndex(
            name: "IX_TextSnippetCategory_CreatedBy",
            table: "TextSnippetCategory",
            column: "CreatedBy");

        migrationBuilder.CreateIndex(
            name: "IX_TextSnippetCategory_CreatedDate",
            table: "TextSnippetCategory",
            column: "CreatedDate");

        migrationBuilder.CreateIndex(
            name: "IX_TextSnippetCategory_IsActive",
            table: "TextSnippetCategory",
            column: "IsActive");

        migrationBuilder.CreateIndex(
            name: "IX_TextSnippetCategory_LastUpdatedBy",
            table: "TextSnippetCategory",
            column: "LastUpdatedBy");

        migrationBuilder.CreateIndex(
            name: "IX_TextSnippetCategory_LastUpdatedDate",
            table: "TextSnippetCategory",
            column: "LastUpdatedDate");

        migrationBuilder.CreateIndex(
            name: "IX_TextSnippetCategory_ParentCategoryId",
            table: "TextSnippetCategory",
            column: "ParentCategoryId");

        migrationBuilder.CreateIndex(
            name: "IX_TextSnippetCategory_ParentCategoryId_Name",
            table: "TextSnippetCategory",
            columns: new[] { "ParentCategoryId", "Name" },
            unique: true,
            filter: "[ParentCategoryId] IS NOT NULL");

        migrationBuilder.AddForeignKey(
            name: "FK_TextSnippetEntity_TextSnippetCategory_CategoryId",
            table: "TextSnippetEntity",
            column: "CategoryId",
            principalTable: "TextSnippetCategory",
            principalColumn: "Id",
            onDelete: ReferentialAction.SetNull);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(
            name: "FK_TextSnippetEntity_TextSnippetCategory_CategoryId",
            table: "TextSnippetEntity");

        migrationBuilder.DropTable(
            name: "TextSnippetCategory");

        migrationBuilder.DropIndex(
            name: "IX_TextSnippetEntity_CategoryId",
            table: "TextSnippetEntity");

        migrationBuilder.DropIndex(
            name: "IX_TextSnippetEntity_IsDeleted",
            table: "TextSnippetEntity");

        migrationBuilder.DropIndex(
            name: "IX_TextSnippetEntity_Status",
            table: "TextSnippetEntity");

        migrationBuilder.DropColumn(
            name: "CategoryId",
            table: "TextSnippetEntity");

        migrationBuilder.DropColumn(
            name: "DisplayTitle",
            table: "TextSnippetEntity");

        migrationBuilder.DropColumn(
            name: "FullTextSearch",
            table: "TextSnippetEntity");

        migrationBuilder.DropColumn(
            name: "IsDeleted",
            table: "TextSnippetEntity");

        migrationBuilder.DropColumn(
            name: "IsPublished",
            table: "TextSnippetEntity");

        migrationBuilder.DropColumn(
            name: "IsRecentlyModified",
            table: "TextSnippetEntity");

        migrationBuilder.DropColumn(
            name: "PublishedDate",
            table: "TextSnippetEntity");

        migrationBuilder.DropColumn(
            name: "Status",
            table: "TextSnippetEntity");

        migrationBuilder.DropColumn(
            name: "Tags",
            table: "TextSnippetEntity");

        migrationBuilder.DropColumn(
            name: "ViewCount",
            table: "TextSnippetEntity");

        migrationBuilder.DropColumn(
            name: "WordCount",
            table: "TextSnippetEntity");
    }
}
