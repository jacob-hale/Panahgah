using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Panahgah.Api.Auth;
using Panahgah.Api.Data;

namespace Panahgah.Api.Controllers;

[ApiController]
[Route("api/social-media-posts")]
public class SocialMediaPostsController(ApplicationDbContext dbContext) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<IActionResult> GetAll()
    {
        var posts = await dbContext.social_media_posts
            .AsNoTracking()
            .OrderByDescending(p => p.created_at)
            .ToListAsync();

        return Ok(posts);
    }
}
