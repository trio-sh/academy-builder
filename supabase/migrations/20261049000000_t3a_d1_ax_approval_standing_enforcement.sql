-- =====================================================================
-- Section 4A — the approval-index ruling. Option (a), signed 25 Sep 2026
--
-- t3a_d1_source_approval_one_standing was UNIQUE (source_id,
-- source_version_id) WHERE status = 'approved'. The table is insert-only,
-- so an approved row is never removed and a withdrawal is a separate
-- later row. The index therefore permitted one approved row per version
-- EVER, not one STANDING approval per version — which is what its own
-- migration note said it was for. Every re-approval of a withdrawn
-- version was refused with duplicate key value violates unique
-- constraint, and RA-02R rolled back on all three.
--
-- The founder ruled option (a): uniqueness is enforced against each
-- version's CURRENT STANDING, so a recorded withdrawal frees the version
-- to be approved again and the re-approval lands on the SAME version.
-- Option (b) — superseding with an identical body to obtain a fresh slot
-- — was rejected: a new version must mean the content changed, and
-- identical-body versions would detach those sources from calibration
-- clearance, which is bound to exact versions.
--
-- AX-01  One definition of current standing, and only one.
--        t3a_d1_version_standing_status() is defined as a SELECT FROM
--        t3a_d1_source_approval_standing. It does not re-implement the
--        ordering, so enforcement and the read cannot drift apart: there
--        is one ORDER BY in the schema and both go through it.
-- AX-02  The partial index is replaced by a BEFORE INSERT check, because
--        a partial unique index cannot express "latest status".
-- AX-03  An approved row inserts only where current standing is not
--        'approved'. No prior row also qualifies. Where standing is
--        already approved it is refused AND LOGGED — see below on where
--        the log survives.
-- AX-04  Serialized per version. pg_advisory_xact_lock on
--        (source_id, source_version_id) is taken BEFORE standing is read,
--        so two concurrent approvals cannot both read "not approved".
--        The index gave this for free; the replacement buys it back.
-- AX-05  Insert-only is untouched. Nothing is updated or deleted.
-- AX-06  Withdrawal behavior is untouched.
-- AX-07  Asserted, dropped and replaced inside ONE DO block, so there is
--        no instant with neither in force. The invariant is asserted
--        across the WHOLE table first, not just the current versions.
--
-- WHERE THE LOG SURVIVES, AND WHY IT IS IN TWO PLACES. A trigger that
-- raises rolls back its own log insert, so "refuse and log" cannot be one
-- statement. The ordinary route, t3a_d1_record_source_approval, therefore
-- logs the refusal and RETURNS a refusal code — that row commits. The
-- trigger is the backstop for a direct insert that bypasses the route: it
-- raises, and the abort is itself the record. Logging in the raising path
-- would be theatre.
--
-- AX-08 — A RAW APPROVED COUNT WAS ALREADY WRONG, IN PRODUCTION, BEFORE
-- THIS RULING. Searching for direct reads of status = 'approved' on this
-- table found two, and one of them was actively misreporting:
--
--   t3a_d1_serving_readiness()  returned sources_servable 40,
--                               sources_approved 40 and blocked_on null
--                               while the register correctly read three
--                               unservable. It tested for the EXISTENCE
--                               of an approved row, so all three withdrawn
--                               sources counted as servable. It has been
--                               over-reporting since CS-I-45 withdrew
--                               them. Measured, not inferred.
--   t3a_d1_record_source_approval  refused with
--                               SOURCE_VERSION_ALREADY_APPROVED on the
--                               same existence test, so it would have
--                               refused the three re-approvals even with
--                               the index gone.
--
-- Both now go through standing. approved_but_superseded goes through
-- standing too: an approval withdrawn on a superseded version is not an
-- approval whose text moved underneath it.
--
-- AX-09 / AX-12 — THE THREE ORIGINALS ARE NOT ALIKE, AND THE TABLE DID
-- NOT SAY SO. Provenance held 37 rows for 40 carried approvals. The three
-- that failed the CS-I-44 assertion were withdrawn and never annotated,
-- so the standing view read was_carried_forward = false for all three —
-- true of none of them.
--
--   SRC-D1-S1-010, SRC-D1-S2-010  carried forward by 20261039000000,
--        which copies approved_by and approved_at from the superseded
--        row. Their approved_at of 2026-09-21 18:00 sits before the
--        CORR-003 supersede that created the version they are attached
--        to, which is what a carry-forward looks like. Annotated here as
--        carry-forwards with identity_assertion_passed = false — the
--        reason they were withdrawn.
--   SRC-D1-S3-010  NOT a carry-forward. Its current version was created
--        by RA-06 on 2026-09-25 and its approved row is dated
--        2026-09-25 20:03:59 — after the carry migration, by a process
--        that cannot be identified. AX-11.
--
-- AX-11 — THE UNACCOUNTED ROW IS KEPT AND FLAGGED, NOT BURIED. It is
-- recorded in t3a_d1_approval_audit_finding with everything that can be
-- established, and the standing view now carries an unaccounted flag so
-- the finding cannot be lost by reading the view instead of the table. It
-- is not deleted, not altered, and not labelled a carry-forward. It does
-- not block Section 5, because the new approval stands on top of the
-- recorded withdrawal either way.
--
-- AX-10  Carried standing approvals stays 37. The three new approvals are
--        fresh, so they are not counted as carried — and the count is
--        taken by standing, never by raw rows.
-- =====================================================================

set search_path = public;

-- ---------------------------------------------------------------------
-- 1. AX-11 — the audit-finding record, and AX-03's log
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_d1_approval_audit_finding (
  approval_audit_finding_id uuid primary key default gen_random_uuid(),
  source_approval_id uuid not null
    REFERENCES public.t3a_d1_source_approval(source_approval_id),
  finding text not null CHECK (finding IN ('unaccounted')),
  established jsonb not null,
  recorded_at timestamptz not null default now(),
  recorded_by text not null,
  UNIQUE (source_approval_id, finding)
);

COMMENT ON TABLE public.t3a_d1_approval_audit_finding IS
  'AX-11. An approval row whose origin cannot be accounted for stays in the history with a flag against it. The row itself is never deleted or altered, and a finding is never resolved by superseding the row it is about.';

CREATE TABLE IF NOT EXISTS public.t3a_d1_approval_refusal_log (
  approval_refusal_id uuid primary key default gen_random_uuid(),
  source_id uuid,
  source_version_id uuid,
  attempted_status text,
  refusal_code text not null,
  standing_at_refusal text,
  attempted_by uuid,
  refused_at timestamptz not null default now()
);

COMMENT ON TABLE public.t3a_d1_approval_refusal_log IS
  'AX-03. Refused approval attempts, written by t3a_d1_record_source_approval so the row commits. The BEFORE INSERT backstop cannot log: a trigger that raises rolls back its own insert, so there the abort is the record.';

ALTER TABLE public.t3a_d1_approval_audit_finding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t3a_d1_approval_refusal_log ENABLE ROW LEVEL SECURITY;

DO $rls$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['t3a_d1_approval_audit_finding',
                           't3a_d1_approval_refusal_log'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_read ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_read ON public.%I FOR SELECT USING (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_write ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_write ON public.%I FOR INSERT
         WITH CHECK (public.t3a_is_service_context())', t, t);
  END LOOP;
END;
$rls$;

GRANT SELECT ON public.t3a_d1_approval_audit_finding TO authenticated;
GRANT SELECT ON public.t3a_d1_approval_refusal_log TO authenticated;

-- ---------------------------------------------------------------------
-- 2. AX-09 / AX-11 — annotate the three originals, each for what it is
-- ---------------------------------------------------------------------

-- The two carry-forwards. identity_assertion_passed is false: these are
-- exactly the rows CS-I-44 failed and CS-I-45 withdrew. Recording them as
-- carried with a failed assertion is the true history; leaving them
-- unannotated made the view claim they were freshly given.
INSERT INTO public.t3a_d1_source_approval_provenance
  (source_approval_id, carry_forward_basis, carried_from_version_id,
   identity_assertion_passed)
SELECT a.source_approval_id,
       'CORR_003_SHEET_RELOAD_CARRY_FORWARD',
       prev.content_version_id,
       false
  FROM public.t3a_d1_source_approval a
  JOIN public.t3a_content_object co
    ON co.content_object_id = a.source_id
  JOIN public.t3a_d1_content_version cur
    ON cur.content_version_id = a.source_version_id
   AND cur.superseded_by IS NULL
  JOIN public.t3a_d1_content_version prev
    ON prev.superseded_by = cur.content_version_id
 WHERE co.identifier IN ('SRC-D1-S1-010', 'SRC-D1-S2-010')
   AND a.status = 'approved'
   AND NOT EXISTS (SELECT 1 FROM public.t3a_d1_source_approval_provenance p
                    WHERE p.source_approval_id = a.source_approval_id)
ON CONFLICT DO NOTHING;

-- The unaccounted one. Not a carry-forward, so it gets no provenance row
-- and no basis — it gets a finding.
INSERT INTO public.t3a_d1_approval_audit_finding
  (source_approval_id, finding, established, recorded_by)
SELECT a.source_approval_id,
       'unaccounted',
       jsonb_build_object(
         'source_identifier', co.identifier,
         'source_version_id', a.source_version_id,
         'approved_at', a.approved_at,
         'recorded_approver', a.approved_by,
         'carry_forward_basis', null,
         'writing_process', 'cannot be identified',
         'what_was_checked',
           'No migration in supabase/migrations writes an approval row for this version; '
           || 'no trigger on t3a_d1_source_approval or t3a_d1_content_version writes one; '
           || 'scripts/seed-e2e-fixtures.mjs does not write approvals. The row postdates '
           || '20261039000000, the CORR-003 carry-forward, which copies approved_at from the '
           || 'superseded row and so cannot produce this timestamp.',
         'why_it_does_not_block',
           'A withdrawal was recorded against it at 2026-09-25 20:09:14 and the Section 5 '
           || 'approval stands on top of that withdrawal under AX-03, so the finding is '
           || 'independent of whether the version is servable.'),
       'AX-11, migration 20261049000000'
  FROM public.t3a_d1_source_approval a
  JOIN public.t3a_content_object co
    ON co.content_object_id = a.source_id
  JOIN public.t3a_d1_content_version cur
    ON cur.content_version_id = a.source_version_id
   AND cur.superseded_by IS NULL
 WHERE co.identifier = 'SRC-D1-S3-010'
   AND a.status = 'approved'
   AND a.approved_at >= '2026-09-25 20:00:00+00'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 3. AX-01 / AX-12 — the standing view carries the finding, and one
--    definition of standing is published as a function
-- ---------------------------------------------------------------------

CREATE OR REPLACE VIEW public.t3a_d1_source_approval_standing AS
  SELECT DISTINCT ON (a.source_version_id)
         a.source_approval_id,
         a.source_id,
         a.source_version_id,
         a.status,
         a.approved_by,
         a.approved_at,
         (p.source_approval_id IS NOT NULL) AS was_carried_forward,
         p.carry_forward_basis,
         p.carried_from_version_id,
         p.identity_assertion_passed,
         (f.approval_audit_finding_id IS NOT NULL) AS is_unaccounted
  FROM public.t3a_d1_source_approval a
  LEFT JOIN public.t3a_d1_source_approval_provenance p
    ON p.source_approval_id = a.source_approval_id
  LEFT JOIN public.t3a_d1_approval_audit_finding f
    ON f.source_approval_id = a.source_approval_id
   AND f.finding = 'unaccounted'
  ORDER BY a.source_version_id, a.approved_at DESC, a.source_approval_id DESC;

COMMENT ON VIEW public.t3a_d1_source_approval_standing IS
  'The STANDING approval for each source version: the latest status, never merely the existence of an approved row, because a withdrawal cannot delete the approval it withdraws. This ORDER BY is the ONE definition of current standing in the schema (AX-01) — t3a_d1_version_standing_status, t3a_d1_source_version_approved and the insert check all read it here rather than restating it, so enforcement and the read cannot disagree. Carries was_carried_forward with its basis and CS-I-44 result, and is_unaccounted where an AX-11 audit finding stands against the row.';

-- AX-01. The single definition, published so the check and the reads use
-- the same one. It is deliberately a SELECT from the view: no second
-- ORDER BY exists anywhere for the enforcement to drift away from.
CREATE OR REPLACE FUNCTION public.t3a_d1_version_standing_status(p_version_id uuid)
RETURNS text LANGUAGE sql STABLE AS $fn$
  SELECT s.status
    FROM public.t3a_d1_source_approval_standing s
   WHERE s.source_version_id = p_version_id;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_version_standing_status(uuid) IS
  'AX-01. The current standing status of a source version, or NULL where the version holds no approval row at all. The one definition: reads t3a_d1_source_approval_standing rather than restating its ordering.';

GRANT EXECUTE ON FUNCTION public.t3a_d1_version_standing_status(uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- 4. AX-02 / AX-03 / AX-04 — the replacement check
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_source_approval_one_standing_check()
RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE
  v_standing text;
BEGIN
  IF NEW.status <> 'approved' THEN
    RETURN NEW;  -- AX-06: withdrawal behavior is untouched
  END IF;

  -- AX-04. The lock comes BEFORE the read, or the read and the insert are
  -- not atomic for this version and two concurrent approvals both see
  -- "not approved". Scoped to the version, so approvals of different
  -- versions never wait on each other.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(NEW.source_id::text || ':' || NEW.source_version_id::text, 0));

  v_standing := public.t3a_d1_version_standing_status(NEW.source_version_id);

  -- AX-03. NULL (no prior row) qualifies. 'withdrawn' qualifies. Any
  -- other status the table may hold is left with the meaning it already
  -- has: only 'approved' blocks.
  IF v_standing = 'approved' THEN
    RAISE EXCEPTION 'SOURCE_VERSION_ALREADY_APPROVED: % holds a standing approval; a second approval of the same version is a double approval, which stays forbidden. Record a withdrawal first.', NEW.source_version_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_source_approval_one_standing_check() IS
  'AX-02. At most one STANDING approval per source version. Replaces the partial unique index t3a_d1_source_approval_one_standing, which enforced one approved row per version EVER — stricter than its own stated intent, and it refused every re-approval after a withdrawal.';

-- ---------------------------------------------------------------------
-- 5. AX-07 — assert the whole table, then swap, in one transaction
-- ---------------------------------------------------------------------

DO $swap$
DECLARE
  v_versions        integer;
  v_standing_rows   integer;
  v_cur_approved    integer;
  v_cur_withdrawn   integer;
BEGIN
  -- The invariant across the WHOLE table, current versions and superseded
  -- alike: every version that holds any approval row resolves to exactly
  -- one standing approval. If the two counts differ, "latest" is not
  -- well defined somewhere and nothing may be dropped.
  SELECT count(DISTINCT source_version_id) INTO v_versions
    FROM public.t3a_d1_source_approval;
  SELECT count(*) INTO v_standing_rows
    FROM public.t3a_d1_source_approval_standing;

  IF v_versions <> v_standing_rows THEN
    RAISE EXCEPTION 'AX_07_INVARIANT_NOT_ESTABLISHED: % versions hold approval rows but the standing view resolves %; a version with two standing approvals must be settled before the index is dropped',
      v_versions, v_standing_rows;
  END IF;

  -- And the figures Section 4A states for CURRENT versions specifically.
  -- A whole-table count is larger — the original forty approvals still
  -- sit on the versions CORR-003 superseded — and that is not a failure.
  SELECT count(*) FILTER (WHERE s.status = 'approved'),
         count(*) FILTER (WHERE s.status = 'withdrawn')
    INTO v_cur_approved, v_cur_withdrawn
    FROM public.t3a_d1_source_approval_standing s
    JOIN public.t3a_d1_content_version cv
      ON cv.content_version_id = s.source_version_id
     AND cv.superseded_by IS NULL;

  IF v_cur_approved <> 37 OR v_cur_withdrawn <> 3 THEN
    RAISE EXCEPTION 'AX_07_PRECONDITION_MOVED: expected 37 standing approved and 3 standing withdrawn across current versions, found % and %',
      v_cur_approved, v_cur_withdrawn;
  END IF;

  -- The swap. Both statements, in this block, in this transaction: there
  -- is no moment at which neither the index nor the check is in force.
  EXECUTE 'DROP INDEX IF EXISTS public.t3a_d1_source_approval_one_standing';

  EXECUTE 'DROP TRIGGER IF EXISTS t3a_d1_source_approval_one_standing_trg
             ON public.t3a_d1_source_approval';
  EXECUTE 'CREATE TRIGGER t3a_d1_source_approval_one_standing_trg
             BEFORE INSERT ON public.t3a_d1_source_approval
             FOR EACH ROW
             EXECUTE FUNCTION public.t3a_d1_source_approval_one_standing_check()';
END;
$swap$;

-- ---------------------------------------------------------------------
-- 6. AX-08 — route every read of "the approval for a version" through
--    standing. Both raw reads found are fixed here.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_record_source_approval(
  p_source_id         uuid,
  p_source_version_id uuid,
  p_status            text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_actor    uuid := auth.uid();
  v_body     jsonb;
  v_object   uuid;
  v_standing text;
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

  SELECT body, content_object_id INTO v_body, v_object
    FROM public.t3a_d1_content_version
   WHERE content_version_id = p_source_version_id;

  IF v_body IS NULL THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'SOURCE_VERSION_NOT_FOUND');
  END IF;

  -- The object and the version must be the same source. Retained
  -- verbatim: this file replaces the route, and a replacement that drops
  -- a check is a regression dressed as a fix.
  IF v_object IS DISTINCT FROM p_source_id THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'VERSION_DOES_NOT_BELONG_TO_THIS_SOURCE');
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

  -- AX-04. Lock before reading standing, on the same key the trigger
  -- uses, so the route and the backstop serialize against each other
  -- rather than each against itself.
  IF p_status = 'approved' THEN
    PERFORM pg_advisory_xact_lock(
      hashtextextended(p_source_id::text || ':' || p_source_version_id::text, 0));

    -- AX-08. This was an EXISTS on status = 'approved', which refused any
    -- re-approval of a withdrawn version — the same defect as the index,
    -- in the route. It now asks what is STANDING.
    v_standing := public.t3a_d1_version_standing_status(p_source_version_id);

    IF v_standing = 'approved' THEN
      -- AX-03: refused AND logged. This row commits because the function
      -- returns rather than raising.
      INSERT INTO public.t3a_d1_approval_refusal_log
        (source_id, source_version_id, attempted_status, refusal_code,
         standing_at_refusal, attempted_by)
      VALUES (p_source_id, p_source_version_id, p_status,
              'SOURCE_VERSION_ALREADY_APPROVED', v_standing, v_actor);

      RETURN jsonb_build_object('recorded', false,
        'refusal_code', 'SOURCE_VERSION_ALREADY_APPROVED',
        'remedy', 'The version holds a standing approval. Record a withdrawal before approving it again; the withdrawal stays in the history.');
    END IF;
  END IF;

  INSERT INTO public.t3a_d1_source_approval
    (source_id, source_version_id, status, approved_by, approved_at)
  VALUES (p_source_id, p_source_version_id, p_status, v_actor, now());

  RETURN jsonb_build_object('recorded', true,
    'status', p_status,
    'approved_by', v_actor);
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_record_source_approval(uuid, uuid, text) IS
  'The only route by which a REC-07 approval is written. AX-03 and AX-08: an approved row is admitted only where the version''s CURRENT STANDING is not approved, which is what lets a withdrawn version be approved again on the same version. A refused attempt is logged to t3a_d1_approval_refusal_log.';

CREATE OR REPLACE FUNCTION public.t3a_d1_serving_readiness()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  WITH standing AS (
    SELECT co.content_object_id,
           cv.content_version_id,
           coalesce(btrim(cv.body ->> 'source_version_hash'), '') <> '' AS has_hash
    FROM public.t3a_content_object co
    JOIN public.t3a_d1_content_version cv
      ON cv.content_object_id = co.content_object_id
     AND cv.superseded_by IS NULL
    WHERE co.family = 'source'::public.t3a_content_family
  ),
  servable AS (
    SELECT s.content_object_id
    FROM standing s
    WHERE s.has_hash
      -- AX-08. This was an EXISTS on status = 'approved', so all three
      -- withdrawn sources counted as servable and blocked_on read null
      -- while the register read three unservable. Standing settles it.
      AND public.t3a_d1_version_standing_status(s.content_version_id) = 'approved'
  )
  SELECT jsonb_build_object(
    'sources_loaded',
      (SELECT count(*) FROM standing),
    'versions_carrying_a_hash',
      (SELECT count(*) FROM standing WHERE has_hash),
    -- AX-08. A raw count of approved rows is not a count of approvals.
    -- After Section 5 three versions hold two approved rows each, so the
    -- raw count reads 43 where 40 sources are approved.
    'sources_approved',
      (SELECT count(DISTINCT s.source_id)
         FROM public.t3a_d1_source_approval_standing s
         JOIN public.t3a_d1_content_version cv
           ON cv.content_version_id = s.source_version_id
          AND cv.superseded_by IS NULL
        WHERE s.status = 'approved'),
    'sources_servable',
      (SELECT count(*) FROM servable),
    'any_source_servable',
      (SELECT count(*) > 0 FROM servable),
    'blocked_on',
      CASE
        WHEN (SELECT count(*) FROM servable) > 0 THEN NULL
        WHEN (SELECT count(*) FROM standing) = 0
          THEN 'No source is loaded.'
        WHEN (SELECT count(*) FROM standing WHERE has_hash) = 0
          THEN 'No standing version carries a source-version hash, so no approval can name an exact text.'
        ELSE 'No standing version holds a REC-07 approval. That is a governance act by a person with standing; it is not recorded by a build, and no build may record one.'
      END,
    -- Named so a caller can tell "approved, but the text moved underneath
    -- it" from "never approved". A superseded version's approval does not
    -- carry forward, and this is where that shows. Counted by standing:
    -- an approval already withdrawn on a superseded version is not an
    -- approval whose text moved out from under it.
    'approved_but_superseded',
      (SELECT count(*) FROM public.t3a_d1_source_approval_standing s
        JOIN public.t3a_d1_content_version cv
          ON cv.content_version_id = s.source_version_id
       WHERE s.status = 'approved' AND cv.superseded_by IS NOT NULL));
$fn$;

GRANT EXECUTE ON FUNCTION public.t3a_d1_serving_readiness() TO authenticated;
