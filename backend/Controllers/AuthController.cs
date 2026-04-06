using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Panahgah.Api.Models;

namespace Panahgah.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(UserManager<ApplicationUser> userManager, SignInManager<ApplicationUser> signInManager) : ControllerBase
{
    [HttpPost("session/login")]
    [AllowAnonymous]
    public async Task<IActionResult> SessionLogin([FromBody] SessionLoginRequest request)
    {
        var normalizedEmail = request.Email.Trim();
        var user = await userManager.FindByEmailAsync(normalizedEmail);
        if (user is null)
        {
            return Unauthorized("Invalid email or password.");
        }

        var passwordSignInResult = await signInManager.PasswordSignInAsync(
            user,
            request.Password,
            isPersistent: true,
            lockoutOnFailure: true);

        if (!passwordSignInResult.Succeeded)
        {
            return Unauthorized("Invalid email or password.");
        }

        return NoContent();
    }

    [HttpPost("session/logout")]
    public async Task<IActionResult> SessionLogout()
    {
        await signInManager.SignOutAsync();
        return NoContent();
    }

    [HttpGet("me")]
    public IActionResult GetMe()
    {
        var isAuthenticated = User.Identity?.IsAuthenticated ?? false;

        var email = User.FindFirstValue(ClaimTypes.Email)
            ?? User.FindFirstValue("email")
            ?? User.Identity?.Name;

        var roles = User.FindAll(ClaimTypes.Role).Select(claim => claim.Value).ToArray();

        return Ok(new
        {
            isAuthenticated,
            email,
            roles
        });
    }
}

public sealed record SessionLoginRequest(string Email, string Password);
