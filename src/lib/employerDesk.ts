/**
 * Employer Desk data access.
 *
 * T3A-DEV-CN-EMP-001. Every gate below is enforced server-side; these
 * helpers read the result rather than deciding it. A control hidden in
 * the interface is not the control.
 */
import { supabase } from "@/lib/supabase";
import type { VerificationState } from "@/lib/employerDeskText";

export interface OrganizationVerification {
  state: VerificationState;
  approvedAt: string | null;
  approver: string | null;
}

/**
 * Item 2. One value, read from the employer application record on every
 * request. There is no second field, derived flag, cached session claim
 * or seeded value that can render a verification state.
 *
 * Where the value is absent, unrecognized or cannot be read the caller
 * receives Not verified — never Verified, and never an empty cell. An
 * unreadable value is not a pending one.
 */
export async function readOrganizationVerification(
  employerProfileId: string | null
): Promise<OrganizationVerification> {
  if (!employerProfileId) {
    return { state: "not_verified", approvedAt: null, approver: null };
  }

  const { data, error } = await supabase.rpc("t3a_employer_verification", {
    p_employer_profile_id: employerProfileId,
  });

  if (error || !data || (Array.isArray(data) && data.length === 0)) {
    await logDeskEvent("verification_value_unreadable", {
      employer_profile_id: employerProfileId,
      reason: error?.message ?? "no row returned",
    });
    return { state: "not_verified", approvedAt: null, approver: null };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const state = row?.state as string | undefined;

  if (state !== "pending" && state !== "verified" && state !== "not_verified") {
    await logDeskEvent("verification_value_unrecognized", {
      employer_profile_id: employerProfileId,
      value: state ?? null,
    });
    return { state: "not_verified", approvedAt: null, approver: null };
  }

  // Item 2 step 5.4 — a pending organization reaching this desk is a
  // signal that the access gate upstream has not held. The label states
  // the truth; the log records that it should not have been reachable.
  if (state === "pending") {
    await logDeskEvent("pending_organization_reached_desk", {
      employer_profile_id: employerProfileId,
    });
  }

  return {
    state,
    approvedAt: (row?.approved_at as string | null) ?? null,
    approver: (row?.approver as string | null) ?? null,
  };
}

/** Best-effort client-side desk log. Never blocks a render. */
export async function logDeskEvent(
  eventCode: string,
  detail: Record<string, unknown> = {},
  route?: string
): Promise<void> {
  try {
    await supabase.rpc("t3a_employer_desk_log", {
      p_event_code: eventCode,
      p_route: route ?? null,
      p_subject_kind: null,
      p_subject_id: null,
      p_detail: detail,
    });
  } catch {
    // eslint-disable-next-line no-console
    console.error(`[employer-desk] could not write log line ${eventCode}`);
  }
}

export interface PoolCard {
  participantId: string;
  statedFullName: string;
  statedRoleOrField: string | null;
  berReportId: string | null;
  observationPeriodStart: string | null;
  observationPeriodEnd: string | null;
  reportStatus: string | null;
  currentThrough: string | null;
  correctionOpen: boolean;
  contactAvailable: boolean;
}

export interface PoolResult {
  refusalCode: string | null;
  cards: PoolCard[];
}

export type PoolSort = "recently_available" | "alphabetical";

/**
 * Item 8. The pool query accepts only the approved participant-stated
 * fields. Anything else refuses server-side and logs, and the refusal
 * comes back as a code rather than as an empty list, so a refusal is
 * never mistaken for an empty pool.
 */
export async function queryPool(
  filters: Record<string, string | boolean> = {},
  sort: PoolSort = "recently_available"
): Promise<PoolResult> {
  const { data, error } = await supabase.rpc("t3a_employer_pool_query", {
    p_filters: filters,
    p_sort: sort,
  });

  if (error) {
    return { refusalCode: "POOL_UNAVAILABLE", cards: [] };
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const refused = rows.find((r) => r.refusal_code);
  if (refused) {
    return { refusalCode: refused.refusal_code as string, cards: [] };
  }

  return {
    refusalCode: null,
    cards: rows.map((r) => ({
      participantId: r.participant_id as string,
      statedFullName: r.stated_full_name as string,
      statedRoleOrField: (r.stated_role_or_field as string | null) ?? null,
      berReportId: (r.ber_report_id as string | null) ?? null,
      observationPeriodStart: (r.observation_period_start as string | null) ?? null,
      observationPeriodEnd: (r.observation_period_end as string | null) ?? null,
      reportStatus: (r.report_status as string | null) ?? null,
      currentThrough: (r.current_through as string | null) ?? null,
      correctionOpen: Boolean(r.correction_open),
      contactAvailable: Boolean(r.contact_available),
    })),
  };
}

/**
 * Item 3 step 5.4. A figure that cannot be read renders as not available
 * and is logged — never as zero.
 */
export interface Figure {
  available: boolean;
  value: number | null;
}

export async function readPoolCount(): Promise<Figure> {
  const { data, error } = await supabase.rpc("t3a_employer_pool_count");
  if (error || !data) {
    await logDeskEvent("figure_unreadable", { figure: "reports_available" });
    return { available: false, value: null };
  }
  const result = data as { available?: boolean; value?: number };
  if (!result.available) return { available: false, value: null };
  return { available: true, value: Number(result.value ?? 0) };
}

export async function readOpenConversationCount(): Promise<Figure> {
  const { data, error } = await supabase.rpc("t3a_employer_open_conversation_count");
  if (error || data === null || data === undefined) {
    await logDeskEvent("figure_unreadable", { figure: "open_conversations" });
    return { available: false, value: null };
  }
  return { available: true, value: Number(data) };
}

export async function readHiresRecorded(
  employerProfileId: string | null
): Promise<Figure> {
  if (!employerProfileId) return { available: true, value: 0 };
  const { count, error } = await supabase
    .from("t3a_employer_hire_record")
    .select("*", { count: "exact", head: true })
    .eq("employer_profile_id", employerProfileId);
  if (error) {
    await logDeskEvent("figure_unreadable", { figure: "hires_recorded" });
    return { available: false, value: null };
  }
  return { available: true, value: count ?? 0 };
}

export interface LiveWorksTileState {
  stateCode: "not_activated" | "not_verified" | "available";
  stateLine: string | null;
  controlEnabled: boolean;
}

/**
 * Item 6. Activation is a configuration value read at request time, not
 * a code change and not a build flag. Where it cannot be read, LiveWorks
 * is treated as not activated: never an enabled control against an
 * unactivated product.
 */
export async function readLiveWorksTileState(): Promise<LiveWorksTileState> {
  const { data, error } = await supabase.rpc("t3a_liveworks_tile_state");
  if (error || !data || (Array.isArray(data) && data.length === 0)) {
    await logDeskEvent("liveworks_state_unreadable", {});
    return {
      stateCode: "not_activated",
      stateLine: "LiveWorks is not open to employers yet.",
      controlEnabled: false,
    };
  }
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown>;
  return {
    stateCode: row.state_code as LiveWorksTileState["stateCode"],
    stateLine: (row.state_line as string | null) ?? null,
    controlEnabled: Boolean(row.control_enabled),
  };
}

export async function readLiveWorksActivated(): Promise<boolean> {
  const { data, error } = await supabase.rpc("t3a_liveworks_activated");
  if (error) return false;
  return Boolean(data);
}

export interface CoverageDisclosure {
  available: boolean;
  refusalCode?: string;
  figuresAvailable: boolean;
  reportsAvailable: number | null;
  areasInService: string[];
  lastUpdated: string | null;
  changeBlockAvailable: boolean;
  reportsBecameAvailable: number | null;
  areaEnteredService: boolean | null;
}

/**
 * Item 9A. The disclosure takes no employer input and offers no query,
 * filter, segmentation, search or data-manipulation control. Block 3
 * compares published snapshots, never an individual employer's last
 * visit, and carries no withdrawal figure of any kind.
 */
export async function readCoverageDisclosure(): Promise<CoverageDisclosure> {
  const { data, error } = await supabase.rpc("t3a_coverage_disclosure");
  if (error || !data) {
    return {
      available: false,
      refusalCode: "COVERAGE_UNAVAILABLE",
      figuresAvailable: false,
      reportsAvailable: null,
      areasInService: [],
      lastUpdated: null,
      changeBlockAvailable: false,
      reportsBecameAvailable: null,
      areaEnteredService: null,
    };
  }
  const d = data as Record<string, unknown>;
  return {
    available: Boolean(d.available),
    refusalCode: (d.refusal_code as string | undefined) ?? undefined,
    figuresAvailable: Boolean(d.figures_available),
    reportsAvailable: (d.reports_available as number | null) ?? null,
    areasInService: (d.areas_in_service as string[] | null) ?? [],
    lastUpdated: (d.last_updated as string | null) ?? null,
    changeBlockAvailable: Boolean(d.change_block_available),
    reportsBecameAvailable: (d.reports_became_available as number | null) ?? null,
    areaEnteredService: (d.area_entered_service as boolean | null) ?? null,
  };
}

/**
 * Item 10 step 5.4. Selecting Contact available rechecks contact consent
 * server-side at that moment. The element having rendered on a card is
 * not authority to open a thread.
 */
export async function openConversation(
  participantId: string
): Promise<{ opened: boolean; conversationId?: string; refusalCode?: string }> {
  const { data, error } = await supabase.rpc("t3a_employer_open_conversation", {
    p_participant_id: participantId,
  });
  if (error || !data) {
    return { opened: false, refusalCode: "CONVERSATION_UNAVAILABLE" };
  }
  const d = data as Record<string, unknown>;
  return {
    opened: Boolean(d.opened),
    conversationId: (d.conversation_id as string | undefined) ?? undefined,
    refusalCode: (d.refusal_code as string | undefined) ?? undefined,
  };
}

/**
 * Item 12. Employer feedback about The 3rd Academy must never become
 * behavioral evidence about a participant. No participant selection of
 * any kind is offered, and a submission carrying a structured reference
 * refuses server-side.
 */
export async function submitProductFeedback(
  category: string,
  body: string
): Promise<{ accepted: boolean; refusalCode?: string }> {
  const { data, error } = await supabase.rpc("t3a_employer_submit_feedback", {
    p_category: category,
    p_body: body,
  });
  if (error || !data) {
    return { accepted: false, refusalCode: "FEEDBACK_UNAVAILABLE" };
  }
  const d = data as Record<string, unknown>;
  return {
    accepted: Boolean(d.accepted),
    refusalCode: (d.refusal_code as string | undefined) ?? undefined,
  };
}

/** Item 3 step 5.6 — an employer-entered organization figure. */
export async function recordHire(
  employerProfileId: string,
  roleTitle: string,
  hiredOn: string | null
): Promise<boolean> {
  const { error } = await supabase.from("t3a_employer_hire_record").insert({
    employer_profile_id: employerProfileId,
    role_title: roleTitle,
    hired_on: hiredOn,
  });
  return !error;
}

/**
 * Item 3 step 5.7 — the optional attestation, offered at the point of
 * record interaction and never as part of the hire entry. It never
 * increments Hires recorded.
 */
export async function attestRecordInformedDecision(
  employerProfileId: string,
  berReportId: string,
  interactionContext: string
): Promise<boolean> {
  const { error } = await supabase.from("t3a_record_informed_decision").insert({
    employer_profile_id: employerProfileId,
    ber_report_id: berReportId,
    interaction_context: interactionContext,
  });
  return !error;
}
