-- =====================================================================
-- T3A-D1-EXEC-001 §5.5 and AC-11 — a missing state is field metadata
--
-- "Missing states are recorded through a SEPARATE PER-QUESTION ACTION as
--  field metadata. They are never options in the substantive answer
--  list." (§3.2)
--
-- "Recorded as field metadata, using the eight codes only, never
--  selectable as a substantive answer." (AC-11)
--
-- Found while executing §11: the enum t3a_missing_state holds exactly
-- the eight codes, and NO COLUMN ANYWHERE IN THE SCHEMA USES IT. A
-- missing state had nowhere to be recorded except inside
-- t3a_d1_s1_determination.selection — which is the substantive answer,
-- and is the one place §5.5 and AC-11 say it must never be.
--
-- Nothing prevented the two codes §5.5 forbids at commit either. The
-- register holds eight codes; only six may be applied when a
-- determination is captured, because "not applicable" and "not yet
-- observed" describe a dimension before observation rather than a field
-- within one. That distinction lived in a document and in one screen's
-- option list. It lives here now.
--
-- Three rules, and each is a constraint rather than a convention:
--
--   1. A missing state is its own column, typed by the enum, so only the
--      eight codes can ever be written and a ninth is unrepresentable.
--   2. Of the eight, the two §5.5 forbids at commit are refused.
--   3. A determination carries a substantive answer OR a missing state,
--      never both and never neither — which is AC-10's condition for
--      commit, enforced per row rather than checked at the end.
--
-- And a fourth that closes the smuggling route: a missing-state code
-- appearing inside the substantive selection is refused, because a
-- controlled column is no use if the same value can be typed into the
-- answer beside it.
-- =====================================================================

ALTER TABLE public.t3a_d1_s1_determination
  ADD COLUMN IF NOT EXISTS missing_state public.t3a_missing_state;

-- Rule 2 — §5.5's two, refused at the row.
ALTER TABLE public.t3a_d1_s1_determination
  DROP CONSTRAINT IF EXISTS t3a_d1_s1_determination_missing_state_applicable;
ALTER TABLE public.t3a_d1_s1_determination
  ADD CONSTRAINT t3a_d1_s1_determination_missing_state_applicable
  CHECK (missing_state IS NULL
         OR missing_state NOT IN ('not_applicable', 'not_yet_observed'));

-- Rule 3 — one or the other, and one of them.
--
-- "Commit disabled or refuses and logs until a substantive answer or
-- valid missing state exists" (AC-10). A row that carries neither is the
-- unresolved item that must not commit, so it cannot be written at all.
ALTER TABLE public.t3a_d1_s1_determination
  DROP CONSTRAINT IF EXISTS t3a_d1_s1_determination_answer_xor_missing;
ALTER TABLE public.t3a_d1_s1_determination
  ADD CONSTRAINT t3a_d1_s1_determination_answer_xor_missing
  CHECK (
    (selection IS NOT NULL AND selection <> 'null'::jsonb
     AND selection <> '{}'::jsonb AND missing_state IS NULL)
    OR
    (missing_state IS NOT NULL
     AND (selection IS NULL OR selection = 'null'::jsonb OR selection = '{}'::jsonb))
  );

-- Rule 4 — the smuggling route.
--
-- A missing state written into the substantive answer would satisfy
-- every constraint above while doing exactly what §5.5 forbids: putting
-- "declined" in the answer list. The codes are checked against the enum
-- itself rather than a copied list, so adding a ninth code to the
-- register extends this guard with it.
CREATE OR REPLACE FUNCTION public.t3a_d1_selection_holds_no_missing_state()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $fn$
DECLARE
  v_code text;
BEGIN
  IF NEW.selection IS NULL THEN RETURN NEW; END IF;

  FOR v_code IN
    SELECT e.enumlabel FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 't3a_missing_state'
  LOOP
    IF NEW.selection::text ILIKE '%' || v_code || '%'
       OR NEW.selection::text ILIKE '%' || replace(v_code, '_', ' ') || '%' THEN
      RAISE EXCEPTION 'MISSING_STATE_IS_NOT_A_SUBSTANTIVE_ANSWER: % belongs in missing_state, not in the selection', v_code
        USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_d1_selection_holds_no_missing_state_trg
  ON public.t3a_d1_s1_determination;
CREATE TRIGGER t3a_d1_selection_holds_no_missing_state_trg
  BEFORE INSERT OR UPDATE ON public.t3a_d1_s1_determination
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_selection_holds_no_missing_state();

-- ---------------------------------------------------------------------
-- What may be applied, stated as data rather than as a comment
-- ---------------------------------------------------------------------

-- The eight codes with the two that may never be applied at commit
-- marked as such, so a caller can ask rather than infer. The screens
-- already offer six; this is what they should be reading.
CREATE OR REPLACE FUNCTION public.t3a_d1_missing_states()
RETURNS TABLE (code text, applicable_at_commit boolean, reason text)
LANGUAGE sql STABLE SET search_path = public AS $fn$
  SELECT e.enumlabel::text,
         e.enumlabel NOT IN ('not_applicable', 'not_yet_observed'),
         CASE e.enumlabel
           WHEN 'not_applicable' THEN 'Inapplicability is expressed by non-service under the branch rules, never by a code applied to a served field'
           WHEN 'not_yet_observed' THEN 'Describes a dimension before observation, not a field within one'
           ELSE NULL
         END
  FROM pg_enum e
  JOIN pg_type t ON t.oid = e.enumtypid
  WHERE t.typname = 't3a_missing_state'
  ORDER BY e.enumsortorder;
$fn$;

GRANT EXECUTE ON FUNCTION public.t3a_d1_missing_states() TO anon, authenticated;

-- ---------------------------------------------------------------------
-- The constraint that made the answer the only place to put it
-- ---------------------------------------------------------------------

-- selection was NOT NULL. A determination therefore could not exist
-- without a substantive answer, so a mentor with nothing to record had
-- exactly two options: invent an answer, or write the missing state into
-- the selection. §5.5 forbids the second and the first is worse.
--
-- The XOR constraint above now carries the requirement properly: a row
-- holds an answer or a missing state, and a row holding neither is still
-- refused. Dropping NOT NULL does not loosen anything — it moves the
-- requirement from "there must be a selection" to "there must be one of
-- the two", which is what AC-10 actually says.
ALTER TABLE public.t3a_d1_s1_determination
  ALTER COLUMN selection DROP NOT NULL;
