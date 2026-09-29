-- CORR-006 CX-18. SELF-ABORTING: read the result from the error message.
-- Nothing below commits — an approval is a governance act and a build may
-- not record one, so every approval attempted here happens inside a
-- transaction that aborts by design.
--
-- WHY THE ROUTE AND NOT JUST THE TRIGGER. Standing Rule 6: a refusal is
-- proved by requesting the route directly. So the four named refusals are
-- taken from t3a_d1_record_source_approval itself, called as a person with
-- administrative standing, and the fifth — the backstop — is taken by
-- writing to the table behind the route's back.
--
-- HOW THE DEFERRED GATE IS PROVED AT ALL. The basis references the
-- approval, so the check has to be a DEFERRABLE INITIALLY DEFERRED
-- constraint trigger and fires at commit. A commit is the one thing this
-- proof must not do, so it fires the pending event with
-- SET CONSTRAINTS ALL IMMEDIATE inside a sub-block instead. Without that
-- line the insert reads as accepted and the gate looks absent.
set search_path = public;

DO $p$
DECLARE
  v_out   text := '';
  v_r     text;
  v_res   jsonb;
  v_obj   uuid;
  v_ver   uuid;
  v_appr  uuid;
  v_holder uuid;
  v_w_obj uuid;
  v_w_ver uuid;
  v_n     int;
BEGIN
  SELECT h.holder_id INTO v_holder
    FROM public.t3a_oversight_holder h WHERE h.revoked_at IS NULL LIMIT 1;
  IF v_holder IS NULL THEN
    RAISE EXCEPTION 'CX18_NO_SUBJECT: no oversight holder exists, so the route cannot be requested as a person with standing.';
  END IF;

  -- (1) A withdrawal carries no basis and must still be accepted. Taken
  -- against a real Stage 1 source, whose version stands approved.
  SELECT co.content_object_id, cv.content_version_id INTO v_w_obj, v_w_ver
    FROM public.t3a_content_object co
    JOIN public.t3a_d1_content_version cv
      ON cv.content_object_id = co.content_object_id AND cv.superseded_by IS NULL
   WHERE co.identifier = 'SRC-D1-S1-002';
  IF v_w_ver IS NULL THEN
    RAISE EXCEPTION 'CX18_NO_SUBJECT: SRC-D1-S1-002 has no standing version.';
  END IF;

  -- The approval tests run against a SYNTHETIC Stage 1 source, and the
  -- reason is not convenience. The route stamps approved_at with now(),
  -- which is constant inside one transaction, and the AX-T4 guard added
  -- under CORR-006 Section 2 refuses two rows at one instant on the same
  -- version. So the one writing approval this transaction can make has to
  -- be on a version that holds no row yet. A synthetic Stage 1 identifier
  -- also keeps CX-24's Stage 4 assessment gate out of the way, so that
  -- whatever refuses below is the basis rule and not a different rule.
  INSERT INTO public.t3a_content_object (identifier, family, title, dimension_id)
  VALUES ('SRC-D1-S1-998', 'source'::public.t3a_content_family,
          'SYNTHETIC — aborted transaction only', 'D1')
  RETURNING content_object_id INTO v_obj;
  INSERT INTO public.t3a_d1_content_version (content_object_id, version_no, body)
  VALUES (v_obj, 1, jsonb_build_object('synthetic_test_only', true,
          'source_version_hash', encode(sha256('s1-998'::bytea), 'hex')))
  RETURNING content_version_id INTO v_ver;

  -- Only now act as someone who actually holds administrative standing,
  -- rather than as a superuser the route would refuse for having no
  -- auth.uid(). The fixtures above are written first because
  -- t3a_content_object refuses an authenticated writer, correctly.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_holder::text, 'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);

  IF NOT public.t3a_has_administrative_standing() THEN
    RAISE EXCEPTION 'CX18_NO_STANDING: impersonation did not take; the refusals below would all read APPROVER_LACKS_STANDING and prove nothing.';
  END IF;

  v_res := public.t3a_d1_record_source_approval(v_w_obj, v_w_ver, 'withdrawn');
  v_out := v_out || 'withdrawalUngated='
        || CASE WHEN (v_res ->> 'recorded')::boolean THEN 'ACCEPTED'
                ELSE 'REFUSED(' || coalesce(v_res ->> 'refusal_code', '?') || ')' END || ' ';

  -- (2) An approval with no basis at all.
  v_res := public.t3a_d1_record_source_approval(v_obj, v_ver, 'approved');
  v_out := v_out || 'noBasis=' || coalesce(v_res ->> 'refusal_code', 'ACCEPTED') || ' ';

  -- (3) A basis outside the closed list.
  v_res := public.t3a_d1_record_source_approval(v_obj, v_ver, 'approved',
             'FOUNDER_REAPPROVAL_REC07_REAPP_001_ISSUE_2');
  v_out := v_out || 'outsideList=' || coalesce(v_res ->> 'refusal_code', 'ACCEPTED') || ' ';

  -- (4) A basis that names a document, with no document named.
  v_res := public.t3a_d1_record_source_approval(v_obj, v_ver, 'approved',
             'REVIEWED_DURING_AUTHORING_OF_ISSUED_DOCUMENT');
  v_out := v_out || 'missingIdentifier=' || coalesce(v_res ->> 'refusal_code', 'ACCEPTED') || ' ';

  -- (5) A basis that names nothing, with a document named.
  v_res := public.t3a_d1_record_source_approval(v_obj, v_ver, 'approved',
             'READ_IN_FULL_IN_THIS_SCREEN', 'T3A-D1-EXEC-001');
  v_out := v_out || 'surplusIdentifier=' || coalesce(v_res ->> 'refusal_code', 'ACCEPTED') || ' ';

  -- (6) The correct shape is accepted, and the basis lands in the basis
  -- table keyed to the new approval — not in the approval row.
  v_res := public.t3a_d1_record_source_approval(v_obj, v_ver, 'approved',
             'READ_IN_FULL_IN_THIS_SCREEN');
  v_out := v_out || 'wellFormed='
        || CASE WHEN (v_res ->> 'recorded')::boolean THEN 'ACCEPTED'
                ELSE 'REFUSED(' || coalesce(v_res ->> 'refusal_code', '?') || ')' END || ' ';

  SELECT b.source_approval_id INTO v_appr
    FROM public.t3a_d1_approval_basis b
    JOIN public.t3a_d1_source_approval a ON a.source_approval_id = b.source_approval_id
   WHERE a.source_version_id = v_ver AND b.basis_kind = 'READ_IN_FULL_IN_THIS_SCREEN';
  v_out := v_out || 'basisRowWritten='
        || CASE WHEN v_appr IS NULL THEN 'NO' ELSE 'YES' END || ' ';

  -- (7a) An authenticated caller cannot edit a basis at all: the table has
  -- a read policy and no write policy, so the UPDATE matches nothing.
  --
  -- THIS IS TESTED SEPARATELY FROM (7b) BECAUSE THE FIRST DRAFT CONFLATED
  -- THEM AND READ "ACCEPTED". Under RLS the UPDATE touched zero rows, so
  -- the append-only trigger never fired and nothing raised — which looks
  -- identical to the edit succeeding. A row count is the only thing that
  -- tells those two apart.
  UPDATE public.t3a_d1_approval_basis
     SET referenced_identifier = 'T3A-D1-EXEC-001'
   WHERE source_approval_id = v_appr;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_out := v_out || 'basisEditByCaller='
        || CASE WHEN v_n = 0 THEN 'NO_ROWS_VISIBLE_TO_WRITE' ELSE 'EDITED_' || v_n || '_ROWS' END || ' ';

  PERFORM set_config('role', 'postgres', true);

  -- (7b) And a writer that CAN see the row is refused by name.
  BEGIN
    UPDATE public.t3a_d1_approval_basis
       SET referenced_identifier = 'T3A-D1-EXEC-001'
     WHERE source_approval_id = v_appr;
    v_r := 'ACCEPTED_' || (SELECT count(*)::text FROM public.t3a_d1_approval_basis
                            WHERE source_approval_id = v_appr
                              AND referenced_identifier = 'T3A-D1-EXEC-001');
  EXCEPTION WHEN others THEN
    v_r := CASE WHEN SQLERRM LIKE 'APPROVAL_BASIS_APPEND_ONLY%'
                THEN 'REFUSED_BY_NAME' ELSE 'REFUSED_OTHER(' || left(SQLERRM, 50) || ')' END;
  END;
  v_out := v_out || 'basisAppendOnly=' || v_r || ' ';

  -- (8) The backstop. Write an approved row straight to the table, past
  -- the route, and fire the deferred event without committing.
  BEGIN
    INSERT INTO public.t3a_d1_source_approval
      (source_id, source_version_id, status, approved_by, approved_at)
    VALUES (v_obj, v_ver, 'withdrawn', v_holder, now() + interval '1 minute');
    INSERT INTO public.t3a_d1_source_approval
      (source_id, source_version_id, status, approved_by, approved_at)
    VALUES (v_obj, v_ver, 'approved', v_holder, now() + interval '2 minutes');
    SET CONSTRAINTS ALL IMMEDIATE;
    v_r := 'ACCEPTED';
  EXCEPTION WHEN others THEN
    v_r := CASE WHEN SQLERRM LIKE 'APPROVAL_RECORDS_NO_BASIS%'
                THEN 'REFUSED_BY_NAME' ELSE 'REFUSED_OTHER(' || left(SQLERRM, 60) || ')' END;
  END;
  v_out := v_out || 'directInsertNoBasis=' || v_r;

  RAISE EXCEPTION 'CX18_RESULT %', v_out;
END;
$p$;
