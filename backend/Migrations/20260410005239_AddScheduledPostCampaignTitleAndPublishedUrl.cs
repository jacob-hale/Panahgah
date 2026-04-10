using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Panahgah.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddScheduledPostCampaignTitleAndPublishedUrl : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "campaign_title",
                table: "scheduled_social_posts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "published_post_url",
                table: "scheduled_social_posts",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "campaign_title",
                table: "scheduled_social_posts");

            migrationBuilder.DropColumn(
                name: "published_post_url",
                table: "scheduled_social_posts");
        }
    }
}
