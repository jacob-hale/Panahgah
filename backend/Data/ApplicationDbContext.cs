using Microsoft.EntityFrameworkCore;
using Panahgah.Api.Models;

namespace Panahgah.Api.Data;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : DbContext(options)
{
    public DbSet<Safehouse> safehouses => Set<Safehouse>();
    public DbSet<Partner> partners => Set<Partner>();
    public DbSet<PartnerAssignment> partner_assignments => Set<PartnerAssignment>();
    public DbSet<Supporter> supporters => Set<Supporter>();
    public DbSet<Donation> donations => Set<Donation>();
    public DbSet<InKindDonationItem> in_kind_donation_items => Set<InKindDonationItem>();
    public DbSet<DonationAllocation> donation_allocations => Set<DonationAllocation>();
    public DbSet<Resident> residents => Set<Resident>();
    public DbSet<ProcessRecording> process_recordings => Set<ProcessRecording>();
    public DbSet<HomeVisitation> home_visitations => Set<HomeVisitation>();
    public DbSet<EducationRecord> education_records => Set<EducationRecord>();
    public DbSet<HealthWellbeingRecord> health_wellbeing_records => Set<HealthWellbeingRecord>();
    public DbSet<InterventionPlan> intervention_plans => Set<InterventionPlan>();
    public DbSet<IncidentReport> incident_reports => Set<IncidentReport>();
    public DbSet<SocialMediaPost> social_media_posts => Set<SocialMediaPost>();
    public DbSet<SafehouseMonthlyMetric> safehouse_monthly_metrics => Set<SafehouseMonthlyMetric>();
    public DbSet<PublicImpactSnapshot> public_impact_snapshots => Set<PublicImpactSnapshot>();
    public DbSet<MlInsight> ml_insights => Set<MlInsight>();
    public DbSet<SocialCampaign> social_campaigns => Set<SocialCampaign>();
    public DbSet<ScheduledSocialPost> scheduled_social_posts => Set<ScheduledSocialPost>();
    public DbSet<SocialPlatformConnection> social_platform_connections => Set<SocialPlatformConnection>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Safehouse>().HasKey(e => e.safehouse_id);
        modelBuilder.Entity<Safehouse>().ToTable("safehouses");

        modelBuilder.Entity<Partner>().HasKey(e => e.partner_id);
        modelBuilder.Entity<Partner>().ToTable("partners");

        modelBuilder.Entity<PartnerAssignment>().HasKey(e => e.assignment_id);
        modelBuilder.Entity<PartnerAssignment>().ToTable("partner_assignments");
        modelBuilder.Entity<PartnerAssignment>()
            .HasOne(e => e.partner)
            .WithMany(e => e.partner_assignments)
            .HasForeignKey(e => e.partner_id);
        modelBuilder.Entity<PartnerAssignment>()
            .HasOne(e => e.safehouse)
            .WithMany(e => e.partner_assignments)
            .HasForeignKey(e => e.safehouse_id);

        modelBuilder.Entity<Supporter>().HasKey(e => e.supporter_id);
        modelBuilder.Entity<Supporter>().ToTable("supporters");

        modelBuilder.Entity<Donation>().HasKey(e => e.donation_id);
        modelBuilder.Entity<Donation>().ToTable("donations");
        modelBuilder.Entity<Donation>()
            .HasOne(e => e.supporter)
            .WithMany(e => e.donations)
            .HasForeignKey(e => e.supporter_id);
        modelBuilder.Entity<Donation>()
            .HasOne(e => e.created_by_partner)
            .WithMany(e => e.donations_created)
            .HasForeignKey(e => e.created_by_partner_id);
        modelBuilder.Entity<Donation>()
            .HasOne(e => e.referral_post)
            .WithMany(e => e.referred_donations)
            .HasForeignKey(e => e.referral_post_id);

        modelBuilder.Entity<InKindDonationItem>().HasKey(e => e.item_id);
        modelBuilder.Entity<InKindDonationItem>().ToTable("in_kind_donation_items");
        modelBuilder.Entity<InKindDonationItem>()
            .HasOne(e => e.donation)
            .WithMany(e => e.in_kind_donation_items)
            .HasForeignKey(e => e.donation_id);

        modelBuilder.Entity<DonationAllocation>().HasKey(e => e.allocation_id);
        modelBuilder.Entity<DonationAllocation>().ToTable("donation_allocations");
        modelBuilder.Entity<DonationAllocation>()
            .HasOne(e => e.donation)
            .WithMany(e => e.donation_allocations)
            .HasForeignKey(e => e.donation_id);
        modelBuilder.Entity<DonationAllocation>()
            .HasOne(e => e.safehouse)
            .WithMany(e => e.donation_allocations)
            .HasForeignKey(e => e.safehouse_id);

        modelBuilder.Entity<Resident>().HasKey(e => e.resident_id);
        modelBuilder.Entity<Resident>().ToTable("residents");
        modelBuilder.Entity<Resident>()
            .HasOne(e => e.safehouse)
            .WithMany(e => e.residents)
            .HasForeignKey(e => e.safehouse_id);

        modelBuilder.Entity<ProcessRecording>().HasKey(e => e.recording_id);
        modelBuilder.Entity<ProcessRecording>().ToTable("process_recordings");
        modelBuilder.Entity<ProcessRecording>()
            .HasOne(e => e.resident)
            .WithMany(e => e.process_recordings)
            .HasForeignKey(e => e.resident_id);

        modelBuilder.Entity<HomeVisitation>().HasKey(e => e.visitation_id);
        modelBuilder.Entity<HomeVisitation>().ToTable("home_visitations");
        modelBuilder.Entity<HomeVisitation>()
            .HasOne(e => e.resident)
            .WithMany(e => e.home_visitations)
            .HasForeignKey(e => e.resident_id);

        modelBuilder.Entity<EducationRecord>().HasKey(e => e.education_record_id);
        modelBuilder.Entity<EducationRecord>().ToTable("education_records");
        modelBuilder.Entity<EducationRecord>()
            .HasOne(e => e.resident)
            .WithMany(e => e.education_records)
            .HasForeignKey(e => e.resident_id);

        modelBuilder.Entity<HealthWellbeingRecord>().HasKey(e => e.health_record_id);
        modelBuilder.Entity<HealthWellbeingRecord>().ToTable("health_wellbeing_records");
        modelBuilder.Entity<HealthWellbeingRecord>()
            .HasOne(e => e.resident)
            .WithMany(e => e.health_wellbeing_records)
            .HasForeignKey(e => e.resident_id);

        modelBuilder.Entity<InterventionPlan>().HasKey(e => e.plan_id);
        modelBuilder.Entity<InterventionPlan>().ToTable("intervention_plans");
        modelBuilder.Entity<InterventionPlan>()
            .HasOne(e => e.resident)
            .WithMany(e => e.intervention_plans)
            .HasForeignKey(e => e.resident_id);

        modelBuilder.Entity<IncidentReport>().HasKey(e => e.incident_id);
        modelBuilder.Entity<IncidentReport>().ToTable("incident_reports");
        modelBuilder.Entity<IncidentReport>()
            .HasOne(e => e.resident)
            .WithMany(e => e.incident_reports)
            .HasForeignKey(e => e.resident_id);
        modelBuilder.Entity<IncidentReport>()
            .HasOne(e => e.safehouse)
            .WithMany(e => e.incident_reports)
            .HasForeignKey(e => e.safehouse_id);

        modelBuilder.Entity<SocialMediaPost>().HasKey(e => e.post_id);
        modelBuilder.Entity<SocialMediaPost>().ToTable("social_media_posts");

        modelBuilder.Entity<SafehouseMonthlyMetric>().HasKey(e => e.metric_id);
        modelBuilder.Entity<SafehouseMonthlyMetric>().ToTable("safehouse_monthly_metrics");
        modelBuilder.Entity<SafehouseMonthlyMetric>()
            .HasOne(e => e.safehouse)
            .WithMany(e => e.safehouse_monthly_metrics)
            .HasForeignKey(e => e.safehouse_id);

        modelBuilder.Entity<PublicImpactSnapshot>().HasKey(e => e.snapshot_id);
        modelBuilder.Entity<PublicImpactSnapshot>().ToTable("public_impact_snapshots");

        modelBuilder.Entity<MlInsight>().HasKey(e => e.insight_id);
        modelBuilder.Entity<MlInsight>().ToTable("ml_insights");

        modelBuilder.Entity<SocialCampaign>().HasKey(e => e.campaign_id);
        modelBuilder.Entity<SocialCampaign>().ToTable("social_campaigns");

        modelBuilder.Entity<ScheduledSocialPost>().HasKey(e => e.scheduled_post_id);
        modelBuilder.Entity<ScheduledSocialPost>().ToTable("scheduled_social_posts");
        modelBuilder.Entity<ScheduledSocialPost>()
            .HasOne(e => e.campaign)
            .WithMany(e => e.scheduled_posts)
            .HasForeignKey(e => e.campaign_id);

        modelBuilder.Entity<SocialPlatformConnection>().HasKey(e => e.connection_id);
        modelBuilder.Entity<SocialPlatformConnection>().ToTable("social_platform_connections");
        modelBuilder.Entity<SocialPlatformConnection>()
            .Property(e => e.token_source)
            .HasDefaultValue(string.Empty);
    }
}
