using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Panahgah.Api.Auth;
using Panahgah.Api.Contracts;
using Panahgah.Api.Data;
using Panahgah.Api.Models;

namespace Panahgah.Api.Controllers;

[ApiController]
[Route("api/ml/insights")]
[Authorize(Policy = AuthPolicies.RequireAdmin)]
public class MlInsightsController(ApplicationDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var insights = await dbContext.ml_insights
            .AsNoTracking()
            .OrderByDescending(i => i.created_at)
            .ToListAsync();

        return Ok(insights);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] MlInsightCreateDto request)
    {
        var insight = new MlInsight
        {
            created_at = DateTime.UtcNow,
            business_solution = request.business_solution.Trim(),
            action_items = request.action_items.Trim()
        };

        dbContext.ml_insights.Add(insight);
        await dbContext.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { id = insight.insight_id }, insight);
    }
}
