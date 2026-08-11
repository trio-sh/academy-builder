/**
 * T3A LOCKED FRAMEWORK — February 2026
 * The 14 Behavioral Dimensions, observation terminology, and build rules.
 * This file is the single source of truth for all platform constants.
 * DO NOT modify dimension IDs without a full migration — they are stored in JSONB columns.
 */

// ─────────────────────────────────────────────────────────────────
// T3A 14 BEHAVIORAL DIMENSIONS
// Green = MVP Priority (Top 5) | Remaining 9 post-launch
// ─────────────────────────────────────────────────────────────────

export interface T3ADimension {
  id: string;
  label: string;
  description: string;
  isMVP: boolean;
  color: string;
  researchBasis: string;
}

export const T3A_DIMENSIONS: T3ADimension[] = [
  // ★ MVP TOP 5 — highest predictive validity for entry-level workforce readiness
  {
    id: "integrity_ethics",
    label: "Integrity & Ethics",
    description: "Acting with honesty, maintaining trust, navigating ethical grey areas",
    isMVP: true,
    color: "from-emerald-500 to-teal-500",
    researchBasis: "Ones, Viswesvaran & Schmidt (1993): .41 validity for job performance",
  },
  {
    id: "accountability_ownership",
    label: "Accountability & Ownership",
    description: "Taking responsibility for outcomes, following through on commitments without excuses",
    isMVP: true,
    color: "from-blue-500 to-indigo-500",
    researchBasis: "Barrick & Mount (1991): Consistent relations with all job performance criteria",
  },
  {
    id: "execution_reliability",
    label: "Execution Reliability",
    description: "Delivering consistent, quality work on time without constant supervision",
    isMVP: true,
    color: "from-violet-500 to-purple-500",
    researchBasis: "Schmidt & Hunter (1998): Work sample tests + conscientiousness = .65 validity",
  },
  {
    id: "communication_pressure",
    label: "Communication Under Pressure",
    description: "Delivering clear, timely messages with appropriate tone when stakes are high",
    isMVP: true,
    color: "from-sky-500 to-blue-500",
    researchBasis: "Barrick & Mount (1991); LinkedIn Workplace Learning Report (2024)",
  },
  {
    id: "collaboration_conflict",
    label: "Collaboration & Conflict Resolution",
    description: "Working effectively with diverse teams, navigating disagreements productively",
    isMVP: true,
    color: "from-pink-500 to-rose-500",
    researchBasis: "Google Project Aristotle; O'Boyle et al. (2011)",
  },

  // ── Post-launch dimensions (6–14) ──────────────────────────────
  {
    id: "workplace_adaptability",
    label: "Workplace Adaptability",
    description: "Navigating organizational culture, reading situations, and adjusting behavior appropriately",
    isMVP: false,
    color: "from-amber-500 to-orange-500",
    researchBasis: "Simons & Buitendach (2013); WEF (2025)",
  },
  {
    id: "prioritization_time",
    label: "Prioritization & Time Management",
    description: "Managing competing demands, making sound decisions under deadline pressure",
    isMVP: false,
    color: "from-lime-500 to-green-500",
    researchBasis: "Zell & Lesick (2022); Sackett et al. (2022)",
  },
  {
    id: "resilience_recovery",
    label: "Resilience & Recovery",
    description: "Bouncing back from setbacks, maintaining composure through failure and rejection",
    isMVP: false,
    color: "from-red-500 to-rose-500",
    researchBasis: "Duckworth et al. (2007); Simons & Buitendach (2013)",
  },
  {
    id: "learning_agility",
    label: "Learning Agility",
    description: "Receiving and applying feedback without defensiveness; proactively acquiring new knowledge",
    isMVP: false,
    color: "from-cyan-500 to-sky-500",
    researchBasis: "Korn Ferry Institute; Dries et al. (2012)",
  },
  {
    id: "professional_boundaries",
    label: "Professional Boundaries",
    description: "Maintaining appropriate workplace relationships, navigating humor and social dynamics",
    isMVP: false,
    color: "from-slate-500 to-gray-500",
    researchBasis: "O'Boyle et al. (2011); Joseph & Newman (2010)",
  },
  {
    id: "creative_problem_solving",
    label: "Creative Problem-Solving",
    description: "Finding resourceful solutions when standard approaches don't work",
    isMVP: false,
    color: "from-yellow-500 to-amber-500",
    researchBasis: "Fuller & Marler (2009): .38 validity, 107 studies",
  },
  {
    id: "customer_service_focus",
    label: "Customer & Service Focus",
    description: "Prioritizing stakeholder needs, delivering service with genuine care",
    isMVP: false,
    color: "from-teal-500 to-cyan-500",
    researchBasis: "O'Boyle et al. (2011)",
  },
  {
    id: "influence_persuasion",
    label: "Influence & Persuasion",
    description: "Gaining cooperation and buy-in without formal authority",
    isMVP: false,
    color: "from-fuchsia-500 to-pink-500",
    researchBasis: "Fuller & Marler (2009)",
  },
  {
    id: "relationship_building",
    label: "Relationship Building",
    description: "Developing and maintaining professional networks that create mutual value",
    isMVP: false,
    color: "from-indigo-500 to-violet-500",
    researchBasis: "O'Boyle et al. (2011); Google Project Aristotle",
  },
];

/** MVP dimensions only — for use in all L1/L2 observation scoring during initial launch */
export const MVP_DIMENSIONS = T3A_DIMENSIONS.filter((d) => d.isMVP);

/** Default empty score object seeded with all MVP dimension IDs */
export const DEFAULT_MVP_SCORES: Record<string, number> = Object.fromEntries(
  MVP_DIMENSIONS.map((d) => [d.id, 3])
);

// ─────────────────────────────────────────────────────────────────
// BUILD RULE 9 — RE-ASSESSMENT COOLDOWN
// Admin-configurable. Default: 14 days.
// Change via admin settings — never in code directly.
// ─────────────────────────────────────────────────────────────────

/** Key used in the admin_settings table to store the cooldown value */
export const COOLDOWN_SETTING_KEY = "reassessment_cooldown_days";

/** Default cooldown in days — used if the admin_settings row does not exist */
export const DEFAULT_COOLDOWN_DAYS = 14;

// ─────────────────────────────────────────────────────────────────
// OBSERVATION LEVEL LABELS (Section 3.1)
// ─────────────────────────────────────────────────────────────────

export const OBSERVATION_LEVELS = [
  { level: 1, label: "Level 1 — AI Observation", method: "AI-Driven Pressure Scenarios", format: "Solo, Async, Timed", observer: "AI Engine", isMVP: true },
  { level: 2, label: "Level 2 — Mentor Live Observation", method: "Mentor Live Observation", format: "Solo, Sync, Video", observer: "Human Mentor", isMVP: true },
  { level: 3, label: "Level 3 — Work Sample Evaluation", method: "Work Sample Evaluation", format: "Solo, Async, Timed", observer: "AI + Mentor", isMVP: false },
  { level: 4, label: "Level 4 — Peer/Team Simulation", method: "Peer/Team Simulation", format: "Group, Sync, Video", observer: "Human Mentor", isMVP: false },
];

// ─────────────────────────────────────────────────────────────────
// APPROVED OBSERVATION LANGUAGE (Section 2 — Language Standards)
// Use these constants in UI copy. Never use the avoided terms.
// ─────────────────────────────────────────────────────────────────

export const OBS_COPY = {
  /** Post-scenario confirmation shown to candidate — Section 4.1 */
  SESSION_RECORDED: "Session recorded.",
  MENTOR_WILL_REVIEW: "Scenario complete — your mentor will review.",
  EVIDENCE_SUBMITTED: "Evidence submitted.",
  SESSION_CLOSED: "Session closed — next steps from mentor.",

  /** Progress indicator labels — Section 4.3 */
  LEVELS_OBSERVED: (completed: number, total: number) => `Levels observed: ${completed} of ${total}`,
  AWAITING_MENTOR: "Awaiting mentor review.",

  /** Mentor decision labels — Section 2 */
  PROCEED: "Proceed",
  REDIRECT: "Redirect",
  PAUSE: "Pause",

  /** Credential labels */
  SKILL_PASSPORT: "Behavioral Evidence Report",
  TALENT_VISA: "TalentVisa",

  /** Status */
  CANDIDATE: "Candidate",
  MENTOR: "Mentor",

  /** BridgeFast disclaimer — Section 1.3 Drift Test */
  BRIDGEFAST_DISCLAIMER:
    "This is a BridgeFast development exercise. It is separate from your observation sessions and will not be recorded in your Behavioral Evidence Report.",
};
