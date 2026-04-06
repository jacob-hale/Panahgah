using System.ComponentModel.DataAnnotations;

namespace Panahgah.Api.Contracts;

public class ResidentUpsertDto
{
    [Required, MaxLength(64)]
    public string case_control_no { get; set; } = string.Empty;
    [Required, MaxLength(64)]
    public string internal_code { get; set; } = string.Empty;
    [Required]
    public int safehouse_id { get; set; }
    [Required, MaxLength(64)]
    public string case_status { get; set; } = string.Empty;
    [Required, MaxLength(16)]
    public string sex { get; set; } = string.Empty;
    [Required]
    public DateOnly date_of_birth { get; set; }
    [Required, MaxLength(64)]
    public string birth_status { get; set; } = string.Empty;
    [Required, MaxLength(256)]
    public string place_of_birth { get; set; } = string.Empty;
    [Required, MaxLength(128)]
    public string religion { get; set; } = string.Empty;
    [Required, MaxLength(64)]
    public string case_category { get; set; } = string.Empty;
    public bool sub_cat_orphaned { get; set; }
    public bool sub_cat_trafficked { get; set; }
    public bool sub_cat_child_labor { get; set; }
    public bool sub_cat_physical_abuse { get; set; }
    public bool sub_cat_sexual_abuse { get; set; }
    public bool sub_cat_osaec { get; set; }
    public bool sub_cat_cicl { get; set; }
    public bool sub_cat_at_risk { get; set; }
    public bool sub_cat_street_child { get; set; }
    public bool sub_cat_child_with_hiv { get; set; }
    public bool is_pwd { get; set; }
    [MaxLength(256)]
    public string? pwd_type { get; set; }
    public bool has_special_needs { get; set; }
    [MaxLength(512)]
    public string? special_needs_diagnosis { get; set; }
    public bool family_is_4ps { get; set; }
    public bool family_solo_parent { get; set; }
    public bool family_indigenous { get; set; }
    public bool family_parent_pwd { get; set; }
    public bool family_informal_settler { get; set; }
    [Required]
    public DateOnly date_of_admission { get; set; }
    [Required, MaxLength(128)]
    public string age_upon_admission { get; set; } = string.Empty;
    [Required, MaxLength(128)]
    public string present_age { get; set; } = string.Empty;
    [Required, MaxLength(128)]
    public string length_of_stay { get; set; } = string.Empty;
    [Required, MaxLength(128)]
    public string referral_source { get; set; } = string.Empty;
    [Required, MaxLength(256)]
    public string referring_agency_person { get; set; } = string.Empty;
    public DateOnly? date_colb_registered { get; set; }
    public DateOnly? date_colb_obtained { get; set; }
    [Required, MaxLength(256)]
    public string assigned_social_worker { get; set; } = string.Empty;
    [Required, MaxLength(2000)]
    public string initial_case_assessment { get; set; } = string.Empty;
    public DateOnly? date_case_study_prepared { get; set; }
    [MaxLength(128)]
    public string? reintegration_type { get; set; }
    [MaxLength(128)]
    public string? reintegration_status { get; set; }
    [Required, MaxLength(64)]
    public string initial_risk_level { get; set; } = string.Empty;
    [Required, MaxLength(64)]
    public string current_risk_level { get; set; } = string.Empty;
    [Required]
    public DateOnly date_enrolled { get; set; }
    public DateOnly? date_closed { get; set; }
    [Required, MaxLength(4000)]
    public string notes_restricted { get; set; } = string.Empty;
}
