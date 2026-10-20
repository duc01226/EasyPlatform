using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PlatformExampleApp.TextSnippet.Persistence.Migrations;

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
                Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                Description = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                Status = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                Priority = table.Column<int>(type: "int", nullable: false, defaultValue: 1),
                StartDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                DueDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                CompletedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                AssigneeId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                RelatedSnippetId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                EstimatedHours = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                ActualHours = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                Tags = table.Column<string>(type: "nvarchar(max)", nullable: true),
                IsDeleted = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                DeletedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                DeletedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                SubTasks = table.Column<string>(type: "nvarchar(max)", nullable: true),
                ConcurrencyUpdateToken = table.Column<string>(type: "nvarchar(max)", nullable: true),
                IsOverdue = table.Column<bool>(type: "bit", nullable: false),
                DaysUntilDue = table.Column<int>(type: "int", nullable: true),
                CompletionPercentage = table.Column<int>(type: "int", nullable: false),
                IsDueSoon = table.Column<bool>(type: "bit", nullable: false),
                DisplayTitle = table.Column<string>(type: "nvarchar(max)", nullable: true),
                IsActive = table.Column<bool>(type: "bit", nullable: false),
                CreatedBy = table.Column<string>(type: "nvarchar(450)", nullable: true),
                LastUpdatedBy = table.Column<string>(type: "nvarchar(450)", nullable: true),
                CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                LastUpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true)
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
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "TaskItemEntity");
    }
}
