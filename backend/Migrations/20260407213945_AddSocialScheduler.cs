using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Panahgah.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSocialScheduler : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "social_campaigns",
                columns: table => new
                {
                    campaign_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    campaign_name = table.Column<string>(type: "text", nullable: false),
                    platform = table.Column<string>(type: "text", nullable: false),
                    objective = table.Column<string>(type: "text", nullable: false),
                    start_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    end_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_social_campaigns", x => x.campaign_id);
                });

            migrationBuilder.CreateTable(
                name: "scheduled_social_posts",
                columns: table => new
                {
                    scheduled_post_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    campaign_id = table.Column<int>(type: "integer", nullable: true),
                    platform = table.Column<string>(type: "text", nullable: false),
                    scheduled_for_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    caption = table.Column<string>(type: "text", nullable: false),
                    media_url = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    attempt_count = table.Column<int>(type: "integer", nullable: false),
                    error_message = table.Column<string>(type: "text", nullable: true),
                    platform_post_id = table.Column<string>(type: "text", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    published_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_scheduled_social_posts", x => x.scheduled_post_id);
                    table.ForeignKey(
                        name: "FK_scheduled_social_posts_social_campaigns_campaign_id",
                        column: x => x.campaign_id,
                        principalTable: "social_campaigns",
                        principalColumn: "campaign_id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_scheduled_social_posts_campaign_id",
                table: "scheduled_social_posts",
                column: "campaign_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "scheduled_social_posts");

            migrationBuilder.DropTable(
                name: "social_campaigns");
        }
    }
}
