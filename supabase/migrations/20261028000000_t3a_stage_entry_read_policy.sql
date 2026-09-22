-- =====================================================================
-- The Stage 2 cockpit could not open for a mentor
--
-- Driving the cockpit in a browser as an assigned, authorized mentor
-- returned "Stage entry event not found" against a Stage entry that
-- exists. It was not missing; it was unreadable.
--
-- t3a_stage_entry_event carried exactly one policy:
--
--   t3a_stage_entry_event_write_admin  FOR ALL  USING is_admin()
--
-- and no SELECT policy at all, so the only account that could read a
-- Stage entry was an admin. Not the mentor running the session, not even
-- the participant the entry is about.
--
-- TWO FAULTS, not one.
--
-- 1. The read policy 20260903000000 defines never landed. That migration
--    is one of the four 20260905's post-mortem covers — applied statement
--    by statement with the errors swallowed — and this is another thing
--    it lost, alongside the eight columns already restored.
--
-- 2. The policy it defines would not have been enough either:
--
--      USING (participant_id = auth.uid() OR public.is_admin())
--
--    No mentor. A cockpit is a mentor's surface, so as designed it could
--    never have opened for the person it exists for. Restoring that
--    statement verbatim would have restored a policy that does not work.
--
-- So the mentor is added, and narrowly: an assignment to THIS
-- participant, which is the same rule the live-view party check and the
-- commit route already apply. Not "any mentor".
--
-- Oversight standing IS admitted here, and that is a deliberate
-- difference from t3a_d1_s2_live_view_party, which excludes it. Reading
-- the record of a Stage entry is auditing, which is what oversight is
-- for. Watching a participant through their camera is not, which is why
-- the media path refuses the same standing this one allows.
-- =====================================================================

set search_path = public;

DROP POLICY IF EXISTS "t3a_stage_entry_event_read" ON public.t3a_stage_entry_event;
CREATE POLICY "t3a_stage_entry_event_read"
  ON public.t3a_stage_entry_event FOR SELECT TO authenticated
  USING (
    participant_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.t3a_mentor_assignment ma
      WHERE ma.mentor_id = auth.uid()
        AND ma.participant_id = t3a_stage_entry_event.participant_id)
    OR public.is_admin()
    OR public.t3a_has_administrative_standing()
  );

GRANT SELECT ON public.t3a_stage_entry_event TO authenticated;

-- The cockpit reads the source body through the content register, so a
-- mentor who can reach the entry but not the version still sees nothing.
-- Content is not participant data: it is the approved material the
-- session is conducted from, and every authenticated account may already
-- read t3a_content_object. This makes the version readable on the same
-- terms rather than leaving the cockpit half-supplied.
DROP POLICY IF EXISTS "t3a_d1_content_version_read" ON public.t3a_d1_content_version;
CREATE POLICY "t3a_d1_content_version_read"
  ON public.t3a_d1_content_version FOR SELECT TO authenticated
  USING (true);

GRANT SELECT ON public.t3a_d1_content_version TO authenticated;
