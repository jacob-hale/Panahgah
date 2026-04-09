using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Panahgah.Api.Auth;
using Panahgah.Api.Contracts;
using Panahgah.Api.Data;
using Panahgah.Api.Models;

namespace Panahgah.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    RoleManager<IdentityRole> roleManager,
    ApplicationDbContext appDb,
    ILogger<AuthController> logger) : ControllerBase
{
    [HttpPost("session/login")]
    [AllowAnonymous]
    public async Task<IActionResult> SessionLogin([FromBody] SessionLoginRequest request)
    {
        var normalizedEmail = request.Email.Trim();
        var user = await userManager.FindByEmailAsync(normalizedEmail);
        if (user is null)
        {
            logger.LogWarning("Session login failed: unknown email {Email}.", normalizedEmail);
            return Unauthorized("Invalid email or password.");
        }

        var passwordSignInResult = await signInManager.PasswordSignInAsync(
            user,
            request.Password,
            isPersistent: true,
            lockoutOnFailure: true);

        if (!passwordSignInResult.Succeeded)
        {
            logger.LogWarning("Session login failed: bad credentials for {Email}.", normalizedEmail);
            return Unauthorized("Invalid email or password.");
        }

        return NoContent();
    }

    [HttpPost("session/register")]
    [AllowAnonymous]
    public async Task<IActionResult> SessionRegister([FromBody] DonorRegisterRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(request.PrimarySupporterType))
        {
            return BadRequest("Primary supporter type is required.");
        }

        if (await userManager.FindByEmailAsync(email) is not null)
        {
            return Conflict("An account with this email already exists.");
        }

        var existingSupporter = await appDb.supporters.FirstOrDefaultAsync(s => s.email.ToLower() == email);
        if (existingSupporter?.identity_user_id is not null)
        {
            return Conflict("An account with this email already exists.");
        }

        var normalizedInterests = ContributionInterestCatalog.Normalize(request.ContributionInterests);
        var interestsJson = normalizedInterests.Length > 0 ? JsonSerializer.Serialize(normalizedInterests) : null;

        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            EmailConfirmed = true
        };

        var createResult = await userManager.CreateAsync(user, request.Password);
        if (!createResult.Succeeded)
        {
            return BadRequest(string.Join("; ", createResult.Errors.Select(e => e.Description)));
        }

        if (!await roleManager.RoleExistsAsync(AuthRoles.Donor))
        {
            await roleManager.CreateAsync(new IdentityRole(AuthRoles.Donor));
        }

        var roleResult = await userManager.AddToRoleAsync(user, AuthRoles.Donor);
        if (!roleResult.Succeeded)
        {
            await userManager.DeleteAsync(user);
            return BadRequest("Failed to assign donor role.");
        }

        try
        {
            if (existingSupporter is not null)
            {
                existingSupporter.identity_user_id = user.Id;
                existingSupporter.display_name = request.DisplayName.Trim();
                existingSupporter.first_name = request.FirstName?.Trim();
                existingSupporter.last_name = request.LastName?.Trim();
                if (!string.IsNullOrWhiteSpace(request.Phone))
                {
                    existingSupporter.phone = request.Phone.Trim();
                }

                existingSupporter.supporter_type = request.PrimarySupporterType.Trim();
                if (!string.IsNullOrWhiteSpace(request.Region))
                {
                    existingSupporter.region = request.Region.Trim();
                }

                if (!string.IsNullOrWhiteSpace(request.Country))
                {
                    existingSupporter.country = request.Country.Trim();
                }

                existingSupporter.status = "active";
                existingSupporter.contribution_interests = interestsJson;
            }
            else
            {
                var supporter = new Supporter
                {
                    identity_user_id = user.Id,
                    email = email,
                    display_name = request.DisplayName.Trim(),
                    first_name = request.FirstName?.Trim(),
                    last_name = request.LastName?.Trim(),
                    phone = string.IsNullOrWhiteSpace(request.Phone) ? "" : request.Phone.Trim(),
                    supporter_type = request.PrimarySupporterType.Trim(),
                    relationship_type = "supporter",
                    region = string.IsNullOrWhiteSpace(request.Region) ? "" : request.Region.Trim(),
                    country = string.IsNullOrWhiteSpace(request.Country) ? "" : request.Country.Trim(),
                    status = "active",
                    acquisition_channel = "web_self_registration",
                    contribution_interests = interestsJson,
                    created_at = DateTime.UtcNow
                };
                appDb.supporters.Add(supporter);
            }

            await appDb.SaveChangesAsync();
        }
        catch
        {
            await userManager.DeleteAsync(user);
            throw;
        }

        await signInManager.SignInAsync(user, isPersistent: true);
        return NoContent();
    }

    [HttpPost("session/logout")]
    [Authorize]
    public async Task<IActionResult> SessionLogout()
    {
        await signInManager.SignOutAsync();
        return NoContent();
    }

    [HttpGet("me")]
    [AllowAnonymous]
    public async Task<IActionResult> GetMe()
    {
        var isAuthenticated = User.Identity?.IsAuthenticated ?? false;

        var email = User.FindFirstValue(ClaimTypes.Email)
            ?? User.FindFirstValue("email")
            ?? User.Identity?.Name;

        var roles = User.FindAll(ClaimTypes.Role).Select(claim => claim.Value).ToArray();

        int? supporterId = null;
        object? supporterProfile = null;

        if (isAuthenticated)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!string.IsNullOrEmpty(userId))
            {
                var supporter = await appDb.supporters.AsNoTracking()
                    .FirstOrDefaultAsync(s => s.identity_user_id == userId);
                if (supporter is not null)
                {
                    supporterId = supporter.supporter_id;
                    string[]? interests = null;
                    if (!string.IsNullOrEmpty(supporter.contribution_interests))
                    {
                        try
                        {
                            interests = JsonSerializer.Deserialize<string[]>(supporter.contribution_interests);
                        }
                        catch (JsonException)
                        {
                            interests = null;
                        }
                    }

                    supporterProfile = new
                    {
                        supporter.supporter_id,
                        supporter.display_name,
                        supporter.first_name,
                        supporter.last_name,
                        supporter.status,
                        supporter.supporter_type,
                        supporter.email,
                        supporter.phone,
                        supporter.region,
                        supporter.country,
                        contribution_interests = interests
                    };
                }
            }
        }
        else
        {
            logger.LogInformation("Auth me requested without authenticated session.");
        }

        return Ok(new
        {
            isAuthenticated,
            email,
            roles,
            supporterId,
            supporterProfile
        });
    }
}

public sealed record SessionLoginRequest(string Email, string Password);
