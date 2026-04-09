/** Shapes match ASP.NET Core JSON (camelCase for ConfirmDelete; snake_case from C# DTOs). */

export type Safehouse = {
  safehouse_id: number;
  safehouse_code: string;
  name: string;
  region: string;
  city: string;
  province: string;
  country: string;
  open_date: string;
  status: string;
  capacity_girls: number;
  capacity_staff: number;
  current_occupancy: number;
  notes: string;
};

export type Resident = {
  resident_id: number;
  case_control_no: string;
  internal_code: string;
  safehouse_id: number;
  case_status: string;
  sex: string;
  date_of_birth: string;
  birth_status: string;
  place_of_birth: string;
  religion: string;
  case_category: string;
  sub_cat_orphaned: boolean;
  sub_cat_trafficked: boolean;
  sub_cat_child_labor: boolean;
  sub_cat_physical_abuse: boolean;
  sub_cat_sexual_abuse: boolean;
  sub_cat_osaec: boolean;
  sub_cat_cicl: boolean;
  sub_cat_at_risk: boolean;
  sub_cat_street_child: boolean;
  sub_cat_child_with_hiv: boolean;
  is_pwd: boolean;
  pwd_type: string | null;
  has_special_needs: boolean;
  special_needs_diagnosis: string | null;
  family_is_4ps: boolean;
  family_solo_parent: boolean;
  family_indigenous: boolean;
  family_parent_pwd: boolean;
  family_informal_settler: boolean;
  date_of_admission: string;
  age_upon_admission: string;
  present_age: string;
  length_of_stay: string;
  referral_source: string;
  referring_agency_person: string;
  date_colb_registered: string | null;
  date_colb_obtained: string | null;
  assigned_social_worker: string;
  initial_case_assessment: string;
  date_case_study_prepared: string | null;
  reintegration_type: string | null;
  reintegration_status: string | null;
  initial_risk_level: string;
  current_risk_level: string;
  date_enrolled: string;
  date_closed: string | null;
  created_at: string;
  notes_restricted: string;
};

export type ResidentUpsertPayload = {
  case_control_no: string;
  internal_code: string;
  safehouse_id: number;
  case_status: string;
  sex: string;
  date_of_birth: string;
  birth_status: string;
  place_of_birth: string;
  religion: string;
  case_category: string;
  sub_cat_orphaned: boolean;
  sub_cat_trafficked: boolean;
  sub_cat_child_labor: boolean;
  sub_cat_physical_abuse: boolean;
  sub_cat_sexual_abuse: boolean;
  sub_cat_osaec: boolean;
  sub_cat_cicl: boolean;
  sub_cat_at_risk: boolean;
  sub_cat_street_child: boolean;
  sub_cat_child_with_hiv: boolean;
  is_pwd: boolean;
  pwd_type: string | null;
  has_special_needs: boolean;
  special_needs_diagnosis: string | null;
  family_is_4ps: boolean;
  family_solo_parent: boolean;
  family_indigenous: boolean;
  family_parent_pwd: boolean;
  family_informal_settler: boolean;
  date_of_admission: string;
  age_upon_admission: string;
  present_age: string;
  length_of_stay: string;
  referral_source: string;
  referring_agency_person: string;
  date_colb_registered: string | null;
  date_colb_obtained: string | null;
  assigned_social_worker: string;
  initial_case_assessment: string;
  date_case_study_prepared: string | null;
  reintegration_type: string | null;
  reintegration_status: string | null;
  initial_risk_level: string;
  current_risk_level: string;
  date_enrolled: string;
  date_closed: string | null;
  notes_restricted: string;
};

export type ProcessRecording = {
  recording_id: number;
  resident_id: number;
  session_date: string;
  social_worker: string;
  session_type: string;
  session_duration_minutes: number;
  emotional_state_observed: string;
  emotional_state_end: string;
  session_narrative: string;
  interventions_applied: string;
  follow_up_actions: string;
  progress_noted: boolean;
  concerns_flagged: boolean;
  referral_made: boolean;
  notes_restricted: string;
};

export type ProcessRecordingUpsertPayload = {
  resident_id: number;
  session_date: string;
  social_worker: string;
  session_type: string;
  session_duration_minutes: number;
  emotional_state_observed: string;
  emotional_state_end: string;
  session_narrative: string;
  interventions_applied: string;
  follow_up_actions: string;
  progress_noted: boolean;
  concerns_flagged: boolean;
  referral_made: boolean;
  notes_restricted: string;
};

export type PagedResponse<T> = {
  items: T[];
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
};

export type SocialMediaPost = {
  post_id: number;
  platform: string;
  day_of_week: string;
  post_hour: number;
  post_type: string;
  media_type: string;
  caption: string;
  hashtags: string;
  num_hashtags: number;
  mentions_count: number;
  has_call_to_action: boolean;
  call_to_action_type: string | null;
  content_topic: string;
  sentiment_tone: string;
  caption_length: number;
  features_resident_story: boolean;
  campaign_name: string | null;
  is_boosted: boolean;
  boost_budget_php: number | null;
  donation_referrals: number;
  created_at: string;
};

export type Model5PostingWindow = {
  day_of_week: string;
  post_hour: number | null;
  avg_referrals: number;
  uplift_pct: number;
};

export type Model5PostTypeByPlatform = {
  platform: string;
  post_type: string;
  avg_referrals: number;
  uplift_pct: number;
};

export type Model5StoryEffect = {
  with_story_avg: number;
  without_story_avg: number;
  with_story_count: number;
  without_story_count: number;
};

export type Model5InsightsResponse = {
  baseline_expected_referrals: number;
  best_windows: Model5PostingWindow[];
  best_post_type_by_platform: Model5PostTypeByPlatform[];
  story_effect: Model5StoryEffect;
};

export type SocialPostGenerateRequest = {
  platform: string;
  goal: string;
  post_type: string;
  post_topic: string;
  include_resident_story: boolean;
  tone: string;
  key_details: string | null;
};

export type GeneratedSocialPost = {
  variant_name: string;
  caption: string;
  hashtags: string[];
};

export type SocialPostGenerateResponse = {
  recommended_day_of_week: string;
  recommended_post_hour: number | null;
  recommended_post_type: string;
  rationale: string;
  generated_posts: GeneratedSocialPost[];
};

export type SocialCampaign = {
  campaign_id: number;
  campaign_name: string;
  platform: string;
  objective: string;
  start_utc: string;
  end_utc: string | null;
  status: string;
  created_at_utc: string;
};

export type SocialCampaignCreatePayload = {
  campaign_name: string;
  platform: string;
  objective: string;
  start_utc: string;
  end_utc: string | null;
};

export type ScheduledSocialPost = {
  scheduled_post_id: number;
  campaign_id: number | null;
  media_asset_id?: number | null;
  platform: string;
  scheduled_for_utc: string;
  caption: string;
  media_url: string | null;
  status: string;
  attempt_count: number;
  error_message: string | null;
  platform_post_id: string | null;
  created_at_utc: string;
  published_at_utc: string | null;
};

export type ScheduledSocialPostCreatePayload = {
  campaign_id: number | null;
  platform: string;
  scheduled_for_utc: string;
  caption: string;
  media_url: string | null;
};

export type CampaignGeneratePayload = {
  campaign_name: string;
  campaign_goal: string;
  post_topic: string;
  media_category: string;
  tone: string;
  post_type: string;
  start_utc: string;
  end_utc: string;
  posts_per_week: number;
  include_resident_story: boolean;
  post_to_facebook: boolean;
  post_to_instagram: boolean;
};

export type SinglePostGeneratePayload = {
  post_topic: string;
  goal: string;
  tone: string;
  post_type: string;
  media_category: string;
  include_resident_story: boolean;
  scheduled_for_utc: string;
  post_to_facebook: boolean;
  post_to_instagram: boolean;
};

export type ScheduledSocialPostUpdatePayload = {
  caption?: string;
  media_url?: string | null;
  scheduled_for_utc?: string;
};

export type ScheduledSocialPostBulkActionPayload = {
  scheduled_post_ids: number[];
};

export type DraftRegeneratePayload = {
  scheduled_post_ids: number[];
  post_topic: string;
  goal: string;
  tone: string;
  post_type: string;
  media_category: string;
  include_resident_story: boolean;
};

export type SocialPlatformConnection = {
  connection_id: number;
  platform: string;
  account_label: string;
  page_id: string;
  instagram_business_account_id: string | null;
  access_token_encrypted: string | null;
  is_active: boolean;
  is_placeholder: boolean;
  created_at_utc: string;
  updated_at_utc: string;
};

export type SocialPlatformConnectionUpsertPayload = {
  platform: string;
  account_label: string;
  page_id: string;
  instagram_business_account_id: string | null;
  is_placeholder: boolean;
};

export type HomeVisitationListItem = {
  visitation_id: number;
  resident_id: number;
  resident_case_control_no: string;
  resident_internal_code: string;
  visit_date: string;
  visit_type: string;
  location_visited: string;
  family_cooperation_level: string;
  safety_concerns_noted: boolean;
  follow_up_needed: boolean;
  observations: string;
  visit_outcome: string;
  social_worker: string;
};

/** POST /api/home-visitations — controlled vocabulary; server fills other DB columns. */
export type HomeVisitationLogPayload = {
  resident_id: number;
  visit_type: string;
  home_environment_observation: string;
  home_environment_other?: string | null;
  observations_additional?: string | null;
  family_cooperation_level: string;
  safety_concerns_noted: boolean;
  follow_up_needed: boolean;
};

export type UpcomingCaseConferenceListItem = {
  plan_id: number;
  case_conference_date: string;
  resident_id: number;
  resident_case_code: string;
  plan_status: string | null;
};

/** GET /api/admin/reports/analytics */
export type AdminReportsAnalytics = {
  beneficiaries: {
    residents_total: number;
    residents_active: number;
  };
  outcomes: {
    avg_health_score: number;
    avg_education_progress_percent: number;
  };
  reintegration: {
    completed_count: number;
    with_status_count: number;
    completion_rate: number;
  };
  donation_trend_monthly: Array<{
    month_start: string;
    amount_sum: number;
    estimated_value_sum: number;
  }>;
  network_monthly_trends: Array<{
    month_start: string | null;
    avg_health_score: number;
    avg_education_progress: number;
    sessions_count: number;
  }>;
  safehouse_performance: Array<{
    safehouse_id: number;
    safehouse_name: string;
    metric_month: string;
    active_residents: number;
    avg_health_score: number;
    avg_education_progress: number;
    process_recording_count: number;
  }>;
  total_process_recordings: number;
};
