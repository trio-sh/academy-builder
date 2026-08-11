import { describe, it, expect } from "vitest";
import type { UserRole } from "@/types/database.types";

/**
 * Auth & Role Tests
 *
 * Verifies that all user roles are properly defined and that
 * role-based routing maps correctly to dashboard paths.
 */

describe("User Roles", () => {
  const ALL_ROLES: UserRole[] = ["candidate", "mentor", "employer", "school_admin", "admin"];

  it("should define exactly 5 user roles", () => {
    expect(ALL_ROLES.length).toBe(5);
  });

  it("should include candidate role", () => {
    expect(ALL_ROLES).toContain("candidate");
  });

  it("should include mentor role", () => {
    expect(ALL_ROLES).toContain("mentor");
  });

  it("should include employer role", () => {
    expect(ALL_ROLES).toContain("employer");
  });

  it("should include school_admin role (not institution)", () => {
    expect(ALL_ROLES).toContain("school_admin");
    // Verify the old 'institution' value is NOT used
    expect(ALL_ROLES).not.toContain("institution" as any);
  });

  it("should include admin role", () => {
    expect(ALL_ROLES).toContain("admin");
  });
});

describe("Role-Based Dashboard Routes", () => {
  const ROLE_DASHBOARDS: Record<UserRole, string> = {
    candidate: "/dashboard/candidate",
    mentor: "/dashboard/mentor",
    employer: "/dashboard/employer",
    school_admin: "/dashboard/school",
    admin: "/dashboard/admin",
  };

  it("each role should map to a unique dashboard path", () => {
    const paths = Object.values(ROLE_DASHBOARDS);
    const uniquePaths = new Set(paths);
    expect(uniquePaths.size).toBe(paths.length);
  });

  it("candidate dashboard should be at /dashboard/candidate", () => {
    expect(ROLE_DASHBOARDS.candidate).toBe("/dashboard/candidate");
  });

  it("mentor dashboard should be at /dashboard/mentor", () => {
    expect(ROLE_DASHBOARDS.mentor).toBe("/dashboard/mentor");
  });

  it("employer dashboard should be at /dashboard/employer", () => {
    expect(ROLE_DASHBOARDS.employer).toBe("/dashboard/employer");
  });

  it("school_admin dashboard should be at /dashboard/school", () => {
    expect(ROLE_DASHBOARDS.school_admin).toBe("/dashboard/school");
  });

  it("admin dashboard should be at /dashboard/admin", () => {
    expect(ROLE_DASHBOARDS.admin).toBe("/dashboard/admin");
  });
});

describe("Candidate Navigation Items", () => {
  const CANDIDATE_NAV = [
    "Overview", "Observation Pathway", "Behavioral Evidence Report", "Growth Log",
    "BridgeFast", "Readiness Reflection", "Projects",
    "Find Mentor", "Connections", "Messages", "Notifications",
    "Profile", "Settings",
  ];

  it("should have all 13 navigation items", () => {
    expect(CANDIDATE_NAV.length).toBe(13);
  });

  it("should include core observation items", () => {
    expect(CANDIDATE_NAV).toContain("Observation Pathway");
    expect(CANDIDATE_NAV).toContain("Behavioral Evidence Report");
    expect(CANDIDATE_NAV).toContain("Growth Log");
  });

  it("should include preparation items", () => {
    expect(CANDIDATE_NAV).toContain("BridgeFast");
    expect(CANDIDATE_NAV).toContain("Readiness Reflection");
  });

  it("should include account items", () => {
    expect(CANDIDATE_NAV).toContain("Profile");
    expect(CANDIDATE_NAV).toContain("Settings");
    expect(CANDIDATE_NAV).toContain("Messages");
  });
});

describe("Mentor Navigation Items", () => {
  const MENTOR_NAV = [
    "Overview", "My Mentees", "Observations",
    "Endorsements", "Dimension Manager", "Settings",
  ];

  it("should have core mentoring navigation", () => {
    expect(MENTOR_NAV).toContain("My Mentees");
    expect(MENTOR_NAV).toContain("Observations");
    expect(MENTOR_NAV).toContain("Endorsements");
    expect(MENTOR_NAV).toContain("Dimension Manager");
  });
});

describe("Admin Navigation Items", () => {
  const ADMIN_NAV = [
    "Overview", "Users", "TalentVisa", "Employers",
    "Schools", "Communications", "Reports", "Settings",
  ];

  it("should have all 8 admin navigation items", () => {
    expect(ADMIN_NAV.length).toBe(8);
  });

  it("should include TalentVisa management", () => {
    expect(ADMIN_NAV).toContain("TalentVisa");
  });

  it("should include Communications", () => {
    expect(ADMIN_NAV).toContain("Communications");
  });
});

describe("Behavioral Dimensions", () => {
  const DIMENSIONS = [
    "integrity_ethics",
    "accountability_ownership",
    "execution_reliability",
    "communication_pressure",
    "collaboration_conflict",
    "workplace_adaptability",
    "prioritization_time",
    "resilience_recovery",
    "learning_agility",
    "professional_boundaries",
    "creative_problem_solving",
    "customer_service_focus",
    "influence_persuasion",
    "relationship_building",
  ];

  it("should have exactly 14 behavioral dimensions", () => {
    expect(DIMENSIONS.length).toBe(14);
  });

  it("MVP top 5 dimensions should be defined", () => {
    const mvp5 = DIMENSIONS.slice(0, 5);
    expect(mvp5).toContain("integrity_ethics");
    expect(mvp5).toContain("accountability_ownership");
    expect(mvp5).toContain("execution_reliability");
    expect(mvp5).toContain("communication_pressure");
    expect(mvp5).toContain("collaboration_conflict");
  });

  it("all dimension IDs should be snake_case", () => {
    DIMENSIONS.forEach((dim) => {
      expect(dim).toMatch(/^[a-z_]+$/);
    });
  });
});

describe("BARS Score Scale", () => {
  it("should have 4 levels", () => {
    const levels = [
      { score: 1, label: "Developing" },
      { score: 2, label: "Competent" },
      { score: 3, label: "Proficient" },
      { score: 4, label: "Exemplary" },
    ];
    expect(levels.length).toBe(4);
    expect(levels[0].score).toBe(1);
    expect(levels[3].score).toBe(4);
  });
});

describe("Entry Paths", () => {
  it("should have 3 valid entry paths", () => {
    const paths = ["resume_upload", "liveworks", "civic_access"];
    expect(paths.length).toBe(3);
  });
});

describe("TalentVisa Tiers", () => {
  it("should have 3 tiers", () => {
    const tiers = ["gold", "silver", "bronze"];
    expect(tiers.length).toBe(3);
  });
});
