-- =====================================================================
-- CORR-006 Section 4 — CX-08, CX-11, CX-14: the deterministic delivery
-- engine, its capture, and the proof that it cannot generate
--
-- WHY THE ENGINE IS IN THE DATABASE.
--
-- CX-14 requires proof that the engine "makes no network call to any
-- language-model endpoint". Measured before choosing where to build it:
--
--     installed extensions   pg_stat_statements, pgcrypto, plpgsql,
--                            supabase_vault, uuid-ossp
--     HTTP-capable functions none — no pg_net, no http, no net.http_post,
--                            no schema named net or http
--
-- So a function in this database CANNOT reach a language model. Not "does
-- not" — cannot. In the browser the same engine could, and CX-14 would be
-- satisfied only by reading the code and trusting the reading. The engine
-- therefore renders here and the client displays what it is given, and the
-- guard at the end refuses a run where the deployed code stops matching the
-- code hash the run cites.
--
-- WHAT MEASURING THE SOURCES FOUND, AND IT MATTERS MORE THAN THE ENGINE.
--
-- The obvious way to find the reveals is every line matching '- **Rn**'.
-- On SRC-D1-S1-001 that returns SEVEN bullets for a source with FOUR
-- reveals. Bullets five to seven come from a capture-binding table
-- elsewhere in the sheet, flattened into the same shape. The seventh reads:
--
--     - **R4** Q-D1-08a/08bNOT SERVEDNo bearing interest—
--
-- That is what a participant would have been shown as their final reveal.
-- Not a crash, not a blank screen: a plausible-looking prompt made of
-- governance metadata, in the middle of an assessment. The parse is
-- therefore scoped to the '**Reveal sequence**' section — from that heading
-- to the next bold heading on its own line — and scoped parsing returns
-- 4,3,3,4,4,3,3,3,3,4 across the ten, contiguous R1..Rn every time.
--
-- The engine also REFUSES rather than renders where the parse is not clean:
-- a missing section, a gap in the numbering, a duplicate ordinal. A
-- participant-facing screen is the last place to recover from ambiguity by
-- guessing.
--
-- WHAT THE ENGINE DOES NOT DO. It generates nothing. Every situation and
-- every reveal it returns is a SUBSTRING of the served source version, and
-- the proof asserts byte-identity by searching for each rendered part in
-- the stored text. The only words it adds are Annex A's, read from the
-- loaded T3A-S1-DELIVERY-SPEC-001 rather than written here. It evaluates
-- nothing, summarizes nothing and selects no determination: there is no
-- code path in it that writes to any determination, statement or capture
-- table.
-- =====================================================================

set search_path = public;

-- ---------------------------------------------------------------------
-- 1. Reading one section out of a source's verbatim text
--
-- Takes the text after a bold heading line and stops at the next bold
-- heading on its own line. Returns NULL where the heading is absent, so a
-- caller must decide what that means rather than receiving an empty string
-- that looks like a section with nothing in it.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_s1_section(p_verbatim text, p_heading text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $fn$
DECLARE
  v_at   int;
  v_tail text;
  v_next text;
  v_cut  int;
BEGIN
  IF p_verbatim IS NULL THEN RETURN NULL; END IF;

  v_at := position(p_heading in p_verbatim);
  IF v_at = 0 THEN RETURN NULL; END IF;

  v_tail := substring(p_verbatim from v_at + length(p_heading));

  -- The next bold heading that is alone on its line. '[^*\n]+' keeps it
  -- from matching inline bold inside a paragraph.
  SELECT m[1] INTO v_next FROM regexp_matches(v_tail, '\n(\*\*[^*\n]+\*\*)\n', 'n') AS x(m);

  IF v_next IS NULL THEN
    RETURN btrim(v_tail);
  END IF;

  v_cut := position(E'\n' || v_next || E'\n' in v_tail);
  RETURN btrim(left(v_tail, v_cut - 1));
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_s1_section(text, text) IS
  'Returns the text of one bold-headed section of a source''s verbatim body, stopping at the next bold heading alone on its line. NULL where the heading is absent — never an empty string, because "the section is missing" and "the section is empty" call for different refusals.';

-- ---------------------------------------------------------------------
-- 2. The reveal sequence, scoped and checked
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_s1_reveals(p_verbatim text)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $fn$
DECLARE
  v_sect text;
  v_rows jsonb := '[]'::jsonb;
  r      record;
  v_n    int := 0;
BEGIN
  v_sect := public.t3a_d1_s1_section(p_verbatim, '**Reveal sequence**');

  IF v_sect IS NULL THEN
    RETURN jsonb_build_object('readable', false,
      'refusal_code', 'SOURCE_HAS_NO_REVEAL_SEQUENCE',
      'why', 'the source''s verbatim text carries no "**Reveal sequence**" section');
  END IF;

  -- Each bullet runs until the next bullet or the end of the section, so a
  -- reveal wrapped over several lines stays whole.
  FOR r IN
    SELECT (regexp_match(bullet, '^- \*\*R([0-9]+)\*\*'))[1]::int AS ordinal,
           bullet
      FROM regexp_split_to_table(v_sect, '\n(?=- \*\*R[0-9]+\*\*)') AS bullet
     WHERE bullet ~ '^- \*\*R[0-9]+\*\*'
  LOOP
    v_n := v_n + 1;
    IF r.ordinal <> v_n THEN
      RETURN jsonb_build_object('readable', false,
        'refusal_code', 'REVEAL_SEQUENCE_NOT_CONTIGUOUS',
        'why', format('reveal %s of the section is labelled R%s; the sequence must run R1 upward with no gap and no repeat', v_n, r.ordinal));
    END IF;

    v_rows := v_rows || jsonb_build_object(
      'ordinal', r.ordinal,
      'label', 'R' || r.ordinal,
      -- The bullet exactly as it stands in the source, marker and all, so
      -- byte-identity is checkable against the stored text.
      'verbatim', btrim(r.bullet, E' \n'),
      'verbatim_hash', encode(sha256(convert_to(btrim(r.bullet, E' \n'), 'UTF8')), 'hex'));
  END LOOP;

  IF v_n = 0 THEN
    RETURN jsonb_build_object('readable', false,
      'refusal_code', 'REVEAL_SEQUENCE_IS_EMPTY',
      'why', 'the "**Reveal sequence**" section holds no R-numbered bullet');
  END IF;

  RETURN jsonb_build_object('readable', true, 'count', v_n, 'reveals', v_rows);
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_s1_reveals(text) IS
  'The reveal sequence of one source, SCOPED to its "**Reveal sequence**" section. Scoping is the whole point: an unscoped search for "- **Rn**" returns seven bullets on SRC-D1-S1-001, three of them flattened rows of a capture-binding table, one of which reads "- **R4** Q-D1-08a/08bNOT SERVEDNo bearing interest—". Refuses on a missing section, an empty section, or a numbering that is not contiguous from R1 — a participant-facing screen does not recover from ambiguity by guessing.';

-- ---------------------------------------------------------------------
-- 3. The render
--
-- CX-11: one specification serves all ten. There is no per-source prompt
-- and nothing here reads a source-specific rule. The only added words come
-- from the loaded Annex A object.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_s1_render(p_source_version_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_ident   text;
  v_body    jsonb;
  v_spec    jsonb;
  v_window  jsonb;
  v_sit     text;
  v_rev     jsonb;
  v_minutes int;
  v_opening text;
BEGIN
  SELECT co.identifier, cv.body INTO v_ident, v_body
    FROM public.t3a_d1_content_version cv
    JOIN public.t3a_content_object co ON co.content_object_id = cv.content_object_id
   WHERE cv.content_version_id = p_source_version_id;

  IF v_body IS NULL THEN
    RETURN jsonb_build_object('renderable', false, 'refusal_code', 'SOURCE_VERSION_NOT_FOUND');
  END IF;

  -- AC-B3a. A source with no issued window, or one that disagrees, is not
  -- rendered at all: the opening states a time limit, and stating one the
  -- run will not honour is worse than refusing.
  v_window := public.t3a_d1_s1_window_check(v_ident);
  IF NOT (v_window ->> 'agrees')::boolean THEN
    RETURN jsonb_build_object('renderable', false,
      'refusal_code', v_window ->> 'refusal_code', 'window', v_window);
  END IF;

  SELECT cv.body INTO v_spec
    FROM public.t3a_content_object co
    JOIN public.t3a_d1_content_version cv
      ON cv.content_object_id = co.content_object_id AND cv.superseded_by IS NULL
   WHERE co.identifier = 'T3A-S1-DELIVERY-SPEC-001';

  IF v_spec IS NULL THEN
    RETURN jsonb_build_object('renderable', false,
      'refusal_code', 'DELIVERY_SPECIFICATION_NOT_LOADED',
      'remedy', 'Annex A loads as T3A-S1-DELIVERY-SPEC-001. The engine adds no words of its own, so with the specification absent it has none to add.');
  END IF;

  v_sit := public.t3a_d1_s1_section(v_body ->> 'verbatim',
                                    '**The situation, as the participant meets it**');
  IF v_sit IS NULL OR v_sit = '' THEN
    RETURN jsonb_build_object('renderable', false,
      'refusal_code', 'SOURCE_HAS_NO_SITUATION_TEXT');
  END IF;

  v_rev := public.t3a_d1_s1_reveals(v_body ->> 'verbatim');
  IF NOT (v_rev ->> 'readable')::boolean THEN
    RETURN jsonb_build_object('renderable', false,
      'refusal_code', v_rev ->> 'refusal_code', 'why', v_rev ->> 'why');
  END IF;

  -- {max_minutes} is a record-bound value, filled from the issued window.
  -- Annex A: "the source's max_seconds divided by sixty, rounded down."
  v_minutes := (v_window ->> 'max_seconds')::int / 60;
  v_opening := replace(v_spec ->> 'opening', '{max_minutes}', v_minutes::text);

  RETURN jsonb_build_object(
    'renderable', true,
    'source_identifier', v_ident,
    'source_version_id', p_source_version_id,
    'source_version_hash', v_body ->> 'source_version_hash',
    'min_seconds', (v_window ->> 'min_seconds')::int,
    'max_seconds', (v_window ->> 'max_seconds')::int,
    'max_minutes', v_minutes,

    -- The words the engine adds, and where each came from. The opening is
    -- given BOTH as issued and as filled, so the one substitution the
    -- engine performs is auditable rather than asserted.
    'framing', jsonb_build_object(
      'from', 'T3A-S1-DELIVERY-SPEC-001',
      'opening_as_issued', v_spec ->> 'opening',
      'opening', v_opening,
      'substitution', jsonb_build_object('{max_minutes}', v_minutes::text),
      'closing', v_spec ->> 'closing',
      'support_line', v_spec ->> 'support_line'),

    -- Everything below is a substring of the served source version.
    'situation', jsonb_build_object(
      'from', v_ident,
      'verbatim', v_sit,
      'verbatim_hash', encode(sha256(convert_to(v_sit, 'UTF8')), 'hex')),
    'reveal_count', (v_rev ->> 'count')::int,
    'reveals', v_rev -> 'reveals');
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_s1_render(uuid) IS
  'CX-08 and CX-11. The ordered Stage 1 delivery for one source version: Annex A''s opening, the source''s situation text, its reveals in order, Annex A''s closing and support line. One specification serves all ten and nothing here reads a per-source rule. Every situation and reveal it returns is a SUBSTRING of the served source version; the only words added are Annex A''s, read from the loaded object. The single substitution — {max_minutes} — is returned alongside the issued text so it can be audited rather than trusted. Refuses by name rather than rendering something it is unsure of.';

GRANT EXECUTE ON FUNCTION
  public.t3a_d1_s1_section(text, text),
  public.t3a_d1_s1_reveals(text),
  public.t3a_d1_s1_render(uuid)
TO authenticated;

-- ---------------------------------------------------------------------
-- 4. Capture — one row per reveal, per run
--
-- AC-B10 wants a timestamp for every reveal; AC-B5 distinguishes a reveal
-- shown but unanswered ("no response") from one never reached ("never
-- asked"); DS-2 forbids editing or recalling a submitted response. None of
-- that had anywhere to live: the run table held one rendered_body and no
-- per-reveal record at all.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_d1_s1_reveal_response (
  reveal_response_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_administration_run_id uuid NOT NULL
    REFERENCES public.t3a_d1_ai_administration_run(ai_administration_run_id),
  reveal_ordinal           integer NOT NULL CHECK (reveal_ordinal >= 1),
  reveal_label             text NOT NULL,
  -- Binds the response to the EXACT wording the participant was shown. If
  -- the source is corrected later, the old response still says which text
  -- it answered.
  reveal_verbatim_hash     text NOT NULL,
  shown_at                 timestamptz NOT NULL,
  submitted_at             timestamptz,
  response_text            text,
  outcome                  text NOT NULL
    CHECK (outcome IN ('submitted', 'no response', 'never asked')),
  UNIQUE (ai_administration_run_id, reveal_ordinal)
);

COMMENT ON TABLE public.t3a_d1_s1_reveal_response IS
  'AC-B5, AC-B8, AC-B10, DS-2. One row per reveal per run: when it was shown, what was submitted, exactly as typed, and which of the three outcomes it reached. A submitted response is never edited or recalled — the trigger refuses it. response_text is unbounded text; the ceiling at one million characters refuses visibly rather than truncating, per AC-B8.';

COMMENT ON COLUMN public.t3a_d1_s1_reveal_response.outcome IS
  'AC-B5. "submitted" — a response was given. "no response" — the reveal was shown and not answered. "never asked" — the reveal was never reached. The distinction is the confirmer''s to read and is not inferrable from a null response_text alone.';

ALTER TABLE public.t3a_d1_s1_reveal_response ENABLE ROW LEVEL SECURITY;

-- A participant may read their own responses. There is no insert or update
-- policy: the two routes below are the only way in.
DROP POLICY IF EXISTS t3a_d1_s1_reveal_response_read ON public.t3a_d1_s1_reveal_response;
CREATE POLICY t3a_d1_s1_reveal_response_read
  ON public.t3a_d1_s1_reveal_response FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.t3a_d1_ai_administration_run r
                  WHERE r.ai_administration_run_id = ai_administration_run_id
                    AND r.participant_id = auth.uid())
         OR public.t3a_has_administrative_standing());

CREATE OR REPLACE FUNCTION public.t3a_d1_s1_reveal_response_rules()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'S1_REVEAL_RESPONSE_APPEND_ONLY: a response is never removed. AC-B5 records a reveal that went unanswered as "no response"; it does not delete the row.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- DS-2. "A submitted response cannot be edited or recalled. Later
    -- reveals change what the participant knows, and the account-test
    -- reveal depends on the earlier account standing as given."
    IF OLD.outcome = 'submitted' THEN
      RAISE EXCEPTION 'S1_RESPONSE_ALREADY_SUBMITTED: % of this run is answered and cannot be edited or recalled. The account-test reveal depends on the earlier account standing as given.', OLD.reveal_label
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.ai_administration_run_id IS DISTINCT FROM OLD.ai_administration_run_id
       OR NEW.reveal_ordinal       IS DISTINCT FROM OLD.reveal_ordinal
       OR NEW.reveal_label         IS DISTINCT FROM OLD.reveal_label
       OR NEW.reveal_verbatim_hash IS DISTINCT FROM OLD.reveal_verbatim_hash
       OR NEW.shown_at             IS DISTINCT FROM OLD.shown_at THEN
      RAISE EXCEPTION 'S1_REVEAL_IDENTITY_IS_FIXED: which reveal this is, which wording was shown and when, are settled when it is shown.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- AC-B8. No content limit is imposed on the participant. This ceiling
  -- exists because something must, it exceeds any plausible response by
  -- orders of magnitude, and reaching it refuses VISIBLY rather than
  -- silently truncating what someone wrote.
  IF NEW.response_text IS NOT NULL AND length(NEW.response_text) > 1000000 THEN
    RAISE EXCEPTION 'S1_RESPONSE_EXCEEDS_TECHNICAL_CEILING: the response is % characters. Nothing was saved and nothing was shortened — AC-B8 refuses visibly rather than truncating.', length(NEW.response_text)
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.outcome = 'submitted' AND coalesce(NEW.response_text, '') = '' THEN
    RAISE EXCEPTION 'S1_SUBMITTED_WITH_NO_TEXT: an outcome of submitted needs a response. A reveal shown and left unanswered is "no response".'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_d1_s1_reveal_response_rules_trg ON public.t3a_d1_s1_reveal_response;
CREATE TRIGGER t3a_d1_s1_reveal_response_rules_trg
  BEFORE INSERT OR UPDATE OR DELETE ON public.t3a_d1_s1_reveal_response
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_s1_reveal_response_rules();

-- ---------------------------------------------------------------------
-- 5. The two write routes
--
-- Showing a reveal and answering it are separate acts with separate
-- timestamps, so they are separate routes. Both check that the caller is
-- the run's own participant, server-side.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_s1_reveal_shown(
  p_run_id  uuid,
  p_ordinal integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_participant uuid;
  v_version     uuid;
  v_render      jsonb;
  v_reveal      jsonb;
BEGIN
  SELECT r.participant_id, r.source_version_id INTO v_participant, v_version
    FROM public.t3a_d1_ai_administration_run r
   WHERE r.ai_administration_run_id = p_run_id;

  IF v_participant IS NULL THEN
    RETURN jsonb_build_object('recorded', false, 'refusal_code', 'RUN_NOT_FOUND');
  END IF;
  IF v_participant IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('recorded', false, 'refusal_code', 'NOT_THIS_PARTICIPANTS_RUN');
  END IF;

  v_render := public.t3a_d1_s1_render(v_version);
  IF NOT (v_render ->> 'renderable')::boolean THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', v_render ->> 'refusal_code');
  END IF;

  SELECT x INTO v_reveal
    FROM jsonb_array_elements(v_render -> 'reveals') x
   WHERE (x ->> 'ordinal')::int = p_ordinal;

  IF v_reveal IS NULL THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'NO_SUCH_REVEAL_IN_THIS_SOURCE',
      'reveal_count', v_render -> 'reveal_count');
  END IF;

  -- AC-B2: the sequence is fixed. A reveal cannot be shown before the one
  -- before it has been shown, because DS-2's account test depends on the
  -- earlier account already standing as given.
  IF p_ordinal > 1
     AND NOT EXISTS (SELECT 1 FROM public.t3a_d1_s1_reveal_response
                      WHERE ai_administration_run_id = p_run_id
                        AND reveal_ordinal = p_ordinal - 1) THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'REVEALS_ARE_SHOWN_IN_ORDER',
      'remedy', format('R%s has not been shown yet. AC-B2 fixes the sequence.', p_ordinal - 1));
  END IF;

  INSERT INTO public.t3a_d1_s1_reveal_response
    (ai_administration_run_id, reveal_ordinal, reveal_label,
     reveal_verbatim_hash, shown_at, outcome)
  VALUES (p_run_id, p_ordinal, v_reveal ->> 'label',
          v_reveal ->> 'verbatim_hash', now(), 'no response')
  ON CONFLICT (ai_administration_run_id, reveal_ordinal) DO NOTHING;

  RETURN jsonb_build_object('recorded', true,
    'reveal_label', v_reveal ->> 'label',
    'verbatim', v_reveal ->> 'verbatim');
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_s1_reveal_shown(uuid, integer) IS
  'Records that a reveal was shown, at the moment it was shown (AC-B10), with the hash of the exact wording shown. Starts at outcome "no response" — AC-B5''s state for a reveal shown and not answered — so the record is honest from the instant it exists rather than after a later write. Refuses out-of-order showing: AC-B2 fixes the sequence and DS-2''s account test depends on it.';

CREATE OR REPLACE FUNCTION public.t3a_d1_s1_reveal_submit(
  p_run_id  uuid,
  p_ordinal integer,
  p_response text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_participant uuid;
  v_outcome     text;
BEGIN
  SELECT r.participant_id INTO v_participant
    FROM public.t3a_d1_ai_administration_run r
   WHERE r.ai_administration_run_id = p_run_id;

  IF v_participant IS NULL THEN
    RETURN jsonb_build_object('recorded', false, 'refusal_code', 'RUN_NOT_FOUND');
  END IF;
  IF v_participant IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('recorded', false, 'refusal_code', 'NOT_THIS_PARTICIPANTS_RUN');
  END IF;

  SELECT outcome INTO v_outcome FROM public.t3a_d1_s1_reveal_response
   WHERE ai_administration_run_id = p_run_id AND reveal_ordinal = p_ordinal;

  IF v_outcome IS NULL THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'REVEAL_NOT_SHOWN_YET',
      'remedy', 'A response is to something the participant has been shown. Record the reveal as shown first.');
  END IF;

  IF v_outcome = 'submitted' THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'RESPONSE_ALREADY_SUBMITTED',
      'remedy', 'DS-2: a submitted response cannot be edited or recalled.');
  END IF;

  IF coalesce(btrim(p_response), '') = '' THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'RESPONSE_IS_EMPTY',
      'remedy', 'Nothing was recorded. A reveal left unanswered stays "no response" rather than becoming an empty submission.');
  END IF;

  -- Stored EXACTLY as typed. Not trimmed, not normalized, not collapsed:
  -- the emptiness check above reads a trimmed copy and stores the original.
  UPDATE public.t3a_d1_s1_reveal_response
     SET response_text = p_response,
         submitted_at  = now(),
         outcome       = 'submitted'
   WHERE ai_administration_run_id = p_run_id AND reveal_ordinal = p_ordinal;

  RETURN jsonb_build_object('recorded', true, 'outcome', 'submitted');
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_s1_reveal_submit(uuid, integer, text) IS
  'AC-B8 and DS-2. Records a response EXACTLY as typed — the blank check reads a trimmed copy and stores the original, so leading and trailing whitespace a participant wrote survives. Refuses a second submission by name: a submitted response cannot be edited or recalled.';

GRANT EXECUTE ON FUNCTION
  public.t3a_d1_s1_reveal_shown(uuid, integer),
  public.t3a_d1_s1_reveal_submit(uuid, integer, text)
TO authenticated;

-- ---------------------------------------------------------------------
-- 6. CX-08 / CX-10 — the engine as a versioned object, with a code hash
--
-- The hash is computed from pg_get_functiondef over the engine's own
-- functions, so it describes THE CODE THAT IS DEPLOYED rather than the code
-- someone meant to deploy. That also makes it checkable later, which
-- section 7 does.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_s1_engine_functions()
RETURNS text[] LANGUAGE sql IMMUTABLE AS $fn$
  SELECT ARRAY[
    'public.t3a_d1_s1_section(text,text)',
    'public.t3a_d1_s1_reveals(text)',
    'public.t3a_d1_s1_render(uuid)',
    'public.t3a_d1_s1_reveal_shown(uuid,integer)',
    'public.t3a_d1_s1_reveal_submit(uuid,integer,text)'
  ];
$fn$;

COMMENT ON FUNCTION public.t3a_d1_s1_engine_functions() IS
  'CX-08. Exactly which functions ARE the delivery engine. Held in one place so the code hash, the drift guard and any later audit agree on what is being hashed.';

CREATE OR REPLACE FUNCTION public.t3a_d1_s1_engine_code_hash()
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_sig  text;
  v_all  text := '';
BEGIN
  FOREACH v_sig IN ARRAY public.t3a_d1_s1_engine_functions() LOOP
    v_all := v_all || pg_get_functiondef(v_sig::regprocedure) || E'\n';
  END LOOP;
  RETURN encode(sha256(convert_to(v_all, 'UTF8')), 'hex');
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_s1_engine_code_hash() IS
  'CX-08. The sha256 of the deployed definitions of the engine''s functions, read live from the catalogue. A code hash taken from a file describes what was written; this describes what is running.';

GRANT EXECUTE ON FUNCTION
  public.t3a_d1_s1_engine_functions(),
  public.t3a_d1_s1_engine_code_hash()
TO authenticated;

DO $engine$
DECLARE
  v_obj  uuid;
  v_hash text := public.t3a_d1_s1_engine_code_hash();
BEGIN
  SELECT content_object_id INTO v_obj FROM public.t3a_content_object
   WHERE identifier = 'T3A-S1-DELIVERY-ENGINE-001';

  IF v_obj IS NULL THEN
    INSERT INTO public.t3a_content_object (identifier, family, title, dimension_id)
    VALUES ('T3A-S1-DELIVERY-ENGINE-001',
            'ai_administration_ruleset'::public.t3a_content_family,
            'Stage 1 Deterministic Delivery Engine', 'D1')
    RETURNING content_object_id INTO v_obj;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.t3a_d1_content_version
                  WHERE content_object_id = v_obj AND superseded_by IS NULL) THEN
    INSERT INTO public.t3a_d1_content_version (content_object_id, version_no, body)
    VALUES (v_obj, 1, jsonb_build_object(
      'source_identifier', 'T3A-S1-DELIVERY-ENGINE-001',
      'title', 'Stage 1 Deterministic Delivery Engine',
      'engine_version', '1.0.0',
      'built_under', 'T3A-D1-EXEC-CORR-006 Section 4.2, CX-08',
      'code_hash', v_hash,
      -- The run table's hash requirement reads source_version_hash. The
      -- engine's identity IS its code, so the two are the same value rather
      -- than a second hash of something else.
      'source_version_hash', v_hash,
      'engine_functions', to_jsonb(public.t3a_d1_s1_engine_functions()),
      'generates', false,
      'calls_a_language_model', false,
      'why_not', 'This database has no HTTP-capable extension or function — no pg_net, no http, no '
              || 'schema named net or http — so a function in it cannot reach a language-model '
              || 'endpoint. That is why the engine renders here rather than in the browser, where '
              || 'CX-14 could only be satisfied by reading the code and trusting the reading.',
      'evaluates', false,
      'summarizes', false,
      'selects_a_determination', false));
  ELSE
    -- A rebuild refreshes the hash rather than leaving a stale one: a code
    -- hash that no longer describes the code is worse than none.
    UPDATE public.t3a_d1_content_version
       SET body = body || jsonb_build_object('code_hash', v_hash, 'source_version_hash', v_hash)
     WHERE content_object_id = v_obj AND superseded_by IS NULL
       AND body ->> 'code_hash' IS DISTINCT FROM v_hash;
  END IF;
END;
$engine$;

-- CX-10: the fourth slot now names an object.
UPDATE public.t3a_d1_s1_provenance_slot
   SET issued_identifier = 'T3A-S1-DELIVERY-ENGINE-001'
 WHERE slot_column = 'model_ref_version_id';

-- ---------------------------------------------------------------------
-- 7. The code hash must keep describing the code
--
-- Without this, model_ref is a hash written once that silently stops
-- matching the engine the moment a later migration replaces one of its
-- functions — and a run would cite provenance for code that is not running.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_s1_engine_hash_current()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_live       text := public.t3a_d1_s1_engine_code_hash();
  v_registered text;
BEGIN
  SELECT cv.body ->> 'code_hash' INTO v_registered
    FROM public.t3a_content_object co
    JOIN public.t3a_d1_content_version cv
      ON cv.content_object_id = co.content_object_id AND cv.superseded_by IS NULL
   WHERE co.identifier = 'T3A-S1-DELIVERY-ENGINE-001';

  RETURN jsonb_build_object(
    'current', v_registered IS NOT NULL AND v_registered = v_live,
    'live_code_hash', v_live,
    'registered_code_hash', v_registered,
    'refusal_code', CASE WHEN v_registered IS NULL THEN 'ENGINE_NOT_REGISTERED'
                         WHEN v_registered <> v_live THEN 'ENGINE_CODE_HASH_STALE'
                         ELSE NULL END,
    'remedy', CASE WHEN v_registered IS DISTINCT FROM v_live
                   THEN 'The deployed engine differs from the code hash a run would cite. Supersede the engine object with the hash of the code that is running.'
                   ELSE NULL END);
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_s1_engine_hash_current() IS
  'CX-08. Whether the registered model reference still describes the deployed engine. A code hash written once and never checked is a claim about the past.';

GRANT EXECUTE ON FUNCTION public.t3a_d1_s1_engine_hash_current() TO authenticated;

CREATE OR REPLACE FUNCTION public.t3a_d1_s1_run_engine_hash_agrees()
RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE
  v_ident text;
  v_state jsonb;
BEGIN
  SELECT co.identifier INTO v_ident
    FROM public.t3a_d1_content_version cv
    JOIN public.t3a_content_object co ON co.content_object_id = cv.content_object_id
   WHERE cv.content_version_id = NEW.model_ref_version_id;

  -- A demonstration run cites the synthetic model reference and is governed
  -- by the synthetic bar, not by this.
  IF v_ident IS DISTINCT FROM 'T3A-S1-DELIVERY-ENGINE-001' THEN
    RETURN NEW;
  END IF;

  v_state := public.t3a_d1_s1_engine_hash_current();
  IF NOT (v_state ->> 'current')::boolean THEN
    RAISE EXCEPTION 'S1_RUN_CITES_STALE_ENGINE_HASH: % — the run would record provenance for code that is not the code running. %',
      v_state ->> 'refusal_code', v_state::text
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_d1_s1_run_engine_hash_agrees_trg
  ON public.t3a_d1_ai_administration_run;
CREATE TRIGGER t3a_d1_s1_run_engine_hash_agrees_trg
  BEFORE INSERT ON public.t3a_d1_ai_administration_run
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_s1_run_engine_hash_agrees();

-- ---------------------------------------------------------------------
-- 8. The evidence, and what is still not built
-- ---------------------------------------------------------------------

INSERT INTO public.t3a_d1_correction_test
  (correction_test_id, instrument, test_name, fixture, required_result,
   restated_by, supersedes_fixture, why_restated)
VALUES
  ('CX-14-NO-GENERATION', 'T3A-D1-EXEC-CORR-006 Section 4.2, CX-14',
   'The engine cannot call a language model, and every rendered situation and reveal is byte-identical to the served source',
   'All ten Stage 1 production sources at their standing versions, plus the catalogue itself for the '
   || 'network half.',
   'No HTTP-capable extension and no HTTP-capable function exist in the database, and no engine '
   || 'function names one. Every situation and every reveal the engine returns is found by position() '
   || 'inside the stored verbatim text of its own source version, and none carries governance '
   || 'metadata. The engine refuses by name on a missing reveal section, an empty one, and a gap in '
   || 'the numbering.',
   'CX-14', NULL,
   'The network half is proved from the catalogue rather than from reading the code, because "cannot" '
   || 'is a stronger claim than "does not" and the catalogue is what makes it true. This is also why '
   || 'the engine renders in the database rather than in the browser.')
ON CONFLICT (correction_test_id) DO UPDATE SET
  instrument = EXCLUDED.instrument, test_name = EXCLUDED.test_name,
  fixture = EXCLUDED.fixture, required_result = EXCLUDED.required_result,
  restated_by = EXCLUDED.restated_by, supersedes_fixture = EXCLUDED.supersedes_fixture,
  why_restated = EXCLUDED.why_restated;

INSERT INTO public.t3a_d1_correction_test_outcome
  (correction_test_id, outcome, actual_result, build_version, tester, conflict_note)
VALUES
  ('CX-14-NO-GENERATION', 'pass',
   'scripts/proofs/s1-engine-proof.sql, self-aborting: httpCapableExtensions=0 '
   || 'httpCapableFunctions=0 engineCodeNamesAnEndpoint=NO sourcesRendered=10 revealsChecked=34 '
   || 'byteIdentity=ALL_VERBATIM unscopedWouldFind=7 scopedFinds=4 '
   || 'gapInNumbering=REVEAL_SEQUENCE_NOT_CONTIGUOUS '
   || 'noRevealSection=SOURCE_HAS_NO_REVEAL_SEQUENCE emptySection=REVEAL_SEQUENCE_IS_EMPTY '
   || 'engineHash=CURRENT provenance=ALL_FOUR_PRESENT.',
   '20261077000000', 'Claude Code, automated, non-production environment',
   'unscopedWouldFind=7 against scopedFinds=4 is in the proof deliberately: it is the defect the '
   || 'engine does not have, measured rather than described.');

INSERT INTO public.t3a_d1_build_conflict_register
  (entry_id, opened_by, scope, classification, status, blocked_on, note)
VALUES
  ('CORR-006/CX-08/unscoped-reveal-parse-would-have-shown-metadata',
   'CORR-006 Section 4, measured while building the engine',
   'How the engine finds a source''s reveals',
   'defect caught before it was built, not after — nothing was ever shown to anyone',
   'closed',
   NULL,
   'THE OBVIOUS PARSE IS WRONG AND LOOKS RIGHT. Finding the reveals by every line matching '
   || '''- **Rn**'' returns SEVEN bullets on SRC-D1-S1-001, a source with FOUR reveals. Bullets five '
   || 'to seven are rows of a capture-binding table elsewhere in the sheet, flattened into the same '
   || 'shape. The seventh reads, in full: "- **R4** Q-D1-08a/08bNOT SERVEDNo bearing interest—". '
   || 'THAT IS WHAT A PARTICIPANT WOULD HAVE MET as their final reveal — not a crash and not a blank '
   || 'screen, but a plausible-looking prompt made of governance metadata, in the middle of an '
   || 'assessment, on the reveal that tests their account. '
   || 'FOUND BY COUNTING BEFORE CODING: the bullet count per source came back 7,5,3,8,8,7,6,7,8,8 for '
   || 'ten sources whose reveal sequences are short, and the numbers did not look like reveal counts. '
   || 'CORRECTED BY SCOPING the parse to the "**Reveal sequence**" section, from that heading to the '
   || 'next bold heading alone on its line. Scoped, the ten return 4,3,3,4,4,3,3,3,3,4 — contiguous '
   || 'R1 upward every time. The engine also refuses rather than renders on a missing section, an '
   || 'empty section or a gap in the numbering, and the proof asserts no rendered reveal matches '
   || '"NOT SERVED", "bearing interest" or "Q-D1-nn".'),

  ('CORR-006/CX-13/no-participant-screen-yet',
   'CORR-006 Section 4',
   'Whether Stage 1 can be put in front of a participant',
   'stated so the engine is not mistaken for a working screen',
   'open',
   'Developer: build the Stage 1 participant screen under CX-13, rendering the Stop control and the '
   || 'persistent support line from Annexes A and C rather than from code.',
   'The engine renders and the capture records, both proved. NOTHING RENDERS TO A PARTICIPANT YET: '
   || 'there is no Stage 1 participant screen, so CX-13''s Stop control and persistent support line '
   || 'exist as loaded configuration and not as anything anyone can see or press. '
   || 'SAID PLAINLY BECAUSE THE PROVENANCE NOW READS COMPLETE. All four slots name a loaded object, '
   || 'which is what CX-12 asks for, and a reader could take that as "Stage 1 works". It means the '
   || 'content a run would cite exists. Activation remains separately gated, and the screen is not '
   || 'built.')
ON CONFLICT (entry_id) DO UPDATE SET
  opened_by = EXCLUDED.opened_by, scope = EXCLUDED.scope,
  classification = EXCLUDED.classification, status = EXCLUDED.status,
  blocked_on = EXCLUDED.blocked_on, note = EXCLUDED.note;
