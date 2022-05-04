using Microsoft.EntityFrameworkCore.Migrations;

namespace PlatformExampleApp.TextSnippet.Persistence.Migrations
{
    public partial class UpdateInboxTableName : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_PlatformInboxEventBusMessageDbSet",
                table: "PlatformInboxEventBusMessageDbSet");

            migrationBuilder.RenameTable(
                name: "PlatformInboxEventBusMessageDbSet",
                newName: "PlatformInboxEventBusMessage");

            migrationBuilder.RenameIndex(
                name: "IX_PlatformInboxEventBusMessageDbSet_RoutingKey",
                table: "PlatformInboxEventBusMessage",
                newName: "IX_PlatformInboxEventBusMessage_RoutingKey");

            migrationBuilder.RenameIndex(
                name: "IX_PlatformInboxEventBusMessageDbSet_LastConsumeDate",
                table: "PlatformInboxEventBusMessage",
                newName: "IX_PlatformInboxEventBusMessage_LastConsumeDate");

            migrationBuilder.RenameIndex(
                name: "IX_PlatformInboxEventBusMessageDbSet_CreatedDate",
                table: "PlatformInboxEventBusMessage",
                newName: "IX_PlatformInboxEventBusMessage_CreatedDate");

            migrationBuilder.RenameIndex(
                name: "IX_PlatformInboxEventBusMessageDbSet_ConsumeStatus_LastConsumeDate",
                table: "PlatformInboxEventBusMessage",
                newName: "IX_PlatformInboxEventBusMessage_ConsumeStatus_LastConsumeDate");

            migrationBuilder.RenameIndex(
                name: "IX_PlatformInboxEventBusMessageDbSet_ConsumeStatus_CreatedDate",
                table: "PlatformInboxEventBusMessage",
                newName: "IX_PlatformInboxEventBusMessage_ConsumeStatus_CreatedDate");

            migrationBuilder.AddPrimaryKey(
                name: "PK_PlatformInboxEventBusMessage",
                table: "PlatformInboxEventBusMessage",
                column: "Id");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_PlatformInboxEventBusMessage",
                table: "PlatformInboxEventBusMessage");

            migrationBuilder.RenameTable(
                name: "PlatformInboxEventBusMessage",
                newName: "PlatformInboxEventBusMessageDbSet");

            migrationBuilder.RenameIndex(
                name: "IX_PlatformInboxEventBusMessage_RoutingKey",
                table: "PlatformInboxEventBusMessageDbSet",
                newName: "IX_PlatformInboxEventBusMessageDbSet_RoutingKey");

            migrationBuilder.RenameIndex(
                name: "IX_PlatformInboxEventBusMessage_LastConsumeDate",
                table: "PlatformInboxEventBusMessageDbSet",
                newName: "IX_PlatformInboxEventBusMessageDbSet_LastConsumeDate");

            migrationBuilder.RenameIndex(
                name: "IX_PlatformInboxEventBusMessage_CreatedDate",
                table: "PlatformInboxEventBusMessageDbSet",
                newName: "IX_PlatformInboxEventBusMessageDbSet_CreatedDate");

            migrationBuilder.RenameIndex(
                name: "IX_PlatformInboxEventBusMessage_ConsumeStatus_LastConsumeDate",
                table: "PlatformInboxEventBusMessageDbSet",
                newName: "IX_PlatformInboxEventBusMessageDbSet_ConsumeStatus_LastConsumeDate");

            migrationBuilder.RenameIndex(
                name: "IX_PlatformInboxEventBusMessage_ConsumeStatus_CreatedDate",
                table: "PlatformInboxEventBusMessageDbSet",
                newName: "IX_PlatformInboxEventBusMessageDbSet_ConsumeStatus_CreatedDate");

            migrationBuilder.AddPrimaryKey(
                name: "PK_PlatformInboxEventBusMessageDbSet",
                table: "PlatformInboxEventBusMessageDbSet",
                column: "Id");
        }
    }
}
