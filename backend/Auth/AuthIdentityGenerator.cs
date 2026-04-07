using Microsoft.AspNetCore.Identity;
using Panahgah.Api.Models;

namespace Panahgah.Api.Auth;

public static class AuthIdentityGenerator
{
    public static async Task SeedAsync(IServiceProvider serviceProvider, IConfiguration configuration)
    {
        using var scope = serviceProvider.CreateScope();

        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

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
    }
}
