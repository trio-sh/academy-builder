/**
 * T3A OBSERVATION INTEGRITY SERVICE
 * Enforces Build Rules 9, 10, and 11.
 *
 * Rule 9 — Re-Assessment Cooldown:
 *   Admin-configurable (default 14 days). Candidates cannot retake any
 *   dimension sooner than the configured period.
 *
 * Rule 10 — Scenario Randomization Audit Log:
 *   Each session generates a cryptographic seed. Seed + scenario sequence
 *   are logged to scenario_selection_audit for review.
 *
 * Rule 11 — Behavioral Consistency Index:
 *   Internal metric updated after each completed session.
 *   NEVER exposed to candidates.
 */

import { supabase } from '@/lib/supabase';
import { COOLDOWN_SETTING_KEY, DEFAULT_COOLDOWN_DAYS } from '@/lib/t3aConstants';

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

export interface CooldownStatus {
  allowed: boolean;
  cooldownEndsAt?: Date;
  daysRemaining?: number;
  hoursRemaining?: number;
}

export interface ObservationSession {
  id: string;
  assignmentId: string;
  candidateId: string;
  sessionType: string;
  status: string;
  feedbackLevel: number;
}

// ─────────────────────────────────────────────────────────────────
// RULE 9 — COOLDOWN
// ─────────────────────────────────────────────────────────────────

/**
 * Reads the admin-configurable cooldown value from admin_settings.
 * Falls back to DEFAULT_COOLDOWN_DAYS (14) if the row doesn't exist.
 */
export async function getCooldownDays(): Promise<number> {
  try {
    const { data } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', COOLDOWN_SETTING_KEY)
      .single();

    if (data?.value) {
      const parsed = parseInt(data.value, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  } catch {
    // Table may not exist in dev — fall back silently
  }

  return DEFAULT_COOLDOWN_DAYS;
}

/**
 * Checks whether a candidate is allowed to start a new observation session.
 * Cooldown only applies when ALL assigned dimensions have L1 feedback.
 * If some dimensions are still unscored, the candidate can continue.
 *
 * @param candidateId - The candidate's auth user UUID
 * @returns CooldownStatus with `allowed: true` if they can proceed
 */
export async function checkObservationCooldown(
  candidateId: string,
  _dimensionId?: string
): Promise<CooldownStatus> {
  if (!candidateId) {
    return { allowed: false };
  }

  // Check if the candidate has unscored dimensions (incomplete L1 cycle)
  // If so, skip cooldown — they need to finish their current cycle
  const { data: cp } = await supabase
    .from('candidate_profiles')
    .select('id')
    .eq('profile_id', candidateId)
    .maybeSingle();

  if (cp) {
    // Get active assignment
    const { data: assignment } = await supabase
      .from('mentor_assignments')
      .select('id')
      .eq('candidate_id', cp.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (assignment) {
      // Get assigned dimensions
      const { data: dims } = await supabase
        .from('mentor_assigned_dimensions')
        .select('dimension_id')
        .eq('assignment_id', assignment.id)
        .eq('is_active', true);

      // Get L1 feedback already recorded
      const { data: l1Feedback } = await supabase
        .from('observation_feedback')
        .select('dimension_id')
        .eq('assignment_id', assignment.id)
        .eq('candidate_id', cp.id)
        .eq('feedback_level', 1);

      const assignedDimIds = dims?.map(d => d.dimension_id) || [];
      const scoredDimIds = new Set(l1Feedback?.map(f => f.dimension_id) || []);
      const allScored = assignedDimIds.length > 0 && assignedDimIds.every(d => scoredDimIds.has(d));

      // If not all dimensions scored, allow — no cooldown for incomplete cycles
      if (!allScored) {
        return { allowed: true };
      }
    }
  }

  // All dimensions scored — check cooldown for next full cycle
  const cooldownDays = await getCooldownDays();

  const { data: lastSession } = await supabase
    .from('observation_sessions')
    .select('updated_at')
    .eq('candidate_id', candidateId)
    .eq('status', 'completed')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastSession?.updated_at) {
    return { allowed: true };
  }

  const lastCompleted = new Date(lastSession.updated_at);
  const cooldownEndsAt = new Date(
    lastCompleted.getTime() + cooldownDays * 24 * 60 * 60 * 1000
  );
  const now = new Date();

  if (now >= cooldownEndsAt) {
    return { allowed: true };
  }

  const msRemaining = cooldownEndsAt.getTime() - now.getTime();
  const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
  const hoursRemaining = Math.ceil(msRemaining / (60 * 60 * 1000));

  return {
    allowed: false,
    cooldownEndsAt,
    daysRemaining,
    hoursRemaining,
  };
}

// ─────────────────────────────────────────────────────────────────
// RULE 10 — SCENARIO RANDOMIZATION
// ─────────────────────────────────────────────────────────────────

/**
 * Generates a cryptographic random seed for scenario selection.
 * The seed is stored for audit purposes (Rule 10).
 */
export function generateRandomSeed(): number {
  const array = new Uint32Array(2);
  crypto.getRandomValues(array);
  // Combine two 32-bit values into a positive integer seed
  return (array[0] * 0x100000000 + array[1]) >>> 0;
}

/**
 * Seeded pseudo-random number generator (Mulberry32).
 * Deterministic — same seed produces same scenario order, enabling audit replay.
 */
export function seededRandom(seed: number): () => number {
  let s = seed;
  return function () {
    s |= 0;
    s = s + 0x6d2b79f5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Shuffles an array using a seeded PRNG (Fisher-Yates).
 * Deterministic — same seed, same order. Safe for audit replay.
 */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  const rng = seededRandom(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─────────────────────────────────────────────────────────────────
// SESSION LIFECYCLE
// ─────────────────────────────────────────────────────────────────

/**
 * Creates a new observation session row.
 * Matches actual observation_sessions table schema.
 *
 * @param candidateId - The candidate's auth user UUID
 * @param assignmentId - The mentor_assignments.id
 * @param feedbackLevel - The observation level (1=L1 AI, 2=L2 Mentor, etc.)
 * @param mentorId - Optional mentor_profiles.id
 * @returns The created session ID, or null on error
 */
export async function startObservationSession(
  candidateId: string,
  assignmentId: string,
  feedbackLevel: number,
  mentorId?: string
): Promise<string | null> {
  const { data: session, error } = await supabase
    .from('observation_sessions')
    .insert({
      candidate_id: candidateId,
      assignment_id: assignmentId,
      session_type: 'ai_observation',
      status: 'in_progress',
      feedback_level: feedbackLevel,
      mentor_id: mentorId || null,
    })
    .select('id')
    .single();

  if (error || !session?.id) {
    console.error('[T3A] Failed to create observation session:', error);
    return null;
  }

  return session.id;
}

/**
 * Marks a session as complete.
 */
export async function completeObservationSession(
  sessionId: string
): Promise<void> {
  await supabase
    .from('observation_sessions')
    .update({
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);
}

/**
 * Records observation feedback for a dimension after session completion.
 * Creates a record in observation_feedback that the ObservationPathway page reads.
 *
 * @param feedbackLevel - The observation loop number (1, 2, or 3)
 */
export async function recordObservationFeedback(
  sessionId: string,
  assignmentId: string,
  candidateId: string,
  dimensionId: string,
  feedbackLevel: number,
  barsScore: number,
  aiFeedback: string
): Promise<void> {
  const { error } = await supabase.from('observation_feedback').insert({
    session_id: sessionId,
    assignment_id: assignmentId,
    candidate_id: candidateId,
    dimension_id: dimensionId,
    feedback_level: feedbackLevel,
    bars_score: Math.min(4, Math.max(1, Math.round(barsScore))),
    ai_draft_feedback: aiFeedback,
    status: 'ai_delivered',
  });

  if (error) {
    console.error('[T3A] Failed to record observation feedback:', error);
  }
}

/**
 * Returns the current mentor_loops count for a candidate.
 */
export async function getMentorLoops(
  candidateProfileId: string
): Promise<number> {
  const { data: cp } = await supabase
    .from('candidate_profiles')
    .select('mentor_loops')
    .eq('id', candidateProfileId)
    .single();

  return cp?.mentor_loops || 0;
}

/**
 * Increments the mentor_loops count on candidate_profiles after a completed observation.
 * Tracks how many observation cycles the candidate has completed.
 * Skill Passport is ONLY awarded via mentor endorsement (Proceed decision), NOT here.
 */
export async function incrementMentorLoops(
  candidateProfileId: string
): Promise<number> {
  const currentLoops = await getMentorLoops(candidateProfileId);
  const newLoops = currentLoops + 1;

  await supabase
    .from('candidate_profiles')
    .update({
      mentor_loops: newLoops,
      updated_at: new Date().toISOString(),
    })
    .eq('id', candidateProfileId);

  return newLoops;
}

// ─────────────────────────────────────────────────────────────────
// RULE 11 — BEHAVIORAL CONSISTENCY INDEX (CLIENT WRITE ONLY)
// ─────────────────────────────────────────────────────────────────

/**
 * Updates the behavioral consistency index for a candidate/dimension after
 * a completed observation cycle (Rule 11).
 *
 * INTERNAL ONLY — this data is never read back by the candidate UI.
 * Only mentors and employer reports can access this data (enforced by RLS).
 *
 * @param candidateId - Candidate's profile UUID
 * @param dimensionId - T3A dimension ID
 * @param scenariosDemonstrated - Count of scenarios where the dimension was demonstrated
 * @param scenariosTotal - Total scenarios in the session
 */
export async function updateConsistencyIndex(
  candidateId: string,
  dimensionId: string,
  scenariosDemonstrated: number,
  scenariosTotal: number
): Promise<void> {
  if (scenariosTotal === 0) return;

  const consistencyRatio = Number((scenariosDemonstrated / scenariosTotal).toFixed(4));

  // Get current cycle count for this candidate/dimension
  const { data: existing } = await supabase
    .from('behavioral_consistency_index')
    .select('observation_cycle, consistency_ratio')
    .eq('candidate_id', candidateId)
    .eq('dimension_id', dimensionId)
    .order('observation_cycle', { ascending: false })
    .limit(1)
    .single();

  const nextCycle = existing ? existing.observation_cycle + 1 : 1;
  const previousRatio = existing?.consistency_ratio ?? null;

  let trend: 'improving' | 'declining' | 'stable' | 'first_cycle' = 'first_cycle';
  if (previousRatio !== null) {
    const delta = consistencyRatio - previousRatio;
    if (delta > 0.05) trend = 'improving';
    else if (delta < -0.05) trend = 'declining';
    else trend = 'stable';
  }

  await supabase.from('behavioral_consistency_index').insert({
    candidate_id: candidateId,
    dimension_id: dimensionId,
    observation_cycle: nextCycle,
    scenarios_demonstrated: scenariosDemonstrated,
    scenarios_total: scenariosTotal,
    consistency_ratio: consistencyRatio,
    previous_consistency_ratio: previousRatio,
    consistency_trend: trend,
  });
}
