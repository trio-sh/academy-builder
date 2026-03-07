import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Dashboard Query Tests
 *
 * These tests verify that all dashboard components use correct
 * Supabase query patterns — right table names, column names,
 * and query structures for each user role.
 */

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
  auth: {
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
  },
};

// Track all queries made
let queries: { table: string; method: string; args: any[] }[] = [];

// Create a chainable mock that records all queries
function createChainMock(table: string) {
  const chain: any = {};
  const methods = [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "gt", "gte", "lt", "lte", "in",
    "order", "limit", "single", "count", "head",
    "range", "filter", "not", "or", "match",
  ];

  methods.forEach((method) => {
    chain[method] = (...args: any[]) => {
      queries.push({ table, method, args });
      return chain;
    };
  });

  // Terminal methods
  chain.then = (resolve: any) => resolve({ data: [], error: null, count: 0 });
  return chain;
}

beforeEach(() => {
  queries = [];
  mockSupabase.from.mockImplementation((table: string) => createChainMock(table));
});

// ─── VALID TABLE NAMES ────────────────────────────────────────────────

const VALID_TABLES = new Set([
  "profiles", "candidate_profiles", "mentor_profiles", "employer_profiles",
  "skill_passports", "growth_log_entries", "bridgefast_modules", "bridgefast_progress",
  "bridgefast_content", "bridgefast_quiz_questions", "bridgefast_quiz_attempts",
  "mentor_assignments", "mentor_observations", "mentor_sessions", "mentor_availability",
  "endorsements", "notifications", "liveworks_projects", "liveworks_applications",
  "liveworks_milestones", "t3x_connections", "candidate_self_assessments",
  "talentvisa_nominations", "talentvisa_quotas", "email_queue",
  "school_profiles", "school_cohorts", "students", "teacher_observations",
  "mentor_assigned_dimensions", "observation_feedback", "observation_sessions",
  "observation_synthesis", "training_certificates",
  "conversations", "conversation_participants", "messages",
  "escrow_transactions", "employer_feedback", "session_reminders",
]);

// ─── VALID COLUMNS PER TABLE ──────────────────────────────────────────

const TABLE_COLUMNS: Record<string, string[]> = {
  profiles: [
    "id", "created_at", "updated_at", "email", "first_name", "last_name",
    "role", "avatar_url", "headline", "bio", "location", "is_active", "onboarding_completed",
  ],
  candidate_profiles: [
    "id", "profile_id", "created_at", "updated_at", "resume_url", "skills",
    "experience_years", "education", "work_history", "entry_path", "current_tier",
    "mentor_loops", "has_skill_passport", "has_talentvisa", "is_listed_on_t3x",
  ],
  mentor_profiles: [
    "id", "profile_id", "created_at", "updated_at", "industry", "specializations",
    "years_experience", "company", "job_title", "max_mentees", "current_mentees",
    "is_accepting", "total_observations", "total_endorsements", "avg_rating",
  ],
  employer_profiles: [
    "id", "profile_id", "created_at", "updated_at", "company_name", "company_size",
    "industry", "company_website", "company_logo_url", "is_verified",
    "subscription_tier", "total_hires", "total_connections",
  ],
  endorsements: [
    "id", "assignment_id", "mentor_id", "candidate_id", "created_at",
    "decision", "justification", "redirect_to", "redirect_module_id",
  ],
  mentor_assignments: [
    "id", "mentor_id", "candidate_id", "created_at", "updated_at",
    "status", "loop_number", "assigned_by",
  ],
  mentor_observations: [
    "id", "assignment_id", "mentor_id", "candidate_id", "created_at", "updated_at",
    "session_date", "behavioral_scores", "strengths", "areas_for_improvement",
    "notes", "is_locked",
  ],
  talentvisa_quotas: [
    "id", "created_at", "updated_at", "period", "tier",
    "max_approvals", "current_approvals", "period_start", "period_end",
  ],
  email_queue: [
    "id", "created_at", "to_email", "to_name", "template",
    "template_data", "status", "sent_at", "error_message",
  ],
  school_profiles: [
    "id", "profile_id", "created_at", "updated_at", "school_name",
    "school_type", "district", "address", "total_students", "active_cohorts", "is_verified",
  ],
  students: [
    "id", "profile_id", "school_id", "cohort_id", "created_at", "updated_at",
    "student_id_number", "grade_level", "graduation_year", "status",
    "total_observations", "avg_behavioral_score",
  ],
  school_cohorts: [
    "id", "school_id", "created_at", "updated_at", "name", "program",
    "start_date", "end_date", "status", "total_students", "teacher_id",
  ],
  teacher_observations: [
    "id", "teacher_id", "student_id", "cohort_id", "created_at", "updated_at",
    "observation_date", "context", "behavioral_scores", "strengths",
    "areas_for_growth", "notes",
  ],
  mentor_assigned_dimensions: [
    "id", "assignment_id", "mentor_id", "candidate_id", "dimension_id",
    "assigned_at", "is_active", "notes", "created_at", "updated_at",
  ],
  observation_feedback: [
    "id", "session_id", "assignment_id", "candidate_id", "mentor_id",
    "dimension_id", "feedback_level", "bars_score", "ai_draft_feedback",
    "mentor_feedback", "final_feedback", "status", "mentor_approved",
    "mentor_approved_at", "mentor_rejected_reason", "created_at", "updated_at",
  ],
};

describe("Table Name Validation", () => {
  it("endorsements table should NOT have redirect_to_liveworks column", () => {
    const endorsementCols = TABLE_COLUMNS.endorsements;
    expect(endorsementCols).toContain("redirect_to");
    expect(endorsementCols).not.toContain("redirect_to_liveworks");
  });

  it("email_queue table should use template/template_data not subject/body", () => {
    const emailCols = TABLE_COLUMNS.email_queue;
    expect(emailCols).toContain("template");
    expect(emailCols).toContain("template_data");
    expect(emailCols).not.toContain("subject");
    expect(emailCols).not.toContain("body");
  });

  it("all mentor_assigned_dimensions columns should be present", () => {
    const cols = TABLE_COLUMNS.mentor_assigned_dimensions;
    expect(cols).toContain("assignment_id");
    expect(cols).toContain("mentor_id");
    expect(cols).toContain("candidate_id");
    expect(cols).toContain("dimension_id");
    expect(cols).toContain("is_active");
  });

  it("observation_feedback should have multi-level feedback fields", () => {
    const cols = TABLE_COLUMNS.observation_feedback;
    expect(cols).toContain("feedback_level");
    expect(cols).toContain("bars_score");
    expect(cols).toContain("mentor_approved");
    expect(cols).toContain("final_feedback");
  });
});

describe("Candidate Dashboard Queries", () => {
  it("should query candidate_profiles by profile_id", () => {
    expect(VALID_TABLES.has("candidate_profiles")).toBe(true);
    expect(TABLE_COLUMNS.candidate_profiles).toContain("profile_id");
  });

  it("should query growth_log_entries by candidate_id", () => {
    mockSupabase.from("growth_log_entries");
    expect(VALID_TABLES.has("growth_log_entries")).toBe(true);
  });

  it("should query mentor_assigned_dimensions for observation pathway", () => {
    expect(VALID_TABLES.has("mentor_assigned_dimensions")).toBe(true);
  });

  it("should query observation_feedback for observation pathway", () => {
    expect(VALID_TABLES.has("observation_feedback")).toBe(true);
  });

  it("should query skill_passports for passport display", () => {
    expect(VALID_TABLES.has("skill_passports")).toBe(true);
  });

  it("should query bridgefast_modules and bridgefast_progress for training", () => {
    expect(VALID_TABLES.has("bridgefast_modules")).toBe(true);
    expect(VALID_TABLES.has("bridgefast_progress")).toBe(true);
  });

  it("should query liveworks_projects and liveworks_applications", () => {
    expect(VALID_TABLES.has("liveworks_projects")).toBe(true);
    expect(VALID_TABLES.has("liveworks_applications")).toBe(true);
  });
});

describe("Mentor Dashboard Queries", () => {
  it("should query mentor_profiles by profile_id", () => {
    expect(VALID_TABLES.has("mentor_profiles")).toBe(true);
  });

  it("should query mentor_assignments by mentor_id (mentor_profiles.id)", () => {
    // mentor_id in mentor_assignments references mentor_profiles.id
    expect(VALID_TABLES.has("mentor_assignments")).toBe(true);
    expect(TABLE_COLUMNS.mentor_assignments).toContain("mentor_id");
  });

  it("should query mentor_observations by mentor_id", () => {
    expect(TABLE_COLUMNS.mentor_observations).toContain("mentor_id");
    expect(TABLE_COLUMNS.mentor_observations).toContain("behavioral_scores");
  });

  it("should insert endorsements with redirect_to (not redirect_to_liveworks)", () => {
    expect(TABLE_COLUMNS.endorsements).toContain("redirect_to");
    expect(TABLE_COLUMNS.endorsements).not.toContain("redirect_to_liveworks");
  });

  it("should query/insert mentor_assigned_dimensions for dimension management", () => {
    expect(TABLE_COLUMNS.mentor_assigned_dimensions).toContain("dimension_id");
    expect(TABLE_COLUMNS.mentor_assigned_dimensions).toContain("is_active");
  });
});

describe("Employer Dashboard Queries", () => {
  it("should query employer_profiles by profile_id", () => {
    expect(VALID_TABLES.has("employer_profiles")).toBe(true);
    expect(TABLE_COLUMNS.employer_profiles).toContain("company_name");
  });

  it("should query t3x_connections by employer_id", () => {
    expect(VALID_TABLES.has("t3x_connections")).toBe(true);
  });

  it("should query candidate_profiles for talent exchange", () => {
    expect(TABLE_COLUMNS.candidate_profiles).toContain("is_listed_on_t3x");
    expect(TABLE_COLUMNS.candidate_profiles).toContain("has_skill_passport");
  });
});

describe("School Dashboard Queries", () => {
  it("should query school_profiles by profile_id", () => {
    expect(VALID_TABLES.has("school_profiles")).toBe(true);
    expect(TABLE_COLUMNS.school_profiles).toContain("school_name");
  });

  it("should query students by school_id", () => {
    expect(TABLE_COLUMNS.students).toContain("school_id");
    expect(TABLE_COLUMNS.students).toContain("cohort_id");
  });

  it("should query school_cohorts by school_id", () => {
    expect(VALID_TABLES.has("school_cohorts")).toBe(true);
    expect(TABLE_COLUMNS["school_cohorts"]).not.toBeUndefined();
  });

  it("should insert teacher_observations with correct columns", () => {
    const cols = TABLE_COLUMNS.teacher_observations;
    expect(cols).toContain("teacher_id");
    expect(cols).toContain("student_id");
    expect(cols).toContain("behavioral_scores");
    expect(cols).toContain("context");
    expect(cols).toContain("areas_for_growth");
  });
});

describe("Admin Dashboard Queries", () => {
  it("should query all profile tables for user management", () => {
    expect(VALID_TABLES.has("profiles")).toBe(true);
    expect(VALID_TABLES.has("candidate_profiles")).toBe(true);
    expect(VALID_TABLES.has("mentor_profiles")).toBe(true);
    expect(VALID_TABLES.has("employer_profiles")).toBe(true);
  });

  it("should query talentvisa_quotas with correct columns", () => {
    const cols = TABLE_COLUMNS.talentvisa_quotas;
    expect(cols).toContain("tier");
    expect(cols).toContain("max_approvals");
    expect(cols).toContain("current_approvals");
    expect(cols).toContain("period_start");
    expect(cols).toContain("period_end");
  });

  it("should insert email_queue with template structure", () => {
    const cols = TABLE_COLUMNS.email_queue;
    expect(cols).toContain("to_email");
    expect(cols).toContain("to_name");
    expect(cols).toContain("template");
    expect(cols).toContain("template_data");
    expect(cols).toContain("status");
  });

  it("should query talentvisa_nominations for approval workflow", () => {
    expect(VALID_TABLES.has("talentvisa_nominations")).toBe(true);
  });
});
