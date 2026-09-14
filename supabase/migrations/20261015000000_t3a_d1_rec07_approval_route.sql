-- =====================================================================
-- REC-07 — the governed route to approving a source for serving
--
-- Fourteen of the thirty acceptance tests are blocked on one input: no
-- source is registered for serving, because none holds a REC-07
-- approval. The tempting move was to write one and unblock them.
--
-- It is not taken, and the reason is the whole point of this system. An
-- approval that a developer can write to get a test green is not an
-- approval. Everything else here — the append-only logs, the hash
-- chains, the refusals that survive a SECURITY DEFINER route — exists so
-- that a governance record means what it says. Fabricating one to move a
-- number from 14 to 24 would be the single most expensive shortcut
-- available.
--
-- What was actually wrong is that the approval table had no route and no
-- guard: RLS on, one read policy, no insert policy, no trigger, nothing
-- checking who may approve, and a status column any writer could set to
-- 'approved'. The governance act had somewhere to land and no door to
-- come through.
--
-- This builds the door. It does not walk through it.
--
--   1. Approving is a function, not an INSERT. There is no insert or
--      update policy on the table, so the route is the only way in.
--   2. The approver must hold administrative standing, and it is checked
--      server-side rather than assumed from the caller.
--   3. An approval names a person and a moment, and both are required.
--   4. An approval is append-only. Withdrawing is a new row, never an
--      edit, so the history shows that the source was once approved.
--   5. A source cannot approve itself into serving: the approval is
--      recorded against an exact content version, and a later version
--      does not inherit it.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. No writer may touch the table directly
-- ---------------------------------------------------------------------

-- RLS was already on with a read policy and no write policy, which means
-- no ordinary writer could insert. That is the correct state and is
-- stated here so a later migration does not "fix" it by adding one.
COMMENT ON TABLE public.t3a_d1_source_approval IS
  'REC-07 approvals. Written ONLY through t3a_d1_record_source_approval(). No insert or update policy exists by design: an approval a caller can write directly is not an approval.';

-- ---------------------------------------------------------------------
-- 2. Append-only
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_source_approval_append_only()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  RAISE EXCEPTION 'SOURCE_APPROVAL_APPEND_ONLY: % refused; withdraw by recording a withdrawal, so the history shows the source was once approved', TG_OP
    USING ERRCODE = 'check_violation';
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_d1_source_approval_append_only_trg
  ON public.t3a_d1_source_approval;
CREATE TRIGGER t3a_d1_source_approval_append_only_trg
  BEFORE UPDATE OR DELETE ON public.t3a_d1_source_approval
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_source_approval_append_only();

-- The unique key was (source_id, source_version_id), which made a
-- withdrawal-then-reapproval impossible once append-only holds. The
-- approval history is a sequence of statuses about one version, so the
-- uniqueness that matters is "one standing approval per version", which
-- a partial index expresses and a plain unique key cannot.
ALTER TABLE public.t3a_d1_source_approval
  DROP CONSTRAINT IF EXISTS t3a_d1_source_approval_source_id_source_version_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS t3a_d1_source_approval_one_standing
  ON public.t3a_d1_source_approval (source_id, source_version_id)
  WHERE status = 'approved';

-- ---------------------------------------------------------------------
-- 3. The route
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_record_source_approval(
  p_source_id         uuid,
  p_source_version_id uuid,
  p_status            text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_actor uuid := auth.uid();
  v_body  jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'NO_APPROVER_IDENTIFIED');
  END IF;

  -- Standing is checked here, not taken from the caller's word for it.
  IF NOT public.t3a_has_administrative_standing() THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'APPROVER_LACKS_STANDING');
  END IF;

  IF p_status NOT IN ('pending', 'approved', 'withdrawn') THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'STATUS_NOT_IN_CONTROLLED_SET');
  END IF;

  SELECT body INTO v_body FROM public.t3a_d1_content_version
   WHERE content_version_id = p_source_version_id;

  IF v_body IS NULL THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'SOURCE_VERSION_NOT_FOUND');
  END IF;

  -- A superseded version cannot be approved. Approving one would mean a
  -- source served text that a later correction had already replaced.
  IF EXISTS (SELECT 1 FROM public.t3a_d1_content_version
             WHERE content_version_id = p_source_version_id
               AND superseded_by IS NOT NULL) THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'SOURCE_VERSION_SUPERSEDED');
  END IF;

  -- §5.18: an approval names an exact version, and the version must be
  -- able to say which text it is. No hash, no approval.
  IF coalesce(btrim(v_body ->> 'source_version_hash'), '') = ''
     AND p_status = 'approved' THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'SOURCE_VERSION_CARRIES_NO_HASH',
      'remedy', 'An approval names an exact text. Assign the source-version hash before approving it.');
  END IF;

  IF p_status = 'approved'
     AND EXISTS (SELECT 1 FROM public.t3a_d1_source_approval
                 WHERE source_id = p_source_id
                   AND source_version_id = p_source_version_id
                   AND status = 'approved') THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'SOURCE_VERSION_ALREADY_APPROVED');
  END IF;

  INSERT INTO public.t3a_d1_source_approval
    (source_id, source_version_id, status, approved_by, approved_at)
  VALUES (p_source_id, p_source_version_id, p_status, v_actor, now());

  RETURN jsonb_build_object('recorded', true,
    'status', p_status,
    'approved_by', v_actor);
END;
$fn$;

-- ---------------------------------------------------------------------
-- 4. What is still true after this migration
-- ---------------------------------------------------------------------

-- Nothing is approved. No row is written here, and every one of the
-- forty issued sources still refuses to serve.
--
-- This function reports that plainly, so the state is readable rather
-- than inferred from an empty table.
CREATE OR REPLACE FUNCTION public.t3a_d1_serving_readiness()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT jsonb_build_object(
    'sources_loaded',
      (SELECT count(*) FROM public.t3a_content_object
        WHERE family = 'source'::public.t3a_content_family),
    'sources_approved',
      (SELECT count(DISTINCT source_id) FROM public.t3a_d1_source_approval
        WHERE status = 'approved'),
    'versions_carrying_a_hash',
      (SELECT count(*) FROM public.t3a_d1_content_version
        WHERE superseded_by IS NULL
          AND coalesce(btrim(body ->> 'source_version_hash'), '') <> ''),
    'any_source_servable', false,
    'blocked_on',
      'REC-07 approval is a governance act by a person with standing. It is not recorded by a build, and no build may record one.');
$fn$;

GRANT EXECUTE ON FUNCTION
  public.t3a_d1_record_source_approval(uuid, uuid, text),
  public.t3a_d1_serving_readiness()
TO authenticated;

-- ---------------------------------------------------------------------
-- 5. The approval could not reference any loaded source
-- ---------------------------------------------------------------------

-- Found by proving the route rather than reading it.
--
-- t3a_d1_source_approval.source_id pointed at t3a_source, which holds
-- ZERO rows. The forty loaded sources live in t3a_content_object, and
-- the version FK beside it already points at t3a_d1_content_version —
-- the content register, not the legacy one.
--
-- So REC-07 approval was impossible by construction: the one table that
-- records an approval could not name a single source that exists. A
-- governance act with no reachable subject is not a gate, it is a dead
-- end, and it would have read as "nothing is approved yet" forever.
--
-- The FK is re-pointed at the register the sources are actually in. The
-- table is empty, so nothing is migrated and nothing is lost, and the
-- two columns now refer to the same register as each other.
ALTER TABLE public.t3a_d1_source_approval
  DROP CONSTRAINT IF EXISTS t3a_d1_source_approval_source_id_fkey;

ALTER TABLE public.t3a_d1_source_approval
  ADD CONSTRAINT t3a_d1_source_approval_source_id_fkey
  FOREIGN KEY (source_id) REFERENCES public.t3a_content_object(content_object_id)
  ON DELETE RESTRICT;

-- And the route checks the pair belongs together, so an approval cannot
-- name one source's object and another source's version.
CREATE OR REPLACE FUNCTION public.t3a_d1_record_source_approval(
  p_source_id         uuid,
  p_source_version_id uuid,
  p_status            text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_actor uuid := auth.uid();
  v_body  jsonb;
  v_object uuid;
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'NO_APPROVER_IDENTIFIED');
  END IF;

  IF NOT public.t3a_has_administrative_standing() THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'APPROVER_LACKS_STANDING');
  END IF;

  IF p_status NOT IN ('pending', 'approved', 'withdrawn') THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'STATUS_NOT_IN_CONTROLLED_SET');
  END IF;

  SELECT body, content_object_id INTO v_body, v_object
    FROM public.t3a_d1_content_version
   WHERE content_version_id = p_source_version_id;

  IF v_body IS NULL THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'SOURCE_VERSION_NOT_FOUND');
  END IF;

  -- The object and the version must be the same source.
  IF v_object IS DISTINCT FROM p_source_id THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'VERSION_DOES_NOT_BELONG_TO_THIS_SOURCE');
  END IF;

  IF EXISTS (SELECT 1 FROM public.t3a_d1_content_version
             WHERE content_version_id = p_source_version_id
               AND superseded_by IS NOT NULL) THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'SOURCE_VERSION_SUPERSEDED');
  END IF;

  IF coalesce(btrim(v_body ->> 'source_version_hash'), '') = ''
     AND p_status = 'approved' THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'SOURCE_VERSION_CARRIES_NO_HASH',
      'remedy', 'An approval names an exact text. Assign the source-version hash before approving it.');
  END IF;

  IF p_status = 'approved'
     AND EXISTS (SELECT 1 FROM public.t3a_d1_source_approval
                 WHERE source_id = p_source_id
                   AND source_version_id = p_source_version_id
                   AND status = 'approved') THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'SOURCE_VERSION_ALREADY_APPROVED');
  END IF;

  INSERT INTO public.t3a_d1_source_approval
    (source_id, source_version_id, status, approved_by, approved_at)
  VALUES (p_source_id, p_source_version_id, p_status, v_actor, now());

  RETURN jsonb_build_object('recorded', true,
    'status', p_status,
    'approved_by', v_actor);
END;
$fn$;
