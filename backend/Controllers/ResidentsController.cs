using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Panahgah.Api.Auth;
using Panahgah.Api.Contracts;
using Panahgah.Api.Data;
using Panahgah.Api.Models;

namespace Panahgah.Api.Controllers;

[ApiController]
[Route("api/residents")]
public class ResidentsController(ApplicationDbContext dbContext) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = AuthPolicies.RequireDonorOrAdmin)]
    public async Task<IActionResult> GetAll()
    {
        var residents = await dbContext.residents.AsNoTracking().ToListAsync();
        return Ok(residents);
    }

    [HttpGet("{id:int}")]
    [Authorize(Policy = AuthPolicies.RequireDonorOrAdmin)]
    public async Task<IActionResult> GetById(int id)
    {
        var resident = await dbContext.residents.AsNoTracking().FirstOrDefaultAsync(r => r.resident_id == id);
        return resident is null ? NotFound() : Ok(resident);
    }

    [HttpPost]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<IActionResult> Create([FromBody] ResidentUpsertDto request)
    {
        var resident = MapResident(request);
        resident.created_at = DateTime.UtcNow;

        dbContext.residents.Add(resident);
        await dbContext.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = resident.resident_id }, resident);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<IActionResult> Update(int id, [FromBody] ResidentUpsertDto request)
    {
        var resident = await dbContext.residents.FirstOrDefaultAsync(r => r.resident_id == id);
        if (resident is null)
        {
            return NotFound();
        }

        var mapped = MapResident(request);
        resident.case_control_no = mapped.case_control_no;
        resident.internal_code = mapped.internal_code;
        resident.safehouse_id = mapped.safehouse_id;
        resident.case_status = mapped.case_status;
        resident.sex = mapped.sex;
        resident.date_of_birth = mapped.date_of_birth;
        resident.birth_status = mapped.birth_status;
        resident.place_of_birth = mapped.place_of_birth;
        resident.religion = mapped.religion;
        resident.case_category = mapped.case_category;
        resident.sub_cat_orphaned = mapped.sub_cat_orphaned;
        resident.sub_cat_trafficked = mapped.sub_cat_trafficked;
        resident.sub_cat_child_labor = mapped.sub_cat_child_labor;
        resident.sub_cat_physical_abuse = mapped.sub_cat_physical_abuse;
        resident.sub_cat_sexual_abuse = mapped.sub_cat_sexual_abuse;
        resident.sub_cat_osaec = mapped.sub_cat_osaec;
        resident.sub_cat_cicl = mapped.sub_cat_cicl;
        resident.sub_cat_at_risk = mapped.sub_cat_at_risk;
        resident.sub_cat_street_child = mapped.sub_cat_street_child;
        resident.sub_cat_child_with_hiv = mapped.sub_cat_child_with_hiv;
        resident.is_pwd = mapped.is_pwd;
        resident.pwd_type = mapped.pwd_type;
        resident.has_special_needs = mapped.has_special_needs;
        resident.special_needs_diagnosis = mapped.special_needs_diagnosis;
        resident.family_is_4ps = mapped.family_is_4ps;
        resident.family_solo_parent = mapped.family_solo_parent;
        resident.family_indigenous = mapped.family_indigenous;
        resident.family_parent_pwd = mapped.family_parent_pwd;
        resident.family_informal_settler = mapped.family_informal_settler;
        resident.date_of_admission = mapped.date_of_admission;
        resident.age_upon_admission = mapped.age_upon_admission;
        resident.present_age = mapped.present_age;
        resident.length_of_stay = mapped.length_of_stay;
        resident.referral_source = mapped.referral_source;
        resident.referring_agency_person = mapped.referring_agency_person;
        resident.date_colb_registered = mapped.date_colb_registered;
        resident.date_colb_obtained = mapped.date_colb_obtained;
        resident.assigned_social_worker = mapped.assigned_social_worker;
        resident.initial_case_assessment = mapped.initial_case_assessment;
        resident.date_case_study_prepared = mapped.date_case_study_prepared;
        resident.reintegration_type = mapped.reintegration_type;
        resident.reintegration_status = mapped.reintegration_status;
        resident.initial_risk_level = mapped.initial_risk_level;
        resident.current_risk_level = mapped.current_risk_level;
        resident.date_enrolled = mapped.date_enrolled;
        resident.date_closed = mapped.date_closed;
        resident.notes_restricted = mapped.notes_restricted;

        await dbContext.SaveChangesAsync();
        return Ok(resident);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<IActionResult> Delete(int id, [FromBody] DeleteConfirmationRequestDto request)
    {
        if (!request.ConfirmDelete)
        {
            return BadRequest("ConfirmDelete must be true.");
        }

        var resident = await dbContext.residents.FirstOrDefaultAsync(r => r.resident_id == id);
        if (resident is null)
        {
            return NotFound();
        }

        dbContext.residents.Remove(resident);
        await dbContext.SaveChangesAsync();
        return NoContent();
    }

    private static Resident MapResident(ResidentUpsertDto request) =>
        new()
        {
            case_control_no = request.case_control_no.Trim(),
            internal_code = request.internal_code.Trim(),
            safehouse_id = request.safehouse_id,
            case_status = request.case_status.Trim(),
            sex = request.sex.Trim(),
            date_of_birth = request.date_of_birth,
            birth_status = request.birth_status.Trim(),
            place_of_birth = request.place_of_birth.Trim(),
            religion = request.religion.Trim(),
            case_category = request.case_category.Trim(),
            sub_cat_orphaned = request.sub_cat_orphaned,
            sub_cat_trafficked = request.sub_cat_trafficked,
            sub_cat_child_labor = request.sub_cat_child_labor,
            sub_cat_physical_abuse = request.sub_cat_physical_abuse,
            sub_cat_sexual_abuse = request.sub_cat_sexual_abuse,
            sub_cat_osaec = request.sub_cat_osaec,
            sub_cat_cicl = request.sub_cat_cicl,
            sub_cat_at_risk = request.sub_cat_at_risk,
            sub_cat_street_child = request.sub_cat_street_child,
            sub_cat_child_with_hiv = request.sub_cat_child_with_hiv,
            is_pwd = request.is_pwd,
            pwd_type = request.pwd_type?.Trim(),
            has_special_needs = request.has_special_needs,
            special_needs_diagnosis = request.special_needs_diagnosis?.Trim(),
            family_is_4ps = request.family_is_4ps,
            family_solo_parent = request.family_solo_parent,
            family_indigenous = request.family_indigenous,
            family_parent_pwd = request.family_parent_pwd,
            family_informal_settler = request.family_informal_settler,
            date_of_admission = request.date_of_admission,
            age_upon_admission = request.age_upon_admission.Trim(),
            present_age = request.present_age.Trim(),
            length_of_stay = request.length_of_stay.Trim(),
            referral_source = request.referral_source.Trim(),
            referring_agency_person = request.referring_agency_person.Trim(),
            date_colb_registered = request.date_colb_registered,
            date_colb_obtained = request.date_colb_obtained,
            assigned_social_worker = request.assigned_social_worker.Trim(),
            initial_case_assessment = request.initial_case_assessment.Trim(),
            date_case_study_prepared = request.date_case_study_prepared,
            reintegration_type = request.reintegration_type?.Trim(),
            reintegration_status = request.reintegration_status?.Trim(),
            initial_risk_level = request.initial_risk_level.Trim(),
            current_risk_level = request.current_risk_level.Trim(),
            date_enrolled = request.date_enrolled,
            date_closed = request.date_closed,
            notes_restricted = request.notes_restricted.Trim()
        };
}
