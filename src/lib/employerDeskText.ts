/**
 * Controlled text register for the Employer Desk.
 *
 * T3A-DEV-CN-EMP-001. Each entry is held under its issued identifier and
 * renders verbatim: no word is substituted, softened, abbreviated or
 * re-ordered, and no line is dropped on a narrow screen.
 *
 * Where a template is not loaded the block refuses to render and the
 * failure is logged. Nothing here falls back to previous wording.
 */

export type ControlledTextId =
  | "L-EMP-WELCOME-001"
  | "L-EMP-TILE01-001"
  | "L-EMP-TILE01-EMPTY"
  | "L-EMP-TILE02-001"
  | "L-EMP-POOL-001"
  | "L-EMP-POOL-002"
  | "L-EMP-POOL-EMPTY"
  | "L-EMP-POOL-NOMATCH"
  | "L-EMP-DISC-001"
  | "L-EMP-DISC-002"
  | "L-EMP-FDBK-001"
  | "L-EMP-FDBK-BOUNDARY"
  | "L-EMP-SECTION-HEADING";

/**
 * Every controlled text is an ordered list of lines. All lines render.
 * None is optional, a tooltip, or hidden behind a control that must be
 * opened.
 */
const REGISTER: Record<ControlledTextId, readonly string[]> = {
  "L-EMP-WELCOME-001": [
    "Welcome to the evidence people chose to place in your hands.",
    "Read the Behavioral Evidence Reports™ participants have made available to approved employers, verify that each record is current and unchanged, and examine what the observed conduct actually supports.",
    "Use it where it belongs — in onboarding, supervision and development — and keep every employment judgment inside your organization.",
  ],

  "L-EMP-SECTION-HEADING": ["Employer actions"],

  "L-EMP-TILE01-001": [
    "Read the Behavioral Evidence Reports™ participants have made available to approved employers.",
    "Participants control visibility and can withdraw it at any time.",
  ],

  "L-EMP-TILE01-EMPTY": [
    "No participant has made a Behavioral Evidence Report™ available to approved employers yet.",
  ],

  "L-EMP-TILE02-001": [
    "Offer a LiveWorks project",
    "Offer a participant supervised real work through your organization.",
    "Conduct during the project is observed and documented by The 3rd Academy, not by your organization.",
  ],

  "L-EMP-POOL-001": [
    "Available Reports",
    "Behavioral Evidence Reports™ currently available to approved employers.",
    "Participants control visibility and can withdraw it at any time.",
  ],

  "L-EMP-POOL-002": [
    "The 3rd Academy does not score, rank or recommend. Every employment decision is yours.",
  ],

  "L-EMP-POOL-EMPTY": [
    "No reports are currently available. Participants control whether their Behavioral Evidence Reports™ are visible to approved employers. Availability may change over time.",
  ],

  "L-EMP-POOL-NOMATCH": ["No available report matches those details."],

  "L-EMP-DISC-001": [
    "T3X Discovery",
    "What Behavioral Evidence Reports™ are currently available through The 3rd Academy, and what the evidence environment currently covers.",
  ],

  "L-EMP-DISC-002": [
    "Participants decide whether their Behavioral Evidence Report™ is available to approved employers. Availability can increase or decrease over time.",
    "The 3rd Academy does not score, rank or recommend participants.",
  ],

  "L-EMP-FDBK-001": [
    "Tell The 3rd Academy about your experience using the Employer Desk and Behavioral Evidence Reports™.",
    "Feedback submitted here does not alter a participant's Behavioral Evidence Report™ and is not used to score, rank or evaluate participants.",
  ],

  "L-EMP-FDBK-BOUNDARY": [
    "This form is about the product, not about a person.",
  ],
};

/**
 * The three controlled values of organization verification, and the
 * badge label each one renders. The badge has no data source of its own:
 * it renders the short form of the same value. One value, two
 * renderings — never two fields.
 */
export type VerificationState = "pending" | "verified" | "not_verified";

export const VERIFICATION_FIELD_LABEL = "Organization verification";

export const VERIFICATION_VALUE_TEXT: Record<VerificationState, string> = {
  pending: "Pending",
  verified: "Verified",
  not_verified: "Not verified",
};

export const VERIFICATION_MARK_TEXT: Record<VerificationState, string> = {
  pending: "PENDING VERIFICATION",
  verified: "ORGANIZATION VERIFIED",
  not_verified: "NOT VERIFIED",
};

export const APPROVER_NOT_RECORDED = "Approver not recorded";

/** The four controlled LiveWorks tile states. No other combination renders. */
export const LIVEWORKS_STATE_LINE: Record<string, string | null> = {
  not_activated: "LiveWorks is not open to employers yet.",
  not_verified: "LiveWorks is available to verified employers only.",
  available: null,
};

/** Item 12 step 5.5 — the category list. */
export const FEEDBACK_CATEGORIES: ReadonlyArray<{
  value: string;
  label: string;
  requiresLiveWorks?: boolean;
}> = [
  { value: "ber_clarity", label: "Behavioral Evidence Report™ clarity" },
  { value: "employer_desk_experience", label: "Employer Desk experience" },
  { value: "access_or_workflow", label: "Access or workflow" },
  { value: "liveworks_experience", label: "LiveWorks experience", requiresLiveWorks: true },
  { value: "general", label: "General feedback" },
];

/**
 * Resolve a controlled text. Returns null where the template is not
 * loaded, so the caller refuses to render the block rather than falling
 * back to previous wording or rendering an empty region.
 */
export function controlledText(id: ControlledTextId): readonly string[] | null {
  const lines = REGISTER[id];
  if (!lines || lines.length === 0) return null;
  if (lines.some((line) => typeof line !== "string" || line.trim() === "")) return null;
  return lines;
}

/**
 * Record a template that could not be resolved. The desk's server-side
 * log holds refusals; a missing template is a client-side rendering
 * failure, so it is reported to the console and to the desk log through
 * the caller where one is available.
 */
export function reportMissingControlledText(id: ControlledTextId): void {
  // eslint-disable-next-line no-console
  console.error(
    `[employer-desk] controlled text ${id} is not loaded; the block refuses to render`
  );
}
