using System;
using Microsoft.EntityFrameworkCore.Migrations;

namespace PlatformExampleApp.TextSnippet.Persistence.Migrations
{
    public partial class SupportInboxEventBusMessage : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PlatformInboxEventBusMessage",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    JsonMessage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MessageTypeFullName = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    RoutingKey = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ConsumerDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlatformInboxEventBusMessage", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PlatformInboxEventBusMessage_ConsumerDate",
                table: "PlatformInboxEventBusMessage",
                column: "ConsumerDate");

            migrationBuilder.CreateIndex(
                name: "IX_PlatformInboxEventBusMessage_RoutingKey",
                table: "PlatformInboxEventBusMessage",
                column: "RoutingKey");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PlatformInboxEventBusMessage");
        }
    }
}
