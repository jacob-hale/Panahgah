using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Panahgah.Api.Auth;
using Panahgah.Api.Contracts;
using Panahgah.Api.Data;
using Panahgah.Api.Models;

namespace Panahgah.Api.Controllers;

[ApiController]
[Route("api/process-recordings")]
public class ProcessRecordingsController(ApplicationDbContext dbContext) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = AuthPolicies.RequireDonorOrAdmin)]
    public async Task<IActionResult> GetAll([FromQuery] ProcessRecordingsQueryDto query)
    {
        var q = dbContext.process_recordings.AsNoTracking().AsQueryable();

        if (query.resident_id.HasValue)
        {
            q = q.Where(p => p.resident_id == query.resident_id.Value);
        }

        if (query.session_type is { Length: > 0 })
        {
            var allowed = query.session_type
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Select(s => s.Trim())
                .ToArray();
            if (allowed.Length > 0)
            {
                q = q.Where(p => allowed.Contains(p.session_type));
            }
        }

        if (query.progress_noted == true)
        {
            q = q.Where(p => p.progress_noted);
        }
        if (query.concerns_flagged == true)
        {
            q = q.Where(p => p.concerns_flagged);
        }
        if (query.referral_made == true)
        {
            q = q.Where(p => p.referral_made);
        }

        if (query.from_date.HasValue)
        {
            q = q.Where(p => p.session_date >= query.from_date.Value);
        }
        if (query.to_date.HasValue)
        {
            q = q.Where(p => p.session_date <= query.to_date.Value);
        }

        var sortOrder = (query.sort_order ?? "desc").Trim().ToLowerInvariant();
        q = sortOrder == "asc"
            ? q.OrderBy(p => p.session_date).ThenBy(p => p.recording_id)
            : q.OrderByDescending(p => p.session_date).ThenByDescending(p => p.recording_id);

        var totalRecords = await q.CountAsync();

        var pageSize = query.page_size < 0 ? 10 : query.page_size;

        // "Max" behavior: page_size=0 returns all filtered records.
        if (pageSize == 0)
        {
            var all = await q.ToListAsync();
            return Ok(new PagedResponseDto<ProcessRecording>
            {
                items = all,
                total_records = totalRecords,
                total_pages = 1,
                current_page = 1,
                page_size = 0
            });
        }

        // Guardrails
        if (pageSize < 1)
        {
            pageSize = 10;
        }
        if (pageSize > 500)
        {
            pageSize = 500;
        }

        var totalPages = (int)Math.Ceiling(totalRecords / (double)pageSize);
        if (totalPages <= 0)
        {
            totalPages = 1;
        }

        var currentPage = query.page < 1 ? 1 : query.page;
        if (currentPage > totalPages)
        {
            currentPage = totalPages;
        }

        var items = await q
            .Skip((currentPage - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new PagedResponseDto<ProcessRecording>
        {
            items = items,
            total_records = totalRecords,
            total_pages = totalPages,
            current_page = currentPage,
            page_size = pageSize
        });
    }

    [HttpGet("{id:int}")]
    [Authorize(Policy = AuthPolicies.RequireDonorOrAdmin)]
    public async Task<IActionResult> GetById(int id)
    {
        var recording = await dbContext.process_recordings.AsNoTracking().FirstOrDefaultAsync(p => p.recording_id == id);
        return recording is null ? NotFound() : Ok(recording);
    }

    [HttpPost]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<IActionResult> Create([FromBody] ProcessRecordingUpsertDto request)
    {
        var residentExists = await dbContext.residents.AsNoTracking().AnyAsync(r => r.resident_id == request.resident_id);
        if (!residentExists)
        {
            return BadRequest("Resident not found.");
        }

        var recording = new ProcessRecording
        {
            resident_id = request.resident_id,
            session_date = request.session_date,
            social_worker = request.social_worker.Trim(),
            session_type = request.session_type.Trim(),
            session_duration_minutes = request.session_duration_minutes,
            emotional_state_observed = request.emotional_state_observed.Trim(),
            emotional_state_end = request.emotional_state_end.Trim(),
            session_narrative = request.session_narrative.Trim(),
            interventions_applied = request.interventions_applied.Trim(),
            follow_up_actions = request.follow_up_actions.Trim(),
            progress_noted = request.progress_noted,
            concerns_flagged = request.concerns_flagged,
            referral_made = request.referral_made,
            notes_restricted = (request.notes_restricted ?? string.Empty).Trim()
        };

        dbContext.process_recordings.Add(recording);
        try
        {
            await dbContext.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException pg)
        {
            // Map common constraint errors to a 400 so the UI can show a clear message.
            return pg.SqlState switch
            {
                PostgresErrorCodes.ForeignKeyViolation => BadRequest("Invalid resident_id (foreign key)."),
                PostgresErrorCodes.NotNullViolation => BadRequest("Invalid input (missing required value)."),
                PostgresErrorCodes.StringDataRightTruncation => BadRequest("Invalid input (text too long)."),
                _ => Problem("Failed to create process recording due to a database constraint.")
            };
        }
        return CreatedAtAction(nameof(GetById), new { id = recording.recording_id }, recording);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<IActionResult> Update(int id, [FromBody] ProcessRecordingUpsertDto request)
    {
        var recording = await dbContext.process_recordings.FirstOrDefaultAsync(p => p.recording_id == id);
        if (recording is null)
        {
            return NotFound();
        }

        recording.resident_id = request.resident_id;
        recording.session_date = request.session_date;
        recording.social_worker = request.social_worker.Trim();
        recording.session_type = request.session_type.Trim();
        recording.session_duration_minutes = request.session_duration_minutes;
        recording.emotional_state_observed = request.emotional_state_observed.Trim();
        recording.emotional_state_end = request.emotional_state_end.Trim();
        recording.session_narrative = request.session_narrative.Trim();
        recording.interventions_applied = request.interventions_applied.Trim();
        recording.follow_up_actions = request.follow_up_actions.Trim();
        recording.progress_noted = request.progress_noted;
        recording.concerns_flagged = request.concerns_flagged;
        recording.referral_made = request.referral_made;
        recording.notes_restricted = (request.notes_restricted ?? string.Empty).Trim();

        await dbContext.SaveChangesAsync();
        return Ok(recording);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<IActionResult> Delete(int id, [FromBody] DeleteConfirmationRequestDto request)
    {
        if (!request.ConfirmDelete)
        {
            return BadRequest("ConfirmDelete must be true.");
        }

        var recording = await dbContext.process_recordings.FirstOrDefaultAsync(p => p.recording_id == id);
        if (recording is null)
        {
            return NotFound();
        }

        dbContext.process_recordings.Remove(recording);
        await dbContext.SaveChangesAsync();
        return NoContent();
    }
}
