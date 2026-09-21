-- =====================================================================
-- §11.1 — AC-18 and AC-19: the commit route
--
-- AC-18: "A committed action traces to the exact authorization in force
--         at the time"
-- AC-19: "The saved record proves the exact source, question,
--         answer-catalog and applicability versions used. Later updates
--         rewrite no history"
--
-- Neither held. The cockpit inserted t3a_observation_record directly and
-- left authority_snapshot_id null, so a committed action traced to
-- nothing; version_set pinned the stage entry, the source version and
-- the answers, but not the question, catalogue or applicability
-- versions; and nothing stopped a committed record being edited
-- afterwards.
--
-- A client insert could never satisfy AC-18, and not because the client
-- forgot. The authorization in force is a fact about the server at the
-- moment of the write. A caller asked to supply it could supply any
-- authorization it liked, and one that omits it — as this one did — is
-- indistinguishable from one that had none. So the commit becomes a
-- route, the route takes the snapshot itself, and the table stops
-- accepting direct writes.
-- =====================================================================

set search_path = public;

-- ---------------------------------------------------------------------
-- 1. The authorization in force, captured rather than claimed
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_capture_authority(
  p_authority   public.t3a_authority,
  p_dimension   text,
  p_stage_code  public.t3a_stage_code)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_actor uuid := auth.uid();
  v_auth  public.t3a_role_authorization;
  v_id    uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'NO_ACTOR_IDENTIFIED' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Current AT THE MOMENT OF THE WRITE. A later lookup cannot recover
  -- this: an authorization withdrawn tomorrow was still in force today,
  -- and an observation committed today must keep saying so.
  SELECT ra.* INTO v_auth
  FROM public.t3a_role_authorization ra
  WHERE ra.actor_id = v_actor
    AND ra.authority = p_authority
    AND ra.status = 'granted'
    AND ra.withdrawn_at IS NULL
    AND ra.suspended_at IS NULL
    AND ra.effective_from <= now()
    AND (ra.effective_to IS NULL OR ra.effective_to >= now())
    AND (ra.dimension_id IS NULL OR ra.dimension_id = p_dimension)
    AND (coalesce(array_length(ra.stage_codes, 1), 0) = 0
         OR p_stage_code::text = ANY (ra.stage_codes))
  ORDER BY ra.granted_at DESC
  LIMIT 1;

  IF v_auth.role_authorization_id IS NULL THEN
    RAISE EXCEPTION 'ACTOR_NOT_AUTHORIZED: % holds no current % authority for % at %',
      v_actor, p_authority, p_dimension, p_stage_code
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  INSERT INTO public.t3a_authority_snapshot
    (actor_id, authority, dimension_id, stage_code, role_authorization_id, snapshot)
  VALUES (v_actor, p_authority, p_dimension, p_stage_code,
          v_auth.role_authorization_id,
          -- The whole authorization row as it stood, not a summary of
          -- it. A summary is a decision about what will matter later.
          to_jsonb(v_auth) || jsonb_build_object('captured_at', now()))
  RETURNING authority_snapshot_id INTO v_id;

  RETURN v_id;
END;
$fn$;

-- ---------------------------------------------------------------------
-- 2. The version set AC-19 names
-- ---------------------------------------------------------------------

-- Source, question, answer-catalogue and applicability. The first was
-- already pinned; the other three are pinned by content hash so the set
-- proves WHICH text was served, not merely that some was.
CREATE OR REPLACE FUNCTION public.t3a_d1_version_set(
  p_stage_entry_event_id uuid,
  p_source_version_id    uuid,
  p_answers              jsonb)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT jsonb_build_object(
    'stage_entry_event_id', p_stage_entry_event_id,
    'source_version_id',    p_source_version_id,
    'answers',              p_answers,

    -- The source text itself, by hash. If the body were ever to change
    -- under a committed record, this is what would stop agreeing with it.
    'source_version_hash',
      (SELECT cv.body ->> 'source_version_hash'
         FROM public.t3a_d1_content_version cv
        WHERE cv.content_version_id = p_source_version_id),

    -- The question register as served: every question code with the
    -- shape that governed it.
    'question_object_version',
      (SELECT encode(extensions.digest(
                string_agg(q.question_code || '|' || q.answer_type || '|'
                           || q.applicability, E'\n' ORDER BY q.display_order),
                'sha256'), 'hex')
         FROM public.t3a_d1_question_object q),

    -- The answer catalogue: the capture sets and their lines. This is
    -- what "answer-catalog version" means — a determination recorded
    -- against a line that has since been reworded must still resolve to
    -- the line that was actually shown.
    'answer_catalogue_version',
      (SELECT encode(extensions.digest(
                string_agg(s.capture_set_code || '|' || l.line_order || '|' || l.line_text,
                           E'\n' ORDER BY s.display_order, l.line_order),
                'sha256'), 'hex')
         FROM public.t3a_d1_capture_set s
         JOIN public.t3a_d1_capture_line l ON l.capture_set_code = s.capture_set_code),

    -- Applicability: the branch rules that decided which questions were
    -- served at all. A record that cannot say which rules applied cannot
    -- explain why a question is absent.
    'applicability_version',
      (SELECT encode(extensions.digest(
                string_agg(b.rule_code || '|' || b.rule_condition || '|' || b.rule_effect,
                           E'\n' ORDER BY b.rule_order),
                'sha256'), 'hex')
         FROM public.t3a_d1_branch_rule b),

    'pinned_at', now());
$fn$;

-- ---------------------------------------------------------------------
-- 3. The route
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_s2_commit_observation(
  p_stage_entry_event_id uuid,
  p_answers              jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_actor    uuid := auth.uid();
  v_entry    public.t3a_stage_entry_event;
  v_snapshot uuid;
  v_record   uuid;
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('committed', false,
      'refusal_code', 'NO_OBSERVER_IDENTIFIED');
  END IF;

  -- Everything about what is being observed comes from the entry, not
  -- from the caller. The caller names the session; it does not get to
  -- name the participant, the dimension or the source.
  SELECT * INTO v_entry FROM public.t3a_stage_entry_event
   WHERE stage_entry_event_id = p_stage_entry_event_id;

  IF v_entry.stage_entry_event_id IS NULL THEN
    RETURN jsonb_build_object('committed', false,
      'refusal_code', 'STAGE_ENTRY_NOT_FOUND');
  END IF;

  IF v_entry.stage_code <> 'S2' THEN
    RETURN jsonb_build_object('committed', false,
      'refusal_code', 'NOT_A_STAGE_2_ENTRY',
      'remedy', 'S1 goes through confirmation, not this route.');
  END IF;

  IF v_entry.source_version_id IS NULL THEN
    RETURN jsonb_build_object('committed', false,
      'refusal_code', 'NO_SOURCE_SERVED',
      'remedy', 'A determination is about a source. There is nothing to record against.');
  END IF;

  -- Only the mentor this participant is assigned to. The live-view party
  -- rule learned this the hard way; the same rule applies to committing.
  IF NOT EXISTS (
    SELECT 1 FROM public.t3a_mentor_assignment ma
    WHERE ma.mentor_id = v_actor
      AND ma.participant_id = v_entry.participant_id
  ) THEN
    RETURN jsonb_build_object('committed', false,
      'refusal_code', 'OBSERVER_NOT_ASSIGNED_TO_PARTICIPANT');
  END IF;

  -- AC-18. Raises rather than returns, because a commit that proceeded
  -- without a snapshot is the defect.
  v_snapshot := public.t3a_d1_capture_authority(
    'observe'::public.t3a_authority, v_entry.dimension_id, v_entry.stage_code);

  INSERT INTO public.t3a_observation_record
    (participant_id, dimension_id, stage_code, observer_id,
     authority_snapshot_id, version_set, is_committed, committed_at)
  VALUES (v_entry.participant_id, v_entry.dimension_id, v_entry.stage_code,
          v_actor, v_snapshot,
          public.t3a_d1_version_set(p_stage_entry_event_id,
                                    v_entry.source_version_id, p_answers),
          true, now())
  RETURNING observation_record_id INTO v_record;

  RETURN jsonb_build_object('committed', true,
    'observation_record_id', v_record,
    'authority_snapshot_id', v_snapshot);
END;
$fn$;

GRANT EXECUTE ON FUNCTION
  public.t3a_d1_s2_commit_observation(uuid, jsonb),
  public.t3a_d1_version_set(uuid, uuid, jsonb)
TO authenticated;

-- t3a_d1_capture_authority is not the client's to call. It writes an
-- authority snapshot, and a snapshot written outside a commit is a
-- record of an authorization that authorized nothing.
REVOKE ALL ON FUNCTION
  public.t3a_d1_capture_authority(public.t3a_authority, text, public.t3a_stage_code)
FROM public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. "Later updates rewrite no history"
-- ---------------------------------------------------------------------

-- AC-19's second sentence, enforced. Once committed, the facts a record
-- asserts are sealed: who was observed, by whom, under which
-- authorization, against which versions.
--
-- confirmer_id is deliberately NOT sealed. Confirmation is a separate
-- act performed afterwards by a second person, and the action-sequence
-- guard already governs it. Sealing it would make confirmation
-- impossible; leaving the rest open would make AC-19 a slogan.
CREATE OR REPLACE FUNCTION public.t3a_observation_record_sealed()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF coalesce(OLD.is_committed, false) THEN
      RAISE EXCEPTION 'COMMITTED_OBSERVATION_IS_NOT_DELETABLE: observation % is committed evidence',
        OLD.observation_record_id
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF NOT coalesce(OLD.is_committed, false) THEN
    RETURN NEW;
  END IF;

  IF NEW.participant_id      IS DISTINCT FROM OLD.participant_id
     OR NEW.dimension_id      IS DISTINCT FROM OLD.dimension_id
     OR NEW.stage_code        IS DISTINCT FROM OLD.stage_code
     OR NEW.observer_id       IS DISTINCT FROM OLD.observer_id
     OR NEW.authority_snapshot_id IS DISTINCT FROM OLD.authority_snapshot_id
     OR NEW.version_set       IS DISTINCT FROM OLD.version_set
     OR NEW.is_committed      IS DISTINCT FROM OLD.is_committed
     OR NEW.committed_at      IS DISTINCT FROM OLD.committed_at THEN
    RAISE EXCEPTION 'COMMITTED_OBSERVATION_IS_SEALED: % cannot be rewritten after commit; a correction is a new record and a superseding link',
      OLD.observation_record_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_observation_record_sealed_trg
  ON public.t3a_observation_record;
CREATE TRIGGER t3a_observation_record_sealed_trg
  BEFORE UPDATE OR DELETE ON public.t3a_observation_record
  FOR EACH ROW EXECUTE FUNCTION public.t3a_observation_record_sealed();

-- The authority snapshot is already immutable via
-- t3a_authority_snapshot_immutable. Stated here so a reader of this
-- migration does not have to go looking for whether the other half of
-- the trace is protected too.
