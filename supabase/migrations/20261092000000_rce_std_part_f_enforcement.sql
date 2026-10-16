-- T3A-RCE-STD-001 v9.11 Part F enforcement layer.
--
-- This migration carries the four doctrine machines Tony flagged for
-- follow-on after the face port (#312):
--
--   1. Standing Defects Register (§47) — a durable table recording the
--      five v9.11 defects with their classification, section breached,
--      and immediate use disposition. Any later defect is recorded by
--      t3a_rce_record_defect.
--
--   2. Controlled Text Register (§57 / Table 61.3) — one row per
--      controlled text, one row per sealed version with its sha256
--      digest. Validation at render time refuses with
--      controlled_text_divergence if the sealed digest does not match a
--      live recomputation.
--
--   3. Prohibited Vocabulary (§34 / Part D) — one row per prohibited
--      word per dimension per version. Seeded with the twenty D1 words
--      from PV-D1-1.0. Scanned at compose and render time; a word on
--      the list refuses the serve with prohibited_vocabulary_hit.
--
--   4. Pilot Authorization (§51 / Table 51.2) — a durable table of
--      granted authorizations. A pilot render refuses without an
--      authorization; an issued or demonstration render refuses with
--      one.
--
--   5. Use Dispositions (§47.4 / Table 60.4) — a column on
--      t3a_d1_statement_library carrying build_only /
--      calibration_restricted / consequential_use_suspended /
--      production. Enforced at serve time: issued mode refuses
--      anything but production; pilot refuses calibration_restricted
--      and consequential_use_suspended.
--
-- Everything the standard calls for in Table 53.1 (output eligibility
-- against release state) and Table 51.1 (manifest invariants) is folded
-- into t3a_rce_render_check, which the client calls before serving.
--
-- Nothing in this migration alters an existing entry. The frozen D1
-- library stays frozen; the defects are held with dispositions, exactly
-- as §47.3 requires.

-- =========================================================================
-- 1. STANDING DEFECTS REGISTER
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.t3a_rce_standing_defect (
  defect_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  defect_serial        integer NOT NULL UNIQUE,
  entry_or_item        text NOT NULL,
  dimension_id         text,
  defect_description   text NOT NULL,
  classification       text NOT NULL
    CHECK (classification IN ('correction','revision','rescind','maintenance','held')),
  section_breached     text,
  use_disposition      text NOT NULL
    CHECK (use_disposition IN ('build_only','calibration_restricted','consequential_use_suspended','production')),
  recorded_at          timestamptz NOT NULL DEFAULT now(),
  recorded_by          uuid,
  notes                text
);

ALTER TABLE public.t3a_rce_standing_defect ENABLE ROW LEVEL SECURITY;

CREATE POLICY t3a_rce_standing_defect_read
ON public.t3a_rce_standing_defect
FOR SELECT USING (true);

CREATE POLICY t3a_rce_standing_defect_write_admin
ON public.t3a_rce_standing_defect
FOR ALL USING (t3a_is_service_context() OR is_admin())
WITH CHECK (t3a_is_service_context() OR is_admin());

-- Seed the five known v9.11 defects from §47.1.
INSERT INTO public.t3a_rce_standing_defect
  (defect_serial, entry_or_item, dimension_id, defect_description, classification, section_breached, use_disposition, notes)
VALUES
  (1, 'ST-D1-045', 'D1',
   'States a mapping the observer established rather than an act the participant performed',
   'revision', '31.2', 'consequential_use_suspended',
   'A revision changes what the entry asserts. Section 44 forbids retrospective broadening; the entry may not be served until a new controlled version is approved.'),
  (2, 'ST-D1-083', 'D1',
   'Begins with an initial capital where forty two siblings do not',
   'correction', '18.1', 'build_only',
   'Rendering-only defect; the entry may remain in the frozen build but may not enter consequential use until corrected.'),
  (3, 'ST-D1-083b', 'D1',
   'Begins with an initial capital where forty two siblings do not',
   'correction', '18.1', 'build_only', NULL),
  (4, 'Q-D1-04b entry order', 'D1',
   'Entries ordered 044, 045, 047, 046 in the published table',
   'correction', '39', 'build_only',
   'Section 39 check 5 of Table 39.1. Correction limited to rendering.'),
  (5, 'Evidence note wording', NULL,
   'Part C and the sample layout state Stage 1 is administered through an AI system; Book 6 describes Stage 1 as a deterministic delivery engine presenting controlled script beats. The two descriptions are not interchangeable and an employer could read the first as describing functions that are not performed.',
   'held', '29', 'consequential_use_suspended',
   'Held per §47.2 pending a reading of Book 6 against the report face. No evidence-note wording is treated as settled until that reading is done.')
ON CONFLICT (defect_serial) DO NOTHING;

-- =========================================================================
-- 2. CONTROLLED TEXT REGISTER
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.t3a_rce_controlled_text (
  text_id              text NOT NULL,
  version              text NOT NULL,
  body                 jsonb NOT NULL,
  retired              boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (text_id, version)
);

ALTER TABLE public.t3a_rce_controlled_text ENABLE ROW LEVEL SECURITY;

CREATE POLICY t3a_rce_controlled_text_read
ON public.t3a_rce_controlled_text FOR SELECT USING (true);

CREATE POLICY t3a_rce_controlled_text_write_admin
ON public.t3a_rce_controlled_text FOR ALL
USING (t3a_is_service_context() OR is_admin())
WITH CHECK (t3a_is_service_context() OR is_admin());

CREATE TABLE IF NOT EXISTS public.t3a_rce_controlled_text_register (
  version              text PRIMARY KEY,
  sha256_digest        text NOT NULL,
  sealed_at            timestamptz NOT NULL DEFAULT now(),
  sealed_by            uuid,
  note                 text
);

ALTER TABLE public.t3a_rce_controlled_text_register ENABLE ROW LEVEL SECURITY;

CREATE POLICY t3a_rce_ctr_read ON public.t3a_rce_controlled_text_register FOR SELECT USING (true);

CREATE POLICY t3a_rce_ctr_write_admin ON public.t3a_rce_controlled_text_register FOR ALL
USING (t3a_is_service_context() OR is_admin())
WITH CHECK (t3a_is_service_context() OR is_admin());

-- Deterministic digest: sort by text_id, concatenate "id\x1Fbody\x1E", hash.
-- The field separator (0x1F) and record separator (0x1E) are the ASCII
-- control codes designed for exactly this: they cannot appear in a well
-- formed text body or identifier, so there is no ambiguity between the
-- bytes of a text and the delimiter.
CREATE OR REPLACE FUNCTION public.t3a_rce_controlled_text_live_digest(p_version text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
  SELECT encode(
    extensions.digest(
      string_agg(text_id || chr(31) || body::text, chr(30) ORDER BY text_id),
      'sha256'
    ),
    'hex')
  FROM public.t3a_rce_controlled_text
  WHERE version = p_version AND NOT retired;
$$;

-- Seal a version: records the current live digest. The register row is
-- immutable once sealed; later edits to the texts of that version make
-- the live digest diverge from the sealed digest, which the validator
-- reads as controlled_text_divergence.
CREATE OR REPLACE FUNCTION public.t3a_rce_seal_controlled_text_register(p_version text, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_digest text;
BEGIN
  IF NOT (t3a_is_service_context() OR is_admin()) THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'not_authorized');
  END IF;
  v_digest := public.t3a_rce_controlled_text_live_digest(p_version);
  IF v_digest IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'no_texts_at_version');
  END IF;
  INSERT INTO public.t3a_rce_controlled_text_register (version, sha256_digest, sealed_by, note)
  VALUES (p_version, v_digest, auth.uid(), p_note)
  ON CONFLICT (version) DO NOTHING;
  RETURN jsonb_build_object('ok', true, 'version', p_version, 'sha256_digest', v_digest);
END; $$;

-- =========================================================================
-- 3. PROHIBITED VOCABULARY
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.t3a_rce_prohibited_vocabulary (
  dimension_id         text NOT NULL,
  word                 text NOT NULL,
  version              text NOT NULL,
  reason               text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dimension_id, word, version)
);

ALTER TABLE public.t3a_rce_prohibited_vocabulary ENABLE ROW LEVEL SECURITY;

CREATE POLICY t3a_rce_pv_read ON public.t3a_rce_prohibited_vocabulary FOR SELECT USING (true);
CREATE POLICY t3a_rce_pv_write_admin ON public.t3a_rce_prohibited_vocabulary FOR ALL
USING (t3a_is_service_context() OR is_admin())
WITH CHECK (t3a_is_service_context() OR is_admin());

-- Seed PV-D1-1.0 from the v9.11 fixture.
INSERT INTO public.t3a_rce_prohibited_vocabulary (dimension_id, word, version, reason) VALUES
  ('D1','honest',       'PV-D1-1.0','character term; names a trait rather than an act'),
  ('D1','dishonest',    'PV-D1-1.0','character term'),
  ('D1','integrity',    'PV-D1-1.0','character term'),
  ('D1','ethical',      'PV-D1-1.0','character term'),
  ('D1','unethical',    'PV-D1-1.0','character term'),
  ('D1','trustworthy',  'PV-D1-1.0','character term'),
  ('D1','untrustworthy','PV-D1-1.0','character term'),
  ('D1','character',    'PV-D1-1.0','character term'),
  ('D1','principled',   'PV-D1-1.0','character term'),
  ('D1','moral',        'PV-D1-1.0','character term'),
  ('D1','immoral',      'PV-D1-1.0','character term'),
  ('D1','candid',       'PV-D1-1.0','character term'),
  ('D1','transparent',  'PV-D1-1.0','character term'),
  ('D1','deceptive',    'PV-D1-1.0','character term'),
  ('D1','will',         'PV-D1-1.0','future-tendency forecast'),
  ('D1','would',        'PV-D1-1.0','future-tendency forecast'),
  ('D1','tends to',     'PV-D1-1.0','general-tendency statement'),
  ('D1','reliable',     'PV-D1-1.0','character term'),
  ('D1','always',       'PV-D1-1.0','retrospective broadening'),
  ('D1','never',        'PV-D1-1.0','retrospective broadening')
ON CONFLICT DO NOTHING;

-- Scan body against the prohibited list for a dimension at a version.
-- Returns the hit words as a text array. Case insensitive, word
-- boundary aware, so "willing" does not match "will".
CREATE OR REPLACE FUNCTION public.t3a_rce_prohibited_vocabulary_scan(p_body text, p_dimension_id text, p_version text DEFAULT 'PV-D1-1.0')
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(array_agg(word ORDER BY word), ARRAY[]::text[])
  FROM public.t3a_rce_prohibited_vocabulary
  WHERE dimension_id = p_dimension_id AND version = p_version
    AND p_body ~* ('(^|[^[:alnum:]_])' || regexp_replace(word, '([.()^$|[\]\\+?*{}])', '\\\1', 'g') || '([^[:alnum:]_]|$)');
$$;

-- =========================================================================
-- 4. PILOT AUTHORIZATION
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.t3a_rce_pilot_authorization (
  authorization_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  authorized_by        uuid NOT NULL,
  authorization_scope  jsonb NOT NULL DEFAULT '{}'::jsonb,
  granted_at           timestamptz NOT NULL DEFAULT now(),
  expires_at           timestamptz,
  revoked_at           timestamptz,
  note                 text
);

ALTER TABLE public.t3a_rce_pilot_authorization ENABLE ROW LEVEL SECURITY;

CREATE POLICY t3a_rce_pa_read ON public.t3a_rce_pilot_authorization FOR SELECT USING (true);
CREATE POLICY t3a_rce_pa_write_admin ON public.t3a_rce_pilot_authorization FOR ALL
USING (t3a_is_service_context() OR is_admin())
WITH CHECK (t3a_is_service_context() OR is_admin());

CREATE OR REPLACE FUNCTION public.t3a_rce_pilot_authorization_is_live(p_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.t3a_rce_pilot_authorization
    WHERE authorization_id = p_id
      AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- =========================================================================
-- 5. USE DISPOSITION ON ENTRIES
-- =========================================================================

ALTER TABLE public.t3a_d1_statement_library
  ADD COLUMN IF NOT EXISTS use_disposition text NOT NULL DEFAULT 'build_only'
    CHECK (use_disposition IN ('build_only','calibration_restricted','consequential_use_suspended','production'));

-- Apply the standing defects: the two ST-D1-083 corrections are
-- build_only, ST-D1-045 is consequential_use_suspended.
UPDATE public.t3a_d1_statement_library
  SET use_disposition = 'consequential_use_suspended'
  WHERE statement_key = 'ST-D1-045';

-- =========================================================================
-- 6. VALIDATE RENDER
-- =========================================================================
--
-- Applied before any face serve. Returns {ok: true} to proceed, or
-- {ok: false, refusal_code, detail} to refuse the serve.
--
-- p_output_mode is one of 'issued','demonstration','pilot'.
-- p_release_state is one of 'released','draft','in_correction','superseded','withdrawn'
--   and is derived from the BER status for callers that do not pass it.
-- p_pilot_authorization_id is required if and only if the mode is 'pilot'.

CREATE OR REPLACE FUNCTION public.t3a_rce_render_check(
  p_ber_report_id uuid,
  p_output_mode text,
  p_pilot_authorization_id uuid DEFAULT NULL,
  p_controlled_text_version text DEFAULT 'CTR-1.0',
  p_prohibited_vocabulary_version text DEFAULT 'PV-D1-1.0'
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  r public.t3a_d1_ber_report;
  v_release_state text;
  v_live_digest text;
  v_sealed_digest text;
  v_hits text[];
  v_rec record;
  v_bad_disposition text;
BEGIN
  -- Table 51.1 — manifest invariants
  IF p_output_mode NOT IN ('issued','demonstration','pilot') THEN
    RETURN jsonb_build_object('ok', false,
      'refusal_code','render_input_invalid',
      'detail', format('unknown output_mode %L', p_output_mode));
  END IF;

  -- Table 51.2 — pilot authorization condition
  IF p_output_mode = 'pilot' AND p_pilot_authorization_id IS NULL THEN
    RETURN jsonb_build_object('ok', false,
      'refusal_code','output_mode_invalid',
      'detail','pilot output without an authorization');
  END IF;
  IF p_output_mode <> 'pilot' AND p_pilot_authorization_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false,
      'refusal_code','output_mode_invalid',
      'detail', format('%s output carrying a pilot authorization', p_output_mode));
  END IF;
  IF p_output_mode = 'pilot' AND NOT public.t3a_rce_pilot_authorization_is_live(p_pilot_authorization_id) THEN
    RETURN jsonb_build_object('ok', false,
      'refusal_code','pilot_authorization_not_live',
      'detail','authorization is revoked or expired');
  END IF;

  SELECT * INTO r FROM public.t3a_d1_ber_report WHERE ber_report_id = p_ber_report_id;
  IF r.ber_report_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'refusal_code','ber_report_not_found');
  END IF;

  -- Derive release_state from BER status.
  v_release_state := CASE r.status
    WHEN 'issued'          THEN 'released'
    WHEN 'amended'         THEN 'released'
    WHEN 'ready_to_issue'  THEN 'released'
    WHEN 'participant_review' THEN 'draft'
    WHEN 'challenge_open'  THEN 'in_correction'
    WHEN 'withdrawn'       THEN 'withdrawn'
    ELSE 'draft'
  END;

  -- Table 53.1 — output eligibility matrix
  IF v_release_state = 'withdrawn' THEN
    RETURN jsonb_build_object('ok', false,
      'refusal_code','output_mode_ineligible',
      'detail','withdrawn version is not eligible for any serve');
  END IF;
  IF v_release_state IN ('draft','in_correction','superseded') AND p_output_mode <> 'demonstration' THEN
    RETURN jsonb_build_object('ok', false,
      'refusal_code','output_mode_ineligible',
      'detail', format('%s output from a %s version', p_output_mode, v_release_state));
  END IF;

  -- Table 61.3 — controlled text digest check
  v_sealed_digest := (SELECT sha256_digest FROM public.t3a_rce_controlled_text_register WHERE version = p_controlled_text_version);
  IF v_sealed_digest IS NOT NULL THEN
    v_live_digest := public.t3a_rce_controlled_text_live_digest(p_controlled_text_version);
    IF v_live_digest IS DISTINCT FROM v_sealed_digest THEN
      RETURN jsonb_build_object('ok', false,
        'refusal_code','controlled_text_divergence',
        'detail', format('live digest for %s does not match the sealed register', p_controlled_text_version),
        'sealed_digest', v_sealed_digest,
        'live_digest', v_live_digest);
    END IF;
  END IF;

  -- Table 60.4 — use disposition gate on each composed statement
  FOR v_rec IN
    SELECT cs.composed_body, sl.statement_key, sl.use_disposition, o.dimension_id
    FROM public.t3a_d1_composed_statement cs
    JOIN public.t3a_observation_record o ON o.observation_record_id = cs.observation_record_id
    JOIN public.t3a_d1_statement_library sl ON sl.statement_library_id = cs.statement_library_id
    WHERE o.participant_id = r.participant_id
      AND o.dimension_id   = r.dimension_id
      AND o.is_committed
      AND NOT EXISTS (SELECT 1 FROM public.t3a_d1_composed_statement later WHERE later.supersedes = cs.composed_statement_id)
  LOOP
    v_bad_disposition := NULL;
    IF p_output_mode = 'issued' AND v_rec.use_disposition <> 'production' THEN
      v_bad_disposition := v_rec.use_disposition;
    ELSIF p_output_mode = 'pilot' AND v_rec.use_disposition IN ('calibration_restricted','consequential_use_suspended') THEN
      v_bad_disposition := v_rec.use_disposition;
    END IF;
    IF v_bad_disposition IS NOT NULL THEN
      RETURN jsonb_build_object('ok', false,
        'refusal_code','entry_use_disposition_refused',
        'detail', format('entry %s is %s and may not be served under %s',
                          v_rec.statement_key, v_bad_disposition, p_output_mode),
        'entry_id', v_rec.statement_key,
        'use_disposition', v_bad_disposition);
    END IF;

    -- §34 prohibited vocabulary scan on the composed body
    v_hits := public.t3a_rce_prohibited_vocabulary_scan(v_rec.composed_body, v_rec.dimension_id, p_prohibited_vocabulary_version);
    IF cardinality(v_hits) > 0 THEN
      RETURN jsonb_build_object('ok', false,
        'refusal_code','prohibited_vocabulary_hit',
        'detail', format('entry %s carries words forbidden under %s: %s',
                          v_rec.statement_key, p_prohibited_vocabulary_version, array_to_string(v_hits, ', ')),
        'entry_id', v_rec.statement_key,
        'hit_words', v_hits);
    END IF;
  END LOOP;

  RETURN jsonb_build_object('ok', true,
    'release_state', v_release_state,
    'output_mode', p_output_mode,
    'controlled_text_version', p_controlled_text_version,
    'prohibited_vocabulary_version', p_prohibited_vocabulary_version);
END; $$;

-- =========================================================================
-- 7. RECORD DEFECT
-- =========================================================================
CREATE OR REPLACE FUNCTION public.t3a_rce_record_defect(
  p_entry_or_item text,
  p_classification text,
  p_section_breached text,
  p_use_disposition text,
  p_dimension_id text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_next integer;
  v_defect_id uuid;
BEGIN
  IF NOT (t3a_is_service_context() OR is_admin()) THEN
    RETURN jsonb_build_object('ok', false, 'refusal','not_authorized');
  END IF;
  SELECT COALESCE(MAX(defect_serial), 0) + 1 INTO v_next FROM public.t3a_rce_standing_defect;
  INSERT INTO public.t3a_rce_standing_defect
    (defect_serial, entry_or_item, dimension_id, defect_description,
     classification, section_breached, use_disposition, recorded_by, notes)
  VALUES
    (v_next, p_entry_or_item, p_dimension_id, p_description,
     p_classification, p_section_breached, p_use_disposition, auth.uid(), p_notes)
  RETURNING defect_id INTO v_defect_id;
  RETURN jsonb_build_object('ok', true,
    'defect_id', v_defect_id, 'defect_serial', v_next);
END; $$;
