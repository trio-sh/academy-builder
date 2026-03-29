/**
 * T3A OBSERVATION LOOP TRACKING
 *
 * Anti-gaming mechanism: tracks per-dimension per-level loop attempts.
 * - Max 3 loops per dimension per level in a rolling 6-month window
 * - Cooldown periods vary by level and endorsement decision
 * - Loop 1 baseline score is permanently recorded
 * - Subsequent scores sit alongside, never replace
 * - Mentor can override the 3-loop lock
 */

import { supabase } from '@/lib/supabase';

// Cooldown periods in days by level and decision
const COOLDOWN_DAYS: Record<string, Record<string, number>> = {
  redirect: { '1': 7, '2': 14, '3': 0, '4': 21 },  // L3 = new project required (handled separately)
  pause: { '1': 30, '2': 30, '3': 30, '4': 30 },     // Pause = 30 days minimum all levels
};

const ROLLING_WINDOW_MONTHS = 6;
const MAX_LOOPS_PER_WINDOW = 3;

export interface LoopRecord {
  id: string;
  candidate_id: string;
  assignment_id: string;
  dimension_id: string;
  observation_level: number;
  loop_number: number;
  status: string;
  bars_score: number | null;
  endorsement_decision: string | null;
  scenario_variant: number;
  mentor_id: string | null;
  started_at: string;
  completed_at: string | null;
  cooldown_ends_at: string | null;
  cooldown_days: number | null;
  is_locked: boolean;
  mentor_override: boolean;
  override_reason: string | null;
}

export interface LoopStatus {
  canAttempt: boolean;
  currentLoop: number;
  maxLoops: number;
  loopsUsed: number;
  loopsRemaining: number;
  cooldownActive: boolean;
  cooldownEndsAt: Date | null;
  cooldownDaysRemaining: number;
  isLocked: boolean;
  lockReason: string | null;
  history: LoopRecord[];
}

/**
 * Get the loop status for a specific candidate + dimension + level combination.
 */
export async function getLoopStatus(
  candidateProfileId: string,
  dimensionId: string,
  observationLevel: number = 1
): Promise<LoopStatus> {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - ROLLING_WINDOW_MONTHS);

  const { data: loops } = await supabase
    .from('observation_loops')
    .select('*')
    .eq('candidate_id', candidateProfileId)
    .eq('dimension_id', dimensionId)
    .eq('observation_level', observationLevel)
    .gte('created_at', sixMonthsAgo.toISOString())
    .order('loop_number', { ascending: true });

  const history = (loops || []) as LoopRecord[];
  const loopsUsed = history.length;
  const latestLoop = history[history.length - 1] || null;

  // Check if locked (3 loops without Proceed in rolling window)
  const hasProceeded = history.some(l => l.endorsement_decision === 'proceed');
  const isLocked = loopsUsed >= MAX_LOOPS_PER_WINDOW && !hasProceeded && !(latestLoop?.mentor_override);

  // Check cooldown
  let cooldownActive = false;
  let cooldownEndsAt: Date | null = null;
  let cooldownDaysRemaining = 0;

  if (latestLoop?.cooldown_ends_at) {
    cooldownEndsAt = new Date(latestLoop.cooldown_ends_at);
    if (cooldownEndsAt > new Date()) {
      cooldownActive = true;
      cooldownDaysRemaining = Math.ceil((cooldownEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    }
  }

  // Check if currently in progress
  const inProgress = history.some(l => l.status === 'in_progress');

  const canAttempt = !isLocked && !cooldownActive && !inProgress && !hasProceeded;

  let lockReason: string | null = null;
  if (isLocked) lockReason = `Maximum ${MAX_LOOPS_PER_WINDOW} attempts reached in the rolling ${ROLLING_WINDOW_MONTHS}-month window.`;
  if (cooldownActive) lockReason = `Cooldown active until ${cooldownEndsAt?.toLocaleDateString()}. ${cooldownDaysRemaining} days remaining.`;
  if (hasProceeded) lockReason = 'Endorsed with Proceed — no further attempts needed.';
  if (inProgress) lockReason = 'A loop is currently in progress.';

  return {
    canAttempt,
    currentLoop: hasProceeded ? loopsUsed : (inProgress ? loopsUsed : loopsUsed + 1),
    maxLoops: MAX_LOOPS_PER_WINDOW,
    loopsUsed,
    loopsRemaining: Math.max(0, MAX_LOOPS_PER_WINDOW - loopsUsed),
    cooldownActive,
    cooldownEndsAt,
    cooldownDaysRemaining,
    isLocked,
    lockReason,
    history,
  };
}

/**
 * Start a new loop for a candidate on a specific dimension + level.
 * Returns the loop record or null if blocked.
 */
export async function startLoop(
  candidateProfileId: string,
  assignmentId: string,
  dimensionId: string,
  observationLevel: number = 1,
  mentorId?: string
): Promise<LoopRecord | null> {
  const status = await getLoopStatus(candidateProfileId, dimensionId, observationLevel);

  if (!status.canAttempt) {
    console.warn(`[T3A Loops] Cannot start loop: ${status.lockReason}`);
    return null;
  }

  const newLoopNumber = status.loopsUsed + 1;
  // Use different scenario variant per loop
  const scenarioVariant = ((newLoopNumber - 1) % 3) + 1;

  const { data, error } = await supabase
    .from('observation_loops')
    .insert({
      candidate_id: candidateProfileId,
      assignment_id: assignmentId,
      dimension_id: dimensionId,
      observation_level: observationLevel,
      loop_number: newLoopNumber,
      status: 'in_progress',
      scenario_variant: scenarioVariant,
      mentor_id: mentorId || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[T3A Loops] Failed to start loop:', error);
    return null;
  }

  return data as LoopRecord;
}

/**
 * Complete a loop with the endorsement decision and BARS score.
 * Automatically calculates and applies cooldown if needed.
 */
export async function completeLoop(
  loopId: string,
  barsScore: number,
  endorsementDecision: 'proceed' | 'redirect' | 'pause' | 'escalate'
): Promise<void> {
  const { data: loop } = await supabase
    .from('observation_loops')
    .select('*')
    .eq('id', loopId)
    .single();

  if (!loop) return;

  const now = new Date();
  let cooldownEndDate: Date | null = null;
  let cooldownDayCount = 0;

  // Calculate cooldown based on decision and level
  if (endorsementDecision === 'redirect' || endorsementDecision === 'pause') {
    const level = loop.observation_level.toString();
    cooldownDayCount = COOLDOWN_DAYS[endorsementDecision]?.[level] || 7;
    cooldownEndDate = new Date(now.getTime() + cooldownDayCount * 24 * 60 * 60 * 1000);
  }

  await supabase
    .from('observation_loops')
    .update({
      status: endorsementDecision === 'proceed' ? 'completed' : 'cooldown',
      bars_score: Math.min(4, Math.max(1, Math.round(barsScore))),
      endorsement_decision: endorsementDecision,
      completed_at: now.toISOString(),
      cooldown_ends_at: cooldownEndDate?.toISOString() || null,
      cooldown_days: cooldownDayCount || null,
      updated_at: now.toISOString(),
    })
    .eq('id', loopId);
}

/**
 * Mentor override: grant an additional loop beyond the 3-loop maximum.
 */
export async function mentorOverride(
  candidateProfileId: string,
  dimensionId: string,
  observationLevel: number,
  reason: string
): Promise<void> {
  // Get the latest loop
  const { data: latest } = await supabase
    .from('observation_loops')
    .select('id')
    .eq('candidate_id', candidateProfileId)
    .eq('dimension_id', dimensionId)
    .eq('observation_level', observationLevel)
    .order('loop_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest) {
    await supabase
      .from('observation_loops')
      .update({
        mentor_override: true,
        override_reason: reason,
        is_locked: false,
        status: 'completed', // Release from locked state
        updated_at: new Date().toISOString(),
      })
      .eq('id', latest.id);
  }
}

/**
 * Get all loop statuses for a candidate across all their assigned dimensions.
 * Used by the mentor to see the full picture.
 */
export async function getAllLoopStatuses(
  candidateProfileId: string,
  assignedDimensions: string[],
  observationLevel: number = 1
): Promise<Record<string, LoopStatus>> {
  const result: Record<string, LoopStatus> = {};

  for (const dimId of assignedDimensions) {
    result[dimId] = await getLoopStatus(candidateProfileId, dimId, observationLevel);
  }

  return result;
}
