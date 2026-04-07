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
    public async Task<IActionResult> GetAll([FromQuery] ResidentsQueryDto query)
    {
        var q = dbContext.residents.AsNoTracking().AsQueryable();

        // Filters (AND)
        if (!string.IsNullOrWhiteSpace(query.case_status))
        {
            var v = query.case_status.Trim();
            q = q.Where(r => r.case_status == v);
        }

        if (query.safehouse_id.HasValue)
        {
            q = q.Where(r => r.safehouse_id == query.safehouse_id.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.case_category))
        {
            var v = query.case_category.Trim();
            q = q.Where(r => r.case_category == v);
        }

        if (!string.IsNullOrWhiteSpace(query.assigned_social_worker))
        {
            var v = query.assigned_social_worker.Trim();
            q = q.Where(r => r.assigned_social_worker == v);
        }

        if (!string.IsNullOrWhiteSpace(query.reintegration_status))
        {
            var v = query.reintegration_status.Trim();
            q = q.Where(r => r.reintegration_status != null && r.reintegration_status == v);
        }

        if (!string.IsNullOrWhiteSpace(query.current_risk_level))
        {
            var v = query.current_risk_level.Trim();
            q = q.Where(r => r.current_risk_level == v);
        }

        if (!string.IsNullOrWhiteSpace(query.referral_source))
        {
            var v = query.referral_source.Trim();
            q = q.Where(r => r.referral_source == v);
        }

        if (query.date_of_admission_from.HasValue)
        {
            q = q.Where(r => r.date_of_admission >= query.date_of_admission_from.Value);
        }

        if (query.date_of_admission_to.HasValue)
        {
            q = q.Where(r => r.date_of_admission <= query.date_of_admission_to.Value);
        }

        // Safehouse name filter (requires join)
        if (!string.IsNullOrWhiteSpace(query.safehouse))
        {
            var v = query.safehouse.Trim();
            q =
                from r in q
                join sh in dbContext.safehouses.AsNoTracking() on r.safehouse_id equals sh.safehouse_id
                where EF.Functions.Like(sh.name, $"%{v}%")
                select r;
        }

        // Search across key fields
        if (!string.IsNullOrWhiteSpace(query.search))
        {
            var term = query.search.Trim();
            q = q.Where(r =>
                EF.Functions.Like(r.case_control_no, $"%{term}%") ||
                EF.Functions.Like(r.internal_code, $"%{term}%") ||
                EF.Functions.Like(r.assigned_social_worker, $"%{term}%"));
        }

        // Sorting (stable)
        var field = (query.sort_field ?? "case_control_no").Trim().ToLowerInvariant();
        var dir = (query.sort_direction ?? "asc").Trim().ToLowerInvariant();
        var asc = dir != "desc";

        q = field switch
        {
            "date_of_admission" => asc
                ? q.OrderBy(r => r.date_of_admission).ThenBy(r => r.resident_id)
                : q.OrderByDescending(r => r.date_of_admission).ThenByDescending(r => r.resident_id),
            "internal_code" => asc
                ? q.OrderBy(r => r.internal_code).ThenBy(r => r.resident_id)
                : q.OrderByDescending(r => r.internal_code).ThenByDescending(r => r.resident_id),
            "assigned_social_worker" => asc
                ? q.OrderBy(r => r.assigned_social_worker).ThenBy(r => r.resident_id)
                : q.OrderByDescending(r => r.assigned_social_worker).ThenByDescending(r => r.resident_id),
            "case_status" => asc
                ? q.OrderBy(r => r.case_status).ThenBy(r => r.resident_id)
                : q.OrderByDescending(r => r.case_status).ThenByDescending(r => r.resident_id),
            "case_category" => asc
                ? q.OrderBy(r => r.case_category).ThenBy(r => r.resident_id)
                : q.OrderByDescending(r => r.case_category).ThenByDescending(r => r.resident_id),
            "reintegration_status" => asc
                ? q.OrderBy(r => r.reintegration_status).ThenBy(r => r.resident_id)
                : q.OrderByDescending(r => r.reintegration_status).ThenByDescending(r => r.resident_id),
            "current_risk_level" => asc
                ? q.OrderBy(r => r.current_risk_level).ThenBy(r => r.resident_id)
                : q.OrderByDescending(r => r.current_risk_level).ThenByDescending(r => r.resident_id),
            "referral_source" => asc
                ? q.OrderBy(r => r.referral_source).ThenBy(r => r.resident_id)
                : q.OrderByDescending(r => r.referral_source).ThenByDescending(r => r.resident_id),
            // safehouse sorting: join to safehouses for ordering by name, then stable by resident_id
            "safehouse" => asc
                ? (from r in q
                   join sh in dbContext.safehouses.AsNoTracking() on r.safehouse_id equals sh.safehouse_id
                   orderby sh.name, r.resident_id
                   select r)
                : (from r in q
                   join sh in dbContext.safehouses.AsNoTracking() on r.safehouse_id equals sh.safehouse_id
                   orderby sh.name descending, r.resident_id descending
                   select r),
            _ => asc
                ? q.OrderBy(r => r.case_control_no).ThenBy(r => r.resident_id)
                : q.OrderByDescending(r => r.case_control_no).ThenByDescending(r => r.resident_id),
        };

        var totalRecords = await q.CountAsync();

        var pageSize = query.page_size < 0 ? 10 : query.page_size;
        if (pageSize == 0)
        {
            var all = await q.ToListAsync();
            return Ok(new PagedResponseDto<Resident>
            {
                items = all,
                total_records = totalRecords,
                total_pages = 1,
                current_page = 1,
                page_size = 0
            });
        }

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

        return Ok(new PagedResponseDto<Resident>
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
