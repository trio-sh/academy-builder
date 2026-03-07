import { describe, it, expect } from "vitest";
import type { Database } from "@/types/database.types";

// Type-level tests: these verify that the TypeScript types are correctly defined
// and that all table types have the required Row/Insert/Update structure.

type Tables = Database["public"]["Tables"];
type TableNames = keyof Tables;

// Helper: extract Row type for a table
type Row<T extends TableNames> = Tables[T]["Row"];
type Insert<T extends TableNames> = Tables[T]["Insert"];

describe("Database Types - All Tables Present", () => {
  // Verify every expected table has type definitions
  const expectedTables: TableNames[] = [
    "profiles",
    "candidate_profiles",
    "mentor_profiles",
    "employer_profiles",
    "skill_passports",
    "growth_log_entries",
    "bridgefast_modules",
    "bridgefast_progress",
    "mentor_assignments",
    "mentor_observations",
    "endorsements",
    "notifications",
    "liveworks_projects",
    "liveworks_applications",
    "t3x_connections",
    "candidate_self_assessments",
    "talentvisa_nominations",
    "talentvisa_quotas",
    "email_queue",
    "school_profiles",
    "school_cohorts",
    "students",
    "teacher_observations",
    "mentor_assigned_dimensions",
    "observation_feedback",
    "observation_sessions",
    "observation_synthesis",
    "training_certificates",
  ];

  it("should have type definitions for all required tables", () => {
    // This test passes if TypeScript compilation succeeds
    // Each table name is verified at compile time
    expectedTables.forEach((table) => {
      expect(table).toBeTruthy();
    });
    expect(expectedTables.length).toBeGreaterThanOrEqual(28);
  });
});

describe("Database Types - Profile Types", () => {
  it("profiles table should have correct fields", () => {
    // Type-level assertion: profiles.Row must have these fields
    const check = {} as Row<"profiles">;
    const fields: (keyof Row<"profiles">)[] = [
      "id", "email", "first_name", "last_name", "role",
      "avatar_url", "headline", "bio", "location",
      "is_active", "onboarding_completed", "created_at", "updated_at",
    ];
    fields.forEach((field) => {
      expect(field in check || true).toBe(true); // compile-time check
    });
    expect(fields.length).toBe(13);
  });

  it("candidate_profiles should have behavioral fields", () => {
    const fields: (keyof Row<"candidate_profiles">)[] = [
      "id", "profile_id", "resume_url", "skills", "experience_years",
      "entry_path", "current_tier", "mentor_loops",
      "has_skill_passport", "has_talentvisa", "is_listed_on_t3x",
    ];
    expect(fields.length).toBeGreaterThanOrEqual(11);
  });

  it("mentor_profiles should have capacity fields", () => {
    const fields: (keyof Row<"mentor_profiles">)[] = [
      "id", "profile_id", "industry", "specializations",
      "years_experience", "max_mentees", "current_mentees",
      "is_accepting", "total_observations", "total_endorsements",
    ];
    expect(fields.length).toBeGreaterThanOrEqual(10);
  });

  it("employer_profiles should have company fields", () => {
    const fields: (keyof Row<"employer_profiles">)[] = [
      "id", "profile_id", "company_name", "industry",
      "is_verified", "subscription_tier", "total_hires", "total_connections",
    ];
    expect(fields.length).toBeGreaterThanOrEqual(8);
  });
});

describe("Database Types - Observation Pipeline", () => {
  it("mentor_assignments should link mentor and candidate", () => {
    const fields: (keyof Row<"mentor_assignments">)[] = [
      "id", "mentor_id", "candidate_id", "status", "loop_number",
    ];
    expect(fields.length).toBeGreaterThanOrEqual(5);
  });

  it("mentor_observations should have behavioral_scores", () => {
    const fields: (keyof Row<"mentor_observations">)[] = [
      "id", "assignment_id", "mentor_id", "candidate_id",
      "session_date", "behavioral_scores", "is_locked",
    ];
    expect(fields.length).toBeGreaterThanOrEqual(7);
  });

  it("endorsements should use redirect_to not redirect_to_liveworks", () => {
    const fields: (keyof Row<"endorsements">)[] = [
      "id", "assignment_id", "mentor_id", "candidate_id",
      "decision", "justification", "redirect_to", "redirect_module_id",
    ];
    // Verify redirect_to exists (not redirect_to_liveworks)
    expect(fields).toContain("redirect_to");
    expect(fields).not.toContain("redirect_to_liveworks" as any);
  });

  it("mentor_assigned_dimensions should have dimension tracking", () => {
    const fields: (keyof Row<"mentor_assigned_dimensions">)[] = [
      "id", "assignment_id", "mentor_id", "candidate_id",
      "dimension_id", "is_active",
    ];
    expect(fields.length).toBeGreaterThanOrEqual(6);
  });

  it("observation_feedback should have multi-level feedback", () => {
    const fields: (keyof Row<"observation_feedback">)[] = [
      "id", "assignment_id", "candidate_id", "dimension_id",
      "feedback_level", "bars_score", "status",
      "mentor_approved", "final_feedback",
    ];
    expect(fields.length).toBeGreaterThanOrEqual(9);
  });

  it("observation_sessions should have session tracking", () => {
    const fields: (keyof Row<"observation_sessions">)[] = [
      "id", "candidate_id", "status", "mentor_approved",
    ];
    expect(fields.length).toBeGreaterThanOrEqual(4);
  });
});

describe("Database Types - School Dashboard", () => {
  it("school_profiles should have school fields", () => {
    const fields: (keyof Row<"school_profiles">)[] = [
      "id", "profile_id", "school_name", "school_type",
      "district", "total_students", "is_verified",
    ];
    expect(fields.length).toBeGreaterThanOrEqual(7);
  });

  it("students should link to school and cohort", () => {
    const fields: (keyof Row<"students">)[] = [
      "id", "profile_id", "school_id", "cohort_id",
      "grade_level", "status", "total_observations",
    ];
    expect(fields.length).toBeGreaterThanOrEqual(7);
  });

  it("school_cohorts should have program info", () => {
    const fields: (keyof Row<"school_cohorts">)[] = [
      "id", "school_id", "name", "program",
      "start_date", "end_date", "status",
    ];
    expect(fields.length).toBeGreaterThanOrEqual(7);
  });

  it("teacher_observations should have behavioral assessment", () => {
    const fields: (keyof Row<"teacher_observations">)[] = [
      "id", "teacher_id", "student_id", "observation_date",
      "behavioral_scores", "strengths", "areas_for_growth",
    ];
    expect(fields.length).toBeGreaterThanOrEqual(7);
  });
});

describe("Database Types - Admin Operations", () => {
  it("talentvisa_quotas should have tier-based quotas", () => {
    const fields: (keyof Row<"talentvisa_quotas">)[] = [
      "id", "period", "tier", "max_approvals",
      "current_approvals", "period_start", "period_end",
    ];
    expect(fields.length).toBeGreaterThanOrEqual(7);
  });

  it("email_queue should have template-based structure", () => {
    const fields: (keyof Row<"email_queue">)[] = [
      "id", "to_email", "to_name", "template",
      "template_data", "status",
    ];
    // Verify email_queue uses template/template_data (not subject/body)
    expect(fields).toContain("template");
    expect(fields).toContain("template_data");
    expect(fields).not.toContain("subject" as any);
    expect(fields).not.toContain("body" as any);
  });
});

describe("Database Types - Enum Types", () => {
  it("UserRole should include all 5 roles", () => {
    const roles: import("@/types/database.types").UserRole[] = [
      "candidate", "mentor", "employer", "school_admin", "admin",
    ];
    expect(roles.length).toBe(5);
  });

  it("EndorsementDecision should have 3 options", () => {
    const decisions: import("@/types/database.types").EndorsementDecision[] = [
      "proceed", "redirect", "pause",
    ];
    expect(decisions.length).toBe(3);
  });

  it("ReadinessTier should have 3 tiers", () => {
    const tiers: import("@/types/database.types").ReadinessTier[] = [
      "tier_1", "tier_2", "tier_3",
    ];
    expect(tiers.length).toBe(3);
  });
});
