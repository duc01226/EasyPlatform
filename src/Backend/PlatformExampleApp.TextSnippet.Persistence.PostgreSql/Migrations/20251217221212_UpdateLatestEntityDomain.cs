using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable
#pragma warning disable IDE0300 // Collection initialization can be simplified

namespace PlatformExampleApp.TextSnippet.Persistence.PostgreSql.Migrations;

/// <inheritdoc />
public partial class UpdateLatestEntityDomain : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "IX_PlatformOutboxEventBusMessage_SendStatus_LastProcessingPing~",
            table: "PlatformOutboxEventBusMessage");

        migrationBuilder.DropIndex(
            name: "IX_PlatformOutboxEventBusMessage_SendStatus_NextRetryProcessAf~",
            table: "PlatformOutboxEventBusMessage");

        migrationBuilder.DropIndex(
            name: "IX_PlatformInboxEventBusMessage_ConsumeStatus_LastProcessingPi~",
            table: "PlatformInboxEventBusMessage");

        migrationBuilder.DropIndex(
            name: "IX_PlatformInboxEventBusMessage_ConsumeStatus_NextRetryProcess~",
            table: "PlatformInboxEventBusMessage");

        migrationBuilder.AddColumn<string>(
            name: "Category",
            table: "TextSnippetEntity",
            type: "text",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "CreatedByDepartment",
            table: "TextSnippetEntity",
            type: "text",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "Title",
            table: "TextSnippetEntity",
            type: "text",
            nullable: true);

        migrationBuilder.CreateIndex(
            name: "IX_PlatformOutboxEventBusMessage_Id_SendStatus_CreatedDate",
            table: "PlatformOutboxEventBusMessage",
            columns: new[] { "Id", "SendStatus", "CreatedDate" });

        migrationBuilder.CreateIndex(
            name: "IX_PlatformOutboxEventBusMessage_SendStatus_CreatedDate_LastPr~",
            table: "PlatformOutboxEventBusMessage",
            columns: new[] { "SendStatus", "CreatedDate", "LastProcessingPingDate" });

        migrationBuilder.CreateIndex(
            name: "IX_PlatformOutboxEventBusMessage_SendStatus_CreatedDate_LastSe~",
            table: "PlatformOutboxEventBusMessage",
            columns: new[] { "SendStatus", "CreatedDate", "LastSendDate" });

        migrationBuilder.CreateIndex(
            name: "IX_PlatformOutboxEventBusMessage_SendStatus_CreatedDate_NextRe~",
            table: "PlatformOutboxEventBusMessage",
            columns: new[] { "SendStatus", "CreatedDate", "NextRetryProcessAfter" });

        migrationBuilder.CreateIndex(
            name: "IX_PlatformInboxEventBusMessage_ConsumeStatus_ForApplicationN~1",
            table: "PlatformInboxEventBusMessage",
            columns: new[] { "ConsumeStatus", "ForApplicationName", "CreatedDate", "LastConsumeDate" });

        migrationBuilder.CreateIndex(
            name: "IX_PlatformInboxEventBusMessage_ConsumeStatus_ForApplicationN~2",
            table: "PlatformInboxEventBusMessage",
            columns: new[] { "ConsumeStatus", "ForApplicationName", "CreatedDate", "LastProcessingPingDate" });

        migrationBuilder.CreateIndex(
            name: "IX_PlatformInboxEventBusMessage_ConsumeStatus_ForApplicationN~3",
            table: "PlatformInboxEventBusMessage",
            columns: new[] { "ConsumeStatus", "ForApplicationName", "CreatedDate", "NextRetryProcessAfter" });

        migrationBuilder.CreateIndex(
            name: "IX_PlatformInboxEventBusMessage_ConsumeStatus_ForApplicationNa~",
            table: "PlatformInboxEventBusMessage",
            columns: new[] { "ConsumeStatus", "ForApplicationName", "CreatedDate" });

        migrationBuilder.CreateIndex(
            name: "IX_PlatformInboxEventBusMessage_Id_ConsumeStatus_CreatedDate",
            table: "PlatformInboxEventBusMessage",
            columns: new[] { "Id", "ConsumeStatus", "CreatedDate" });
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "IX_PlatformOutboxEventBusMessage_Id_SendStatus_CreatedDate",
            table: "PlatformOutboxEventBusMessage");

        migrationBuilder.DropIndex(
            name: "IX_PlatformOutboxEventBusMessage_SendStatus_CreatedDate_LastPr~",
            table: "PlatformOutboxEventBusMessage");

        migrationBuilder.DropIndex(
            name: "IX_PlatformOutboxEventBusMessage_SendStatus_CreatedDate_LastSe~",
            table: "PlatformOutboxEventBusMessage");

        migrationBuilder.DropIndex(
            name: "IX_PlatformOutboxEventBusMessage_SendStatus_CreatedDate_NextRe~",
            table: "PlatformOutboxEventBusMessage");

        migrationBuilder.DropIndex(
            name: "IX_PlatformInboxEventBusMessage_ConsumeStatus_ForApplicationN~1",
            table: "PlatformInboxEventBusMessage");

        migrationBuilder.DropIndex(
            name: "IX_PlatformInboxEventBusMessage_ConsumeStatus_ForApplicationN~2",
            table: "PlatformInboxEventBusMessage");

        migrationBuilder.DropIndex(
            name: "IX_PlatformInboxEventBusMessage_ConsumeStatus_ForApplicationN~3",
            table: "PlatformInboxEventBusMessage");

        migrationBuilder.DropIndex(
            name: "IX_PlatformInboxEventBusMessage_ConsumeStatus_ForApplicationNa~",
            table: "PlatformInboxEventBusMessage");

        migrationBuilder.DropIndex(
            name: "IX_PlatformInboxEventBusMessage_Id_ConsumeStatus_CreatedDate",
            table: "PlatformInboxEventBusMessage");

        migrationBuilder.DropColumn(
            name: "Category",
            table: "TextSnippetEntity");

        migrationBuilder.DropColumn(
            name: "CreatedByDepartment",
            table: "TextSnippetEntity");

        migrationBuilder.DropColumn(
            name: "Title",
            table: "TextSnippetEntity");

        migrationBuilder.CreateIndex(
            name: "IX_PlatformOutboxEventBusMessage_SendStatus_LastProcessingPing~",
            table: "PlatformOutboxEventBusMessage",
            columns: new[] { "SendStatus", "LastProcessingPingDate", "CreatedDate" });

        migrationBuilder.CreateIndex(
            name: "IX_PlatformOutboxEventBusMessage_SendStatus_NextRetryProcessAf~",
            table: "PlatformOutboxEventBusMessage",
            columns: new[] { "SendStatus", "NextRetryProcessAfter", "CreatedDate" });

        migrationBuilder.CreateIndex(
            name: "IX_PlatformInboxEventBusMessage_ConsumeStatus_LastProcessingPi~",
            table: "PlatformInboxEventBusMessage",
            columns: new[] { "ConsumeStatus", "LastProcessingPingDate", "ForApplicationName", "CreatedDate" });

        migrationBuilder.CreateIndex(
            name: "IX_PlatformInboxEventBusMessage_ConsumeStatus_NextRetryProcess~",
            table: "PlatformInboxEventBusMessage",
            columns: new[] { "ConsumeStatus", "NextRetryProcessAfter", "ForApplicationName", "CreatedDate" });
    }
}
