using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Panahgah.Api.Data;
using Panahgah.Api.Models;

namespace Panahgah.Api.Auth;

public static class AuthIdentityGenerator
{
    public static async Task SeedAsync(IServiceProvider serviceProvider, IConfiguration configuration)
    {
        using var scope = serviceProvider.CreateScope();

        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var appDb = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        if (!await roleManager.RoleExistsAsync(AuthRoles.Admin))
        {
            var createRoleResult = await roleManager.CreateAsync(new IdentityRole(AuthRoles.Admin));
            if (!createRoleResult.Succeeded)
            {
                throw new InvalidOperationException("Failed to create Admin role.");
            }
        }

        if (!await roleManager.RoleExistsAsync(AuthRoles.Donor))
        {
            var createDonorRole = await roleManager.CreateAsync(new IdentityRole(AuthRoles.Donor));
            if (!createDonorRole.Succeeded)
            {
                throw new InvalidOperationException("Failed to create Donor role.");
            }
        }

        var adminEmail = configuration["AuthSeed:AdminEmail"] ?? "admin@panahgah.local";
        var adminPassword = configuration["AuthSeed:AdminPassword"] ?? "change-this-admin-password";

        var adminUser = await userManager.FindByEmailAsync(adminEmail);
        if (adminUser is null)
        {
            adminUser = new ApplicationUser
            {
                UserName = adminEmail,
                Email = adminEmail,
                EmailConfirmed = true
            };

            var createUserResult = await userManager.CreateAsync(adminUser, adminPassword);
            if (!createUserResult.Succeeded)
            {
                var errorDescriptions = string.Join("; ", createUserResult.Errors.Select(e => e.Description));
                throw new InvalidOperationException($"Failed to create default Admin user: {errorDescriptions}");
            }
        }
        else
        {
            var passwordMatches = await userManager.CheckPasswordAsync(adminUser, adminPassword);
            if (!passwordMatches)
            {
                var resetToken = await userManager.GeneratePasswordResetTokenAsync(adminUser);
                var resetResult = await userManager.ResetPasswordAsync(adminUser, resetToken, adminPassword);
                if (!resetResult.Succeeded)
                {
                    var errorDescriptions = string.Join("; ", resetResult.Errors.Select(e => e.Description));
                    throw new InvalidOperationException($"Failed to reset default Admin user password: {errorDescriptions}");
                }
            }
        }

        if (!await userManager.IsInRoleAsync(adminUser, AuthRoles.Admin))
        {
            var addToRoleResult = await userManager.AddToRoleAsync(adminUser, AuthRoles.Admin);
            if (!addToRoleResult.Succeeded)
            {
                throw new InvalidOperationException("Failed to assign Admin role to default Admin user.");
            }
        }

        var adminSupporter = await appDb.supporters.FirstOrDefaultAsync(s => s.identity_user_id == adminUser.Id);
        if (adminSupporter is null)
        {
            adminSupporter = await appDb.supporters.FirstOrDefaultAsync(s => s.email.ToLower() == adminEmail.ToLower());
        }

        if (adminSupporter is null)
        {
            appDb.supporters.Add(new Supporter
            {
                identity_user_id = adminUser.Id,
                supporter_type = "individual",
                display_name = "Vikram Patel",
                first_name = "Vikram",
                last_name = "Patel",
                relationship_type = "staff_admin",
                region = "Tamil Nadu",
                country = "India",
                email = adminEmail.ToLowerInvariant(),
                phone = "+91 98765 43210",
                status = "active",
                acquisition_channel = "system_seed",
                created_at = DateTime.UtcNow
            });
        }
        else
        {
            adminSupporter.identity_user_id = adminUser.Id;
            adminSupporter.display_name = "Vikram Patel";
            adminSupporter.first_name = "Vikram";
            adminSupporter.last_name = "Patel";
            adminSupporter.supporter_type = string.IsNullOrWhiteSpace(adminSupporter.supporter_type) ? "individual" : adminSupporter.supporter_type;
            adminSupporter.relationship_type = string.IsNullOrWhiteSpace(adminSupporter.relationship_type) ? "staff_admin" : adminSupporter.relationship_type;
            adminSupporter.status = string.IsNullOrWhiteSpace(adminSupporter.status) ? "active" : adminSupporter.status;
            adminSupporter.email = adminEmail.ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(adminSupporter.phone))
            {
                adminSupporter.phone = "+91 98765 43210";
            }

            if (string.IsNullOrWhiteSpace(adminSupporter.region))
            {
                adminSupporter.region = "Tamil Nadu";
            }

            if (string.IsNullOrWhiteSpace(adminSupporter.country))
            {
                adminSupporter.country = "India";
            }
        }

        await appDb.SaveChangesAsync();
    }
}
