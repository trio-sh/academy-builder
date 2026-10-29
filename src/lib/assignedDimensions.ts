/**
 * Saving the dimensions a mentor assigns to a candidate (table mentor_assigned_dimensions).
 *
 * The table's mentor_id and candidate_id both point at profiles.id, not at mentor_profiles.id or candidate_profiles.id, and the candidate reads the rows
 * through candidate_id = their own profile id. The page used to send the two desk ids, so the foreign keys refused every insert, and because the result
 * was never looked at the page showed a normal save while nothing was written (CR-338). The ids are now the profile ids, every call is checked, and a
 * dimension that was assigned, removed and assigned again is switched back on instead of colliding with its old row.
 */
export interface DimensionDb {
  // The supabase client, reached through the handful of calls used here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
}

export interface SaveAssignedDimensionsInput {
  assignmentId: string;
  /** profiles.id of the mentor (the signed-in user) */
  mentorUserId: string;
  /** profiles.id of the candidate (candidate_profiles.profile_id, not candidate_profiles.id) */
  candidateUserId: string;
  /** the dimensions active before this save */
  existing: string[];
  /** the dimensions that should be active after it */
  selected: string[];
}

export interface SaveAssignedDimensionsResult {
  ok: boolean;
  /** the database's own message when ok is false */
  message?: string;
}

export async function saveAssignedDimensions(db: DimensionDb, i: SaveAssignedDimensionsInput): Promise<SaveAssignedDimensionsResult> {
  const now = new Date().toISOString();
  const remove = i.existing.filter((d) => !i.selected.includes(d));
  if (remove.length > 0) {
    const { error } = await db
      .from("mentor_assigned_dimensions")
      .update({ is_active: false, updated_at: now })
      .eq("assignment_id", i.assignmentId)
      .in("dimension_id", remove);
    if (error) return { ok: false, message: error.message };
  }
  const add = i.selected.filter((d) => !i.existing.includes(d));
  if (add.length > 0) {
    const { error } = await db.from("mentor_assigned_dimensions").upsert(
      add.map((dimension_id) => ({
        assignment_id: i.assignmentId,
        mentor_id: i.mentorUserId,
        candidate_id: i.candidateUserId,
        dimension_id,
        is_active: true,
        updated_at: now,
      })),
      { onConflict: "assignment_id,dimension_id" },
    );
    if (error) return { ok: false, message: error.message };
  }
  return { ok: true };
}
