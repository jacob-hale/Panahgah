using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
    public async Task<IActionResult> GetAll()
    {
        var recordings = await dbContext.process_recordings.AsNoTracking().ToListAsync();
        return Ok(recordings);
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
            notes_restricted = request.notes_restricted.Trim()
        };

        dbContext.process_recordings.Add(recording);
        await dbContext.SaveChangesAsync();
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
        recording.notes_restricted = request.notes_restricted.Trim();

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
