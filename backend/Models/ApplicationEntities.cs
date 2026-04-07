namespace Panahgah.Api.Models;

public class Safehouse
{
    public int safehouse_id { get; set; }
    public string safehouse_code { get; set; } = string.Empty;
    public string name { get; set; } = string.Empty;
    public string region { get; set; } = string.Empty;
    public string city { get; set; } = string.Empty;
    public string province { get; set; } = string.Empty;
    public string country { get; set; } = string.Empty;
    public DateOnly open_date { get; set; }
    public string status { get; set; } = string.Empty;
    public int capacity_girls { get; set; }
    public int capacity_staff { get; set; }
    public int current_occupancy { get; set; }
    public string notes { get; set; } = string.Empty;

    public ICollection<PartnerAssignment> partner_assignments { get; set; } = new List<PartnerAssignment>();
    public ICollection<DonationAllocation> donation_allocations { get; set; } = new List<DonationAllocation>();
    public ICollection<Resident> residents { get; set; } = new List<Resident>();
    public ICollection<IncidentReport> incident_reports { get; set; } = new List<IncidentReport>();
    public ICollection<SafehouseMonthlyMetric> safehouse_monthly_metrics { get; set; } = new List<SafehouseMonthlyMetric>();
}

public class Partner
{
    public int partner_id { get; set; }
    public string partner_name { get; set; } = string.Empty;
    public string partner_type { get; set; } = string.Empty;
    public string role_type { get; set; } = string.Empty;
    public string contact_name { get; set; } = string.Empty;
    public string email { get; set; } = string.Empty;
    public string phone { get; set; } = string.Empty;
    public string region { get; set; } = string.Empty;
    public string status { get; set; } = string.Empty;
    public DateOnly start_date { get; set; }
    public DateOnly? end_date { get; set; }
    public string notes { get; set; } = string.Empty;

    public ICollection<PartnerAssignment> partner_assignments { get; set; } = new List<PartnerAssignment>();
    public ICollection<Donation> donations_created { get; set; } = new List<Donation>();
}

public class PartnerAssignment
{
    public int assignment_id { get; set; }
    public int partner_id { get; set; }
    public int? safehouse_id { get; set; }
    public string program_area { get; set; } = string.Empty;
    public DateOnly assignment_start { get; set; }
    public DateOnly? assignment_end { get; set; }
    public string responsibility_notes { get; set; } = string.Empty;
    public bool is_primary { get; set; }
    public string status { get; set; } = string.Empty;

    public Partner partner { get; set; } = null!;
    public Safehouse? safehouse { get; set; }
}

public class Supporter
{
    public int supporter_id { get; set; }

    /// <summary>ASP.NET Identity user id when this supporter has a login account (nullable for legacy/imported rows).</summary>
    public string? identity_user_id { get; set; }

    /// <summary>JSON array of interest keys from self-service signup (e.g. monetary, volunteer, skills).</summary>
    public string? contribution_interests { get; set; }

    public string supporter_type { get; set; } = string.Empty;
    public string display_name { get; set; } = string.Empty;
    public string? organization_name { get; set; }
    public string? first_name { get; set; }
    public string? last_name { get; set; }
    public string relationship_type { get; set; } = string.Empty;
    public string region { get; set; } = string.Empty;
    public string country { get; set; } = string.Empty;
    public string email { get; set; } = string.Empty;
    public string phone { get; set; } = string.Empty;
    public string status { get; set; } = string.Empty;
    public DateOnly? first_donation_date { get; set; }
    public string acquisition_channel { get; set; } = string.Empty;
    public DateTime created_at { get; set; }

    public ICollection<Donation> donations { get; set; } = new List<Donation>();
}

public class Donation
{
    public int donation_id { get; set; }
    public int supporter_id { get; set; }
    public string donation_type { get; set; } = string.Empty;
    public DateOnly donation_date { get; set; }
    public string channel_source { get; set; } = string.Empty;
    public string? currency_code { get; set; }
    public decimal? amount { get; set; }
    public decimal estimated_value { get; set; }
    public string impact_unit { get; set; } = string.Empty;
    public bool is_recurring { get; set; }
    public string? campaign_name { get; set; }
    public string notes { get; set; } = string.Empty;
    public int? created_by_partner_id { get; set; }
    public int? referral_post_id { get; set; }

    public Supporter supporter { get; set; } = null!;
    public Partner? created_by_partner { get; set; }
    public SocialMediaPost? referral_post { get; set; }
    public ICollection<InKindDonationItem> in_kind_donation_items { get; set; } = new List<InKindDonationItem>();
    public ICollection<DonationAllocation> donation_allocations { get; set; } = new List<DonationAllocation>();
}

public class InKindDonationItem
{
    public int item_id { get; set; }
    public int donation_id { get; set; }
    public string item_name { get; set; } = string.Empty;
    public string item_category { get; set; } = string.Empty;
    public int quantity { get; set; }
    public string unit_of_measure { get; set; } = string.Empty;
    public decimal estimated_unit_value { get; set; }
    public string intended_use { get; set; } = string.Empty;
    public string received_condition { get; set; } = string.Empty;

    public Donation donation { get; set; } = null!;
}

public class DonationAllocation
{
    public int allocation_id { get; set; }
    public int donation_id { get; set; }
    public int safehouse_id { get; set; }
    public string program_area { get; set; } = string.Empty;
    public decimal amount_allocated { get; set; }
    public DateOnly allocation_date { get; set; }
    public string allocation_notes { get; set; } = string.Empty;

    public Donation donation { get; set; } = null!;
    public Safehouse safehouse { get; set; } = null!;
}

public class Resident
{
    public int resident_id { get; set; }
    public string case_control_no { get; set; } = string.Empty;
    public string internal_code { get; set; } = string.Empty;
    public int safehouse_id { get; set; }
    public string case_status { get; set; } = string.Empty;
    public string sex { get; set; } = string.Empty;
    public DateOnly date_of_birth { get; set; }
    public string birth_status { get; set; } = string.Empty;
    public string place_of_birth { get; set; } = string.Empty;
    public string religion { get; set; } = string.Empty;
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
    public string? pwd_type { get; set; }
    public bool has_special_needs { get; set; }
    public string? special_needs_diagnosis { get; set; }
    public bool family_is_4ps { get; set; }
    public bool family_solo_parent { get; set; }
    public bool family_indigenous { get; set; }
    public bool family_parent_pwd { get; set; }
    public bool family_informal_settler { get; set; }
    public DateOnly date_of_admission { get; set; }
    public string age_upon_admission { get; set; } = string.Empty;
    public string present_age { get; set; } = string.Empty;
    public string length_of_stay { get; set; } = string.Empty;
    public string referral_source { get; set; } = string.Empty;
    public string referring_agency_person { get; set; } = string.Empty;
    public DateOnly? date_colb_registered { get; set; }
    public DateOnly? date_colb_obtained { get; set; }
    public string assigned_social_worker { get; set; } = string.Empty;
    public string initial_case_assessment { get; set; } = string.Empty;
    public DateOnly? date_case_study_prepared { get; set; }
    public string? reintegration_type { get; set; }
    public string? reintegration_status { get; set; }
    public string initial_risk_level { get; set; } = string.Empty;
    public string current_risk_level { get; set; } = string.Empty;
    public DateOnly date_enrolled { get; set; }
    public DateOnly? date_closed { get; set; }
    public DateTime created_at { get; set; }
    public string notes_restricted { get; set; } = string.Empty;

    public Safehouse safehouse { get; set; } = null!;
    public ICollection<ProcessRecording> process_recordings { get; set; } = new List<ProcessRecording>();
    public ICollection<HomeVisitation> home_visitations { get; set; } = new List<HomeVisitation>();
    public ICollection<EducationRecord> education_records { get; set; } = new List<EducationRecord>();
    public ICollection<HealthWellbeingRecord> health_wellbeing_records { get; set; } = new List<HealthWellbeingRecord>();
    public ICollection<InterventionPlan> intervention_plans { get; set; } = new List<InterventionPlan>();
    public ICollection<IncidentReport> incident_reports { get; set; } = new List<IncidentReport>();
}

public class ProcessRecording
{
    public int recording_id { get; set; }
    public int resident_id { get; set; }
    public DateOnly session_date { get; set; }
    public string social_worker { get; set; } = string.Empty;
    public string session_type { get; set; } = string.Empty;
    public int session_duration_minutes { get; set; }
    public string emotional_state_observed { get; set; } = string.Empty;
    public string emotional_state_end { get; set; } = string.Empty;
    public string session_narrative { get; set; } = string.Empty;
    public string interventions_applied { get; set; } = string.Empty;
    public string follow_up_actions { get; set; } = string.Empty;
    public bool progress_noted { get; set; }
    public bool concerns_flagged { get; set; }
    public bool referral_made { get; set; }
    public string notes_restricted { get; set; } = string.Empty;

    public Resident resident { get; set; } = null!;
}

public class HomeVisitation
{
    public int visitation_id { get; set; }
    public int resident_id { get; set; }
    public DateOnly visit_date { get; set; }
    public string social_worker { get; set; } = string.Empty;
    public string visit_type { get; set; } = string.Empty;
    public string location_visited { get; set; } = string.Empty;
    public string family_members_present { get; set; } = string.Empty;
    public string purpose { get; set; } = string.Empty;
    public string observations { get; set; } = string.Empty;
    public string family_cooperation_level { get; set; } = string.Empty;
    public bool safety_concerns_noted { get; set; }
    public bool follow_up_needed { get; set; }
    public string? follow_up_notes { get; set; }
    public string visit_outcome { get; set; } = string.Empty;

    public Resident resident { get; set; } = null!;
}

public class EducationRecord
{
    public int education_record_id { get; set; }
    public int resident_id { get; set; }
    public DateOnly record_date { get; set; }
    public string program_name { get; set; } = string.Empty;
    public string course_name { get; set; } = string.Empty;
    public string education_level { get; set; } = string.Empty;
    public string attendance_status { get; set; } = string.Empty;
    public decimal attendance_rate { get; set; }
    public decimal progress_percent { get; set; }
    public string completion_status { get; set; } = string.Empty;
    public decimal gpa_like_score { get; set; }
    public string notes { get; set; } = string.Empty;

    public Resident resident { get; set; } = null!;
}

public class HealthWellbeingRecord
{
    public int health_record_id { get; set; }
    public int resident_id { get; set; }
    public DateOnly record_date { get; set; }
    public decimal weight_kg { get; set; }
    public decimal height_cm { get; set; }
    public decimal bmi { get; set; }
    public decimal nutrition_score { get; set; }
    public decimal sleep_score { get; set; }
    public decimal energy_score { get; set; }
    public decimal general_health_score { get; set; }
    public bool medical_checkup_done { get; set; }
    public bool dental_checkup_done { get; set; }
    public bool psychological_checkup_done { get; set; }
    public string medical_notes_restricted { get; set; } = string.Empty;

    public Resident resident { get; set; } = null!;
}

public class InterventionPlan
{
    public int plan_id { get; set; }
    public int resident_id { get; set; }
    public string plan_category { get; set; } = string.Empty;
    public string plan_description { get; set; } = string.Empty;
    public string services_provided { get; set; } = string.Empty;
    public decimal? target_value { get; set; }
    public DateOnly target_date { get; set; }
    public string status { get; set; } = string.Empty;
    public DateOnly? case_conference_date { get; set; }
    public DateTime created_at { get; set; }
    public DateTime updated_at { get; set; }

    public Resident resident { get; set; } = null!;
}

public class IncidentReport
{
    public int incident_id { get; set; }
    public int resident_id { get; set; }
    public int safehouse_id { get; set; }
    public DateOnly incident_date { get; set; }
    public string incident_type { get; set; } = string.Empty;
    public string severity { get; set; } = string.Empty;
    public string description { get; set; } = string.Empty;
    public string response_taken { get; set; } = string.Empty;
    public bool resolved { get; set; }
    public DateOnly? resolution_date { get; set; }
    public string reported_by { get; set; } = string.Empty;
    public bool follow_up_required { get; set; }

    public Resident resident { get; set; } = null!;
    public Safehouse safehouse { get; set; } = null!;
}

public class SocialMediaPost
{
    public int post_id { get; set; }
    public string platform { get; set; } = string.Empty;
    public string platform_post_id { get; set; } = string.Empty;
    public string post_url { get; set; } = string.Empty;
    public DateTime created_at { get; set; }
    public string day_of_week { get; set; } = string.Empty;
    public int post_hour { get; set; }
    public string post_type { get; set; } = string.Empty;
    public string media_type { get; set; } = string.Empty;
    public string caption { get; set; } = string.Empty;
    public string hashtags { get; set; } = string.Empty;
    public int num_hashtags { get; set; }
    public int mentions_count { get; set; }
    public bool has_call_to_action { get; set; }
    public string? call_to_action_type { get; set; }
    public string content_topic { get; set; } = string.Empty;
    public string sentiment_tone { get; set; } = string.Empty;
    public int caption_length { get; set; }
    public bool features_resident_story { get; set; }
    public string? campaign_name { get; set; }
    public bool is_boosted { get; set; }
    public decimal? boost_budget_php { get; set; }
    public int impressions { get; set; }
    public int reach { get; set; }
    public int likes { get; set; }
    public int comments { get; set; }
    public int shares { get; set; }
    public int saves { get; set; }
    public int click_throughs { get; set; }
    public int? video_views { get; set; }
    public decimal engagement_rate { get; set; }
    public int profile_visits { get; set; }
    public int donation_referrals { get; set; }
    public decimal estimated_donation_value_php { get; set; }
    public int follower_count_at_post { get; set; }
    public int? watch_time_seconds { get; set; }
    public int? avg_view_duration_seconds { get; set; }
    public int? subscriber_count_at_post { get; set; }
    public int? forwards { get; set; }

    public ICollection<Donation> referred_donations { get; set; } = new List<Donation>();
}

public class SafehouseMonthlyMetric
{
    public int metric_id { get; set; }
    public int safehouse_id { get; set; }
    public DateOnly month_start { get; set; }
    public DateOnly month_end { get; set; }
    public int active_residents { get; set; }
    public decimal avg_education_progress { get; set; }
    public decimal avg_health_score { get; set; }
    public int process_recording_count { get; set; }
    public int home_visitation_count { get; set; }
    public int incident_count { get; set; }
    public string notes { get; set; } = string.Empty;

    public Safehouse safehouse { get; set; } = null!;
}

public class PublicImpactSnapshot
{
    public int snapshot_id { get; set; }
    public DateOnly snapshot_date { get; set; }
    public string headline { get; set; } = string.Empty;
    public string summary_text { get; set; } = string.Empty;
    public string metric_payload_json { get; set; } = string.Empty;
    public bool is_published { get; set; }
    public DateOnly published_at { get; set; }
}
