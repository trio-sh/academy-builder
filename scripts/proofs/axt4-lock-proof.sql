-- AX-T4 under CORR-006 CX-03 to CX-05. SELF-ABORTING: run it and read the
-- result from the error message. Nothing it creates survives.
--
-- Run:  bash q.sh < scripts/proofs/axt4-lock-proof.sql
--
-- WHY A SCRIPT AND NOT A MIGRATION. The test must ABORT to undo the
-- synthetic fixture and the trigger swap, and an aborted transaction
-- cannot also write its own outcome row. The migration records the
-- outcome; this file produces it.
--
-- TWO THINGS THE FIRST DRAFT OF THIS FILE GOT WRONG, both worth keeping:
--
--  1. It used now() for every approved_at. Inside one transaction now()
--     is CONSTANT, so all three rows shared a timestamp — and the standing
--     view breaks ties with `ORDER BY approved_at DESC, source_approval_id
--     DESC`, a RANDOM uuid. Standing was therefore decided by uuid order
--     and the second approval was allowed. The fixture now uses distinct
--     explicit timestamps. The tie-break itself is a latent defect and is
--     recorded separately.
--  2. It "removed" the lock by renaming the call, which made the function
--     raise for a missing function rather than run without a lock — so the
--     refusal it observed proved nothing. It now replaces
--     `PERFORM pg_advisory_xact_lock(` with `PERFORM (`, which is valid
--     PL/pgSQL and genuinely lock-free.
set search_path = public;

DO $seq$
DECLARE
  v_obj uuid; v_ver uuid; v_out text := ''; v_r text; v_orig text; v_t0 timestamptz;
BEGIN
  v_t0 := now() - interval '1 hour';

  -- Synthetic content, deliberately NOT family='source'. Nothing here
  -- persists, but the habit is right: every count the instrument asks me
  -- to report filters on that family.
  INSERT INTO public.t3a_content_object (identifier, family, title, dimension_id)
  VALUES ('SYNTHETIC_TEST_ONLY-AXT4-LOCK-PROBE', 'configuration'::public.t3a_content_family,
          'AX-T4 lock probe, aborted transaction only', 'D1')
  RETURNING content_object_id INTO v_obj;

  INSERT INTO public.t3a_d1_content_version (content_object_id, version_no, body)
  VALUES (v_obj, 1, jsonb_build_object('synthetic_test_only', true, 'not_for_production', true,
          'source_version_hash', encode(sha256('axt4-probe'::bytea), 'hex')))
  RETURNING content_version_id INTO v_ver;

  -- CL-35's fixture: the version starts WITHDRAWN.
  INSERT INTO public.t3a_d1_source_approval (source_id, source_version_id, status, approved_by, approved_at)
  VALUES (v_obj, v_ver, 'withdrawn', gen_random_uuid(), v_t0);

  -- AX-T4-SEQ, with the lock in force.
  BEGIN
    INSERT INTO public.t3a_d1_source_approval (source_id, source_version_id, status, approved_by, approved_at)
    VALUES (v_obj, v_ver, 'approved', gen_random_uuid(), v_t0 + interval '1 minute');
    v_r := 'SUCCEEDED';
  EXCEPTION WHEN others THEN v_r := 'REFUSED'; END;
  v_out := v_out || 'locked/first=' || v_r || ' ';

  BEGIN
    INSERT INTO public.t3a_d1_source_approval (source_id, source_version_id, status, approved_by, approved_at)
    VALUES (v_obj, v_ver, 'approved', gen_random_uuid(), v_t0 + interval '2 minutes');
    v_r := 'SUCCEEDED';
  EXCEPTION WHEN others THEN v_r := 'REFUSED'; END;
  v_out := v_out || 'locked/second=' || v_r || ' ';

  -- CX-05 negative control: genuinely lock-free, same logic otherwise.
  SELECT p.prosrc INTO v_orig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname='public' AND p.proname='t3a_d1_source_approval_one_standing_check';

  EXECUTE format('CREATE OR REPLACE FUNCTION public.t3a_d1_source_approval_one_standing_check() '
                 || 'RETURNS trigger LANGUAGE plpgsql AS %L',
                 replace(v_orig, 'PERFORM pg_advisory_xact_lock(', 'PERFORM ('));

  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
              WHERE n.nspname='public' AND p.proname='t3a_d1_source_approval_one_standing_check'
                AND p.prosrc LIKE '%pg_advisory_xact_lock%') THEN
    RAISE EXCEPTION 'CX_05_SETUP_FAILED: the lock is still present, so the negative control proves nothing.';
  END IF;

  -- Withdraw first so the third attempt is the same shape as the first.
  INSERT INTO public.t3a_d1_source_approval (source_id, source_version_id, status, approved_by, approved_at)
  VALUES (v_obj, v_ver, 'withdrawn', gen_random_uuid(), v_t0 + interval '3 minutes');

  BEGIN
    INSERT INTO public.t3a_d1_source_approval (source_id, source_version_id, status, approved_by, approved_at)
    VALUES (v_obj, v_ver, 'approved', gen_random_uuid(), v_t0 + interval '4 minutes');
    v_r := 'SUCCEEDED';
  EXCEPTION WHEN others THEN v_r := 'REFUSED'; END;
  v_out := v_out || 'unlocked/afterWithdraw=' || v_r || ' ';

  BEGIN
    INSERT INTO public.t3a_d1_source_approval (source_id, source_version_id, status, approved_by, approved_at)
    VALUES (v_obj, v_ver, 'approved', gen_random_uuid(), v_t0 + interval '5 minutes');
    v_r := 'SUCCEEDED';
  EXCEPTION WHEN others THEN v_r := 'REFUSED'; END;
  v_out := v_out || 'unlocked/second=' || v_r;

  -- Raising is what undoes the fixture AND the trigger swap.
  RAISE EXCEPTION 'AXT4_RESULT %', v_out;
END;
$seq$;
