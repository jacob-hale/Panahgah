using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Panahgah.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSupporterIdentityLink : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "contribution_interests",
                table: "supporters",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "identity_user_id",
                table: "supporters",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_supporters_email",
                table: "supporters",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_supporters_identity_user_id",
                table: "supporters",
                column: "identity_user_id",
                unique: true,
                filter: "identity_user_id IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_supporters_email",
                table: "supporters");

            migrationBuilder.DropIndex(
                name: "IX_supporters_identity_user_id",
                table: "supporters");

            migrationBuilder.DropColumn(
                name: "contribution_interests",
                table: "supporters");

            migrationBuilder.DropColumn(
                name: "identity_user_id",
                table: "supporters");
        }
    }
}
