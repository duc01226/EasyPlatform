using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using PlatformExampleApp.TextSnippet.Domain.Entities;

#nullable disable

namespace PlatformExampleApp.TextSnippet.Persistence.PostgreSql.Migrations;

/// <inheritdoc />
public partial class AddTaskItemEntity : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "TaskItemEntity",
            columns: table => new
            {
                Id = table.Column<string>(type: "text", nullable: false),
                Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                Description = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                Status = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                Priority = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                StartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                DueDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                CompletedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                AssigneeId = table.Column<string>(type: "text", nullable: true),
                RelatedSnippetId = table.Column<string>(type: "text", nullable: true),
                EstimatedHours = table.Column<decimal>(type: "numeric", nullable: true),
                ActualHours = table.Column<decimal>(type: "numeric", nullable: true),
                Tags = table.Column<List<string>>(type: "jsonb", nullable: true),
                IsDeleted = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                DeletedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                DeletedBy = table.Column<string>(type: "text", nullable: true),
                SubTasks = table.Column<List<SubTaskItem>>(type: "jsonb", nullable: true),
                ConcurrencyUpdateToken = table.Column<string>(type: "text", nullable: true),
                IsOverdue = table.Column<bool>(type: "boolean", nullable: false),
                DaysUntilDue = table.Column<int>(type: "integer", nullable: true),
                CompletionPercentage = table.Column<int>(type: "integer", nullable: false),
                IsDueSoon = table.Column<bool>(type: "boolean", nullable: false),
                DisplayTitle = table.Column<string>(type: "text", nullable: true),
                IsActive = table.Column<bool>(type: "boolean", nullable: false),
                CreatedBy = table.Column<string>(type: "text", nullable: true),
                LastUpdatedBy = table.Column<string>(type: "text", nullable: true),
                CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                LastUpdatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_TaskItemEntity", x => x.Id);
                table.ForeignKey(
                    name: "FK_TaskItemEntity_TextSnippetEntity_RelatedSnippetId",
                    column: x => x.RelatedSnippetId,
                    principalTable: "TextSnippetEntity",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.SetNull);
            });

        migrationBuilder.CreateIndex(
                name: "IX_TaskItem_Title_FullTextSearch",
                table: "TaskItemEntity",
                column: "Title")
            .Annotation("Npgsql:IndexMethod", "GIN")
            .Annotation("Npgsql:IndexOperators", new[] { "gin_trgm_ops" })
            .Annotation("Npgsql:TsVectorConfig", "english");

        migrationBuilder.CreateIndex(
            name: "IX_TaskItemEntity_AssigneeId",
            table: "TaskItemEntity",
            column: "AssigneeId");

        migrationBuilder.CreateIndex(
            name: "IX_TaskItemEntity_CreatedBy",
            table: "TaskItemEntity",
            column: "CreatedBy");

        migrationBuilder.CreateIndex(
            name: "IX_TaskItemEntity_CreatedDate",
            table: "TaskItemEntity",
            column: "CreatedDate");

        migrationBuilder.CreateIndex(
            name: "IX_TaskItemEntity_DueDate",
            table: "TaskItemEntity",
            column: "DueDate");

        migrationBuilder.CreateIndex(
            name: "IX_TaskItemEntity_IsDeleted",
            table: "TaskItemEntity",
            column: "IsDeleted");

        migrationBuilder.CreateIndex(
            name: "IX_TaskItemEntity_LastUpdatedBy",
            table: "TaskItemEntity",
            column: "LastUpdatedBy");

        migrationBuilder.CreateIndex(
            name: "IX_TaskItemEntity_LastUpdatedDate",
            table: "TaskItemEntity",
            column: "LastUpdatedDate");

        migrationBuilder.CreateIndex(
            name: "IX_TaskItemEntity_Priority",
            table: "TaskItemEntity",
            column: "Priority");

        migrationBuilder.CreateIndex(
            name: "IX_TaskItemEntity_RelatedSnippetId",
            table: "TaskItemEntity",
            column: "RelatedSnippetId");

        migrationBuilder.CreateIndex(
            name: "IX_TaskItemEntity_Status",
            table: "TaskItemEntity",
            column: "Status");

        migrationBuilder.CreateIndex(
                name: "IX_TaskItemEntity_SubTasks",
                table: "TaskItemEntity",
                column: "SubTasks")
            .Annotation("Npgsql:IndexMethod", "GIN");

        migrationBuilder.CreateIndex(
                name: "IX_TaskItemEntity_Tags",
                table: "TaskItemEntity",
                column: "Tags")
            .Annotation("Npgsql:IndexMethod", "GIN");
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "TaskItemEntity");
    }
}
