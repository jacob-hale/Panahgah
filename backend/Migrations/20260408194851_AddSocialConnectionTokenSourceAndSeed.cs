using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Panahgah.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSocialConnectionTokenSourceAndSeed : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "token_source",
                table: "social_platform_connections",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.Sql("""
                DELETE FROM social_platform_connections
                WHERE page_id = '1052888731241196'
                  AND platform IN ('facebook', 'instagram');

                INSERT INTO social_platform_connections
                    (platform, account_label, page_id, instagram_business_account_id, token_source, access_token_encrypted, is_active, is_placeholder, created_at_utc, updated_at_utc)
                VALUES
                    ('facebook', 'Panahgah Refuge', '1052888731241196', NULL, 'FACEBOOK_PAGE_ACCESS_TOKEN', NULL, TRUE, FALSE, timezone('utc', now()), timezone('utc', now())),
                    ('instagram', 'panahgah.refuge', '1052888731241196', '17841433440618568', 'FACEBOOK_PAGE_ACCESS_TOKEN', NULL, TRUE, FALSE, timezone('utc', now()), timezone('utc', now()));
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DELETE FROM social_platform_connections
                WHERE page_id = '1052888731241196'
                  AND platform IN ('facebook', 'instagram');
                """);

            migrationBuilder.DropColumn(
                name: "token_source",
                table: "social_platform_connections");
        }
    }
}
