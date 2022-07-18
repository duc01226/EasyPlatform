using Microsoft.EntityFrameworkCore.Migrations;

namespace PlatformExampleApp.TextSnippet.Persistence.Migrations
{
    public partial class SupportOutboxEventBusMessage : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PlatformOutboxEventBusMessage",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    JsonMessage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MessageTypeFullName = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    RoutingKey = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    SendStatus = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastSendDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastSendError = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ConcurrencyUpdateToken = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlatformOutboxEventBusMessage", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PlatformOutboxEventBusMessage_CreatedDate",
                table: "PlatformOutboxEventBusMessage",
                column: "CreatedDate");

            migrationBuilder.CreateIndex(
                name: "IX_PlatformOutboxEventBusMessage_LastSendDate",
                table: "PlatformOutboxEventBusMessage",
                column: "LastSendDate");

            migrationBuilder.CreateIndex(
                name: "IX_PlatformOutboxEventBusMessage_RoutingKey",
                table: "PlatformOutboxEventBusMessage",
                column: "RoutingKey");

            migrationBuilder.CreateIndex(
                name: "IX_PlatformOutboxEventBusMessage_SendStatus_CreatedDate",
                table: "PlatformOutboxEventBusMessage",
                columns: new[] { "SendStatus", "CreatedDate" });

            migrationBuilder.CreateIndex(
                name: "IX_PlatformOutboxEventBusMessage_SendStatus_LastSendDate",
                table: "PlatformOutboxEventBusMessage",
                columns: new[] { "SendStatus", "LastSendDate" });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PlatformOutboxEventBusMessage");
        }
    }
}
