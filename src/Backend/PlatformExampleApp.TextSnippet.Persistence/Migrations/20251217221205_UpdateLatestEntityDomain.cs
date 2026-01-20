using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable
#pragma warning disable IDE0300 // Collection initialization can be simplified

namespace PlatformExampleApp.TextSnippet.Persistence.Migrations;

/// <inheritdoc />
public partial class UpdateLatestEntityDomain : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "IX_PlatformOutboxEventBusMessage_SendStatus_LastProcessingPingDate_CreatedDate",
            table: "PlatformOutboxEventBusMessage");

        migrationBuilder.DropIndex(
            name: "IX_PlatformOutboxEventBusMessage_SendStatus_NextRetryProcessAfter_CreatedDate",
            table: "PlatformOutboxEventBusMessage");

        migrationBuilder.DropIndex(
            name: "IX_PlatformInboxEventBusMessage_ConsumeStatus_LastProcessingPingDate_ForApplicationName_CreatedDate",
            table: "PlatformInboxEventBusMessage");

        migrationBuilder.DropIndex(
            name: "IX_PlatformInboxEventBusMessage_ConsumeStatus_NextRetryProcessAfter_ForApplicationName_CreatedDate",
            table: "PlatformInboxEventBusMessage");

        migrationBuilder.AddColumn<string>(
            name: "Category",
            table: "TextSnippetEntity",
            type: "nvarchar(max)",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "CreatedByDepartment",
            table: "TextSnippetEntity",
            type: "nvarchar(max)",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "Title",
            table: "TextSnippetEntity",
            type: "nvarchar(max)",
            nullable: true);

        migrationBuilder.CreateIndex(
            name: "IX_PlatformOutboxEventBusMessage_Id_SendStatus_CreatedDate",
            table: "PlatformOutboxEventBusMessage",
            columns: new[] { "Id", "SendStatus", "CreatedDate" });

        migrationBuilder.CreateIndex(
            name: "IX_PlatformOutboxEventBusMessage_SendStatus_CreatedDate_LastProcessingPingDate",
            table: "PlatformOutboxEventBusMessage",
            columns: new[] { "SendStatus", "CreatedDate", "LastProcessingPingDate" });

        migrationBuilder.CreateIndex(
            name: "IX_PlatformOutboxEventBusMessage_SendStatus_CreatedDate_LastSendDate",
            table: "PlatformOutboxEventBusMessage",
            columns: new[] { "SendStatus", "CreatedDate", "LastSendDate" });

        migrationBuilder.CreateIndex(
            name: "IX_PlatformOutboxEventBusMessage_SendStatus_CreatedDate_NextRetryProcessAfter",
            table: "PlatformOutboxEventBusMessage",
            columns: new[] { "SendStatus", "CreatedDate", "NextRetryProcessAfter" });

        migrationBuilder.CreateIndex(
            name: "IX_PlatformInboxEventBusMessage_ConsumeStatus_ForApplicationName_CreatedDate",
            table: "PlatformInboxEventBusMessage",
            columns: new[] { "ConsumeStatus", "ForApplicationName", "CreatedDate" });

        migrationBuilder.CreateIndex(
            name: "IX_PlatformInboxEventBusMessage_ConsumeStatus_ForApplicationName_CreatedDate_LastConsumeDate",
            table: "PlatformInboxEventBusMessage",
            columns: new[] { "ConsumeStatus", "ForApplicationName", "CreatedDate", "LastConsumeDate" });

        migrationBuilder.CreateIndex(
            name: "IX_PlatformInboxEventBusMessage_ConsumeStatus_ForApplicationName_CreatedDate_LastProcessingPingDate",
            table: "PlatformInboxEventBusMessage",
            columns: new[] { "ConsumeStatus", "ForApplicationName", "CreatedDate", "LastProcessingPingDate" });

        migrationBuilder.CreateIndex(
            name: "IX_PlatformInboxEventBusMessage_ConsumeStatus_ForApplicationName_CreatedDate_NextRetryProcessAfter",
            table: "PlatformInboxEventBusMessage",
            columns: new[] { "ConsumeStatus", "ForApplicationName", "CreatedDate", "NextRetryProcessAfter" });

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
            name: "IX_PlatformOutboxEventBusMessage_SendStatus_CreatedDate_LastProcessingPingDate",
            table: "PlatformOutboxEventBusMessage");

        migrationBuilder.DropIndex(
            name: "IX_PlatformOutboxEventBusMessage_SendStatus_CreatedDate_LastSendDate",
            table: "PlatformOutboxEventBusMessage");

        migrationBuilder.DropIndex(
            name: "IX_PlatformOutboxEventBusMessage_SendStatus_CreatedDate_NextRetryProcessAfter",
            table: "PlatformOutboxEventBusMessage");

        migrationBuilder.DropIndex(
            name: "IX_PlatformInboxEventBusMessage_ConsumeStatus_ForApplicationName_CreatedDate",
            table: "PlatformInboxEventBusMessage");

        migrationBuilder.DropIndex(
            name: "IX_PlatformInboxEventBusMessage_ConsumeStatus_ForApplicationName_CreatedDate_LastConsumeDate",
            table: "PlatformInboxEventBusMessage");

        migrationBuilder.DropIndex(
            name: "IX_PlatformInboxEventBusMessage_ConsumeStatus_ForApplicationName_CreatedDate_LastProcessingPingDate",
            table: "PlatformInboxEventBusMessage");

        migrationBuilder.DropIndex(
            name: "IX_PlatformInboxEventBusMessage_ConsumeStatus_ForApplicationName_CreatedDate_NextRetryProcessAfter",
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
            name: "IX_PlatformOutboxEventBusMessage_SendStatus_LastProcessingPingDate_CreatedDate",
            table: "PlatformOutboxEventBusMessage",
            columns: new[] { "SendStatus", "LastProcessingPingDate", "CreatedDate" });

        migrationBuilder.CreateIndex(
            name: "IX_PlatformOutboxEventBusMessage_SendStatus_NextRetryProcessAfter_CreatedDate",
            table: "PlatformOutboxEventBusMessage",
            columns: new[] { "SendStatus", "NextRetryProcessAfter", "CreatedDate" });

        migrationBuilder.CreateIndex(
            name: "IX_PlatformInboxEventBusMessage_ConsumeStatus_LastProcessingPingDate_ForApplicationName_CreatedDate",
            table: "PlatformInboxEventBusMessage",
            columns: new[] { "ConsumeStatus", "LastProcessingPingDate", "ForApplicationName", "CreatedDate" });

        migrationBuilder.CreateIndex(
            name: "IX_PlatformInboxEventBusMessage_ConsumeStatus_NextRetryProcessAfter_ForApplicationName_CreatedDate",
            table: "PlatformInboxEventBusMessage",
            columns: new[] { "ConsumeStatus", "NextRetryProcessAfter", "ForApplicationName", "CreatedDate" });
    }
}
