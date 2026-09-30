-- =====================================================================
-- CORR-006 Section 8 — CX-29, and CX-30 (c) and (d)
--
-- THE SAFETY CONTACT HAS NO IDENTITY IN THIS SCHEMA, AND THAT DECIDES THE
-- SHAPE OF EVERYTHING BELOW.
--
-- Annex C.6: "A named person designated by the founder and recorded in
-- configuration. Until one is designated, THE FOUNDER IS THE SAFETY
-- CONTACT." Measured: there is no founder in the database. is_admin() reads
-- profiles.role = 'admin'; t3a_oversight_holder holds one holder with no
-- claim to be the founder; nothing else names one.
--
-- So the build cannot resolve the default. And it must not guess: naming who
-- the founder is, as a database fact, is naming who may read what a
-- distressed participant disclosed. That is the clearest possible case for
-- recording rather than deciding.
--
-- THE CONSEQUENCE, TAKEN DELIBERATELY: until a Safety Contact is designated,
-- the safety event record is readable by NOBODY through its policy. Not by
-- an admin, not by an oversight holder. C.7 says "visible only to the Safety
-- Contact and the founder", and with neither identifiable the only reading
-- that cannot over-disclose is nobody. Falling back to administrative
-- standing would hand every admin the fact that a named participant had a
-- safety event — which is the opposite of what C.7 says.
--
-- This is safe today because activation is separately gated, so no real
-- safety event can occur. It is NOT safe to leave: a real event with no
-- readable record is a record nobody can act on. It is blocked on the
-- founder in the register, and t3a_current_safety_contact() reports
-- SAFETY_CONTACT_NOT_DESIGNATED by name rather than returning an empty
-- result that reads like "nothing is wrong".
-- =====================================================================

set search_path = public;

-- ---------------------------------------------------------------------
-- 1. CX-30(d) — the Safety Contact, held as configuration
--
-- Append-only, latest row standing, so a change of Safety Contact is a new
-- designation and never an edit. Standing is the LATEST designation, never
-- the existence of one.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_safety_contact (
  safety_contact_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  designated_person  uuid REFERENCES public.profiles(id),
  designated_name    text,
  designated_by      text NOT NULL,
  designated_at      timestamptz NOT NULL DEFAULT now(),
  -- True on the seed row: no person is designated and C.6's default applies.
  awaiting_designation boolean NOT NULL DEFAULT false,
  issued_under       text NOT NULL,
  note               text NOT NULL,
  CONSTRAINT t3a_safety_contact_person_or_awaiting CHECK (
    (awaiting_designation AND designated_person IS NULL)
    OR (NOT awaiting_designation AND designated_person IS NOT NULL))
);

COMMENT ON TABLE public.t3a_safety_contact IS
  'Annex C.6 and CX-30(d). The Safety Contact, as configuration. Append-only: the standing contact is the LATEST designation, never merely the existence of one, so a handover leaves the previous designation in the record. The seed row designates nobody and carries awaiting_designation, because C.6 defaults to the founder and no founder is identifiable in this schema.';

CREATE OR REPLACE FUNCTION public.t3a_safety_contact_append_only()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  RAISE EXCEPTION 'SAFETY_CONTACT_APPEND_ONLY: % refused. A handover is a new designation, so the record shows who was responsible when.', TG_OP
    USING ERRCODE = 'check_violation';
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_safety_contact_append_only_trg ON public.t3a_safety_contact;
CREATE TRIGGER t3a_safety_contact_append_only_trg
  BEFORE UPDATE OR DELETE ON public.t3a_safety_contact
  FOR EACH ROW EXECUTE FUNCTION public.t3a_safety_contact_append_only();

INSERT INTO public.t3a_safety_contact
  (designated_person, designated_name, designated_by, awaiting_designation, issued_under, note)
SELECT NULL, NULL, 'T3A-D1-EXEC-CORR-006 Section 8, CX-30(d)', true,
       'T3A-D1-EXEC-CORR-006 Annex C.6',
       'NO PERSON IS DESIGNATED. C.6 says that until one is, the founder is the Safety Contact — and '
    || 'there is no founder in this schema: is_admin() reads profiles.role = ''admin'', '
    || 't3a_oversight_holder holds one holder with no claim to be the founder, and nothing else names '
    || 'one. The build did not pick someone, because naming the Safety Contact names who may read '
    || 'what a distressed participant disclosed. Until a designation exists, the safety event record '
    || 'is readable by nobody through its policy, which is the only reading that cannot '
    || 'over-disclose.'
 WHERE NOT EXISTS (SELECT 1 FROM public.t3a_safety_contact);

ALTER TABLE public.t3a_safety_contact ENABLE ROW LEVEL SECURITY;

-- Who the Safety Contact is is not itself a safety disclosure: a participant
-- being escalated is entitled to know who is responsible.
DROP POLICY IF EXISTS t3a_safety_contact_read ON public.t3a_safety_contact;
CREATE POLICY t3a_safety_contact_read
  ON public.t3a_safety_contact FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.t3a_current_safety_contact()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE r public.t3a_safety_contact;
BEGIN
  SELECT * INTO r FROM public.t3a_safety_contact
   ORDER BY designated_at DESC, safety_contact_id DESC LIMIT 1;

  IF r.safety_contact_id IS NULL THEN
    RETURN jsonb_build_object('designated', false,
      'refusal_code', 'NO_SAFETY_CONTACT_CONFIGURATION',
      'remedy', 'Annex C.6 requires the Safety Contact to be held as configuration. No row exists at all.');
  END IF;

  IF r.awaiting_designation THEN
    RETURN jsonb_build_object('designated', false,
      'refusal_code', 'SAFETY_CONTACT_NOT_DESIGNATED',
      'since', r.designated_at,
      'remedy', 'C.6 defaults to the founder until a person is designated, and no founder is '
             || 'identifiable in this schema. Designate a Safety Contact, or record who the founder '
             || 'is. Until then the safety event record is readable by nobody, which is deliberate: '
             || 'the alternative is handing every administrator the fact that a named participant had '
             || 'a safety event.');
  END IF;

  RETURN jsonb_build_object('designated', true,
    'person', r.designated_person,
    'name', r.designated_name,
    'since', r.designated_at);
END;
$fn$;

COMMENT ON FUNCTION public.t3a_current_safety_contact() IS
  'Annex C.6. The standing Safety Contact, or a NAMED refusal. It never returns an empty result that could read as "nothing is wrong": SAFETY_CONTACT_NOT_DESIGNATED is a state someone has to fix, not an absence of data.';

GRANT EXECUTE ON FUNCTION public.t3a_current_safety_contact() TO authenticated;

CREATE OR REPLACE FUNCTION public.t3a_is_safety_contact()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.t3a_safety_contact c
     WHERE NOT c.awaiting_designation
       AND c.designated_person = auth.uid()
       AND c.safety_contact_id = (SELECT safety_contact_id FROM public.t3a_safety_contact
                                   ORDER BY designated_at DESC, safety_contact_id DESC LIMIT 1));
$fn$;

COMMENT ON FUNCTION public.t3a_is_safety_contact() IS
  'Whether the caller is the STANDING Safety Contact — the latest designation, not any past one. A previous contact keeps their place in the record and loses their access, which is the point of the handover being append-only.';

GRANT EXECUTE ON FUNCTION public.t3a_is_safety_contact() TO authenticated;

-- ---------------------------------------------------------------------
-- 2. CX-30(c) — the safety event record, Annex C.7
--
-- Its own table, separate from every evidence table, holding exactly the
-- fields C.7 lists. THERE IS NO COLUMN FOR THE CONTENT OF A DISCLOSURE, and
-- a trigger refuses free text that looks like one in the fields there are.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_safety_event (
  safety_event_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- "That an event occurred; its date and time"
  occurred_at         timestamptz NOT NULL,
  -- "the Stage and source version"
  stage_code          public.t3a_stage_code NOT NULL,
  source_version_id   uuid REFERENCES public.t3a_d1_content_version(content_version_id),
  -- "who acted"
  acted_by            uuid NOT NULL REFERENCES public.profiles(id),
  acted_as            text NOT NULL
                        CHECK (acted_as IN ('participant', 'mentor', 'confirmer', 'facilitator')),
  -- "and what was done — stopped, signposted, escalated, emergency services
  -- contacted". A closed set, and more than one may be true of one event.
  stopped                      boolean NOT NULL DEFAULT false,
  signposted                   boolean NOT NULL DEFAULT false,
  escalated_to_safety_contact  boolean NOT NULL DEFAULT false,
  emergency_services_contacted boolean NOT NULL DEFAULT false,
  escalated_at        timestamptz,
  -- The person the event concerns. C.5c: a co-participant is not observed,
  -- so nothing is recorded about them beyond the safety event — this column
  -- is that "beyond".
  concerns_person     uuid NOT NULL REFERENCES public.profiles(id),
  recorded_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT t3a_safety_event_something_was_done CHECK (
    stopped OR signposted OR escalated_to_safety_contact OR emergency_services_contacted)
);

COMMENT ON TABLE public.t3a_safety_event IS
  'Annex C.7 and CX-30(c). Exactly what C.7''s left column lists: that an event occurred, its date and time, the Stage and source version, who acted, and what was done. THERE IS DELIBERATELY NO COLUMN FOR THE CONTENT OF A DISCLOSURE — C.7''s right column, and C2''s "a disclosure is never evidence". Separate from every evidence table: nothing here references an observation record, a determination, a statement or a report, so a disclosure cannot be joined to a person''s evidence. Visible only to the Safety Contact and the founder; with neither designated, visible to nobody. Retention follows counsel''s advice under REC-04.';

COMMENT ON COLUMN public.t3a_safety_event.concerns_person IS
  'C.5c. Who the event is about, which is not always who acted — at Stage 4 the facilitator acts and a co-participant may be the person affected. A co-participant is not observed, so this row is the ONLY thing recorded about them.';

ALTER TABLE public.t3a_safety_event ENABLE ROW LEVEL SECURITY;

-- C.7: visible only to the Safety Contact and the founder. There is no
-- founder in this schema, so the policy names the one identity that exists.
-- With no designation, this is false for everyone, deliberately.
DROP POLICY IF EXISTS t3a_safety_event_read ON public.t3a_safety_event;
CREATE POLICY t3a_safety_event_read
  ON public.t3a_safety_event FOR SELECT TO authenticated
  USING (public.t3a_is_safety_contact());

CREATE OR REPLACE FUNCTION public.t3a_safety_event_rules()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'SAFETY_EVENT_APPEND_ONLY: % refused. A safety event record is never edited or removed.', TG_OP
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.escalated_to_safety_contact AND NEW.escalated_at IS NULL THEN
    RAISE EXCEPTION 'SAFETY_ESCALATION_HAS_NO_TIME: C4d and C5d require escalation to the Safety Contact THE SAME DAY, which cannot be shown without the instant it happened.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_safety_event_rules_trg ON public.t3a_safety_event;
CREATE TRIGGER t3a_safety_event_rules_trg
  BEFORE INSERT OR UPDATE OR DELETE ON public.t3a_safety_event
  FOR EACH ROW EXECUTE FUNCTION public.t3a_safety_event_rules();

-- ---------------------------------------------------------------------
-- 3. CX-29 — the withholding, and what it excludes
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_d1_welfare_withholding (
  welfare_withholding_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_instance_id      uuid NOT NULL UNIQUE,
  participant_id         uuid NOT NULL REFERENCES public.profiles(id),
  dimension_id           text NOT NULL,
  stage_code             public.t3a_stage_code NOT NULL,
  safety_event_id        uuid REFERENCES public.t3a_safety_event(safety_event_id),
  withheld_by            uuid NOT NULL REFERENCES public.profiles(id),
  withheld_at            timestamptz NOT NULL DEFAULT now(),
  recorded_under         text NOT NULL DEFAULT 'T3A-D1-EXEC-CORR-006 Section 8, CX-29'
);

COMMENT ON TABLE public.t3a_d1_welfare_withholding IS
  'CX-29. An observation withheld for welfare before commit. Its presence excludes that observation from confirmation, composition, statement, report and release. CANNOT BE UNDONE BY THE CONFIRMER (CX-30b): append-only, with no route that removes a row. Holds no disclosure content — what happened is in t3a_safety_event, and not even that holds the content.';

ALTER TABLE public.t3a_d1_welfare_withholding ENABLE ROW LEVEL SECURITY;

-- The participant may see that their observation was withheld; otherwise the
-- Safety Contact. An ordinary confirmer must not browse who was withheld.
DROP POLICY IF EXISTS t3a_d1_welfare_withholding_read ON public.t3a_d1_welfare_withholding;
CREATE POLICY t3a_d1_welfare_withholding_read
  ON public.t3a_d1_welfare_withholding FOR SELECT TO authenticated
  USING (participant_id = auth.uid() OR public.t3a_is_safety_contact());

CREATE OR REPLACE FUNCTION public.t3a_d1_welfare_withholding_append_only()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  RAISE EXCEPTION 'WELFARE_WITHHOLDING_CANNOT_BE_UNDONE: % refused. CX-30(b): a withholding cannot be undone by the confirmer, and there is no route that removes one.', TG_OP
    USING ERRCODE = 'check_violation';
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_d1_welfare_withholding_append_only_trg ON public.t3a_d1_welfare_withholding;
CREATE TRIGGER t3a_d1_welfare_withholding_append_only_trg
  BEFORE UPDATE OR DELETE ON public.t3a_d1_welfare_withholding
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_welfare_withholding_append_only();

-- The one definition, so every surface asks the same question.
CREATE OR REPLACE FUNCTION public.t3a_d1_withheld_for_welfare(p_stage_instance_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT EXISTS (SELECT 1 FROM public.t3a_d1_welfare_withholding w
                  WHERE w.stage_instance_id = p_stage_instance_id);
$fn$;

COMMENT ON FUNCTION public.t3a_d1_withheld_for_welfare(uuid) IS
  'CX-29, the single definition. SECURITY DEFINER so a confirmer who may not READ the withholding table still has their write refused by it — the exclusion must not depend on the actor being able to see the reason.';

GRANT EXECUTE ON FUNCTION public.t3a_d1_withheld_for_welfare(uuid) TO authenticated;

-- (a) No determination, and no confirmation.
CREATE OR REPLACE FUNCTION public.t3a_d1_refuse_if_withheld_for_welfare()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  IF public.t3a_d1_withheld_for_welfare(NEW.stage_instance_id) THEN
    RAISE EXCEPTION 'OBSERVATION_WITHHELD_FOR_WELFARE: % refused on this observation. CX-29 excludes it from confirmation, composition, statement, report and release. Its stored responses are retained in history.', TG_TABLE_NAME
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_refuse_if_withheld_for_welfare() IS
  'CX-29. Refuses a write about an observation withheld for welfare, by name, on any table carrying stage_instance_id. The refusal message deliberately does not say what was disclosed, because nothing in the build knows — C.7 records no disclosure content anywhere.';

DROP TRIGGER IF EXISTS t3a_d1_s1_determination_welfare_trg ON public.t3a_d1_s1_determination;
CREATE TRIGGER t3a_d1_s1_determination_welfare_trg
  BEFORE INSERT ON public.t3a_d1_s1_determination
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_refuse_if_withheld_for_welfare();

DROP TRIGGER IF EXISTS t3a_d1_s1_confirmation_welfare_trg ON public.t3a_d1_s1_confirmation;
CREATE TRIGGER t3a_d1_s1_confirmation_welfare_trg
  BEFORE INSERT ON public.t3a_d1_s1_confirmation
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_refuse_if_withheld_for_welfare();

-- (b) No commit of the observation record. Keyed differently — that table
-- carries participant, dimension and stage rather than stage_instance_id —
-- so it gets its own check rather than a mangled reuse of the one above.
CREATE OR REPLACE FUNCTION public.t3a_d1_observation_commit_not_withheld()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  IF NOT NEW.is_committed THEN
    RETURN NEW;  -- An uncommitted record is not yet evidence of anything.
  END IF;

  -- The cast is not decoration. t3a_observation_record.stage_code is TEXT
  -- and t3a_d1_welfare_withholding.stage_code is the t3a_stage_code enum, so
  -- comparing them directly raises "operator does not exist" — on EVERY
  -- insert into this table, withheld or not, which would have stopped all
  -- commits rather than only the withheld ones. Caught by the proof's
  -- negative control, which is the line that had no reason to fail.
  IF EXISTS (SELECT 1 FROM public.t3a_d1_welfare_withholding w
              WHERE w.participant_id  = NEW.participant_id
                AND w.dimension_id    = NEW.dimension_id
                AND w.stage_code::text = NEW.stage_code) THEN
    RAISE EXCEPTION 'OBSERVATION_WITHHELD_FOR_WELFARE: this observation was withheld for welfare before commit and cannot be committed. CX-28 records it as a withdrawal after observation begins, before commit.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_observation_record_welfare_trg ON public.t3a_observation_record;
CREATE TRIGGER t3a_observation_record_welfare_trg
  BEFORE INSERT OR UPDATE ON public.t3a_observation_record
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_observation_commit_not_withheld();

-- (c) No composed statement. Reached through its observation record, because
-- t3a_d1_composed_statement carries neither stage_instance_id nor the
-- participant directly.
CREATE OR REPLACE FUNCTION public.t3a_d1_composed_statement_not_withheld()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  IF EXISTS (SELECT 1 FROM public.t3a_observation_record o
              JOIN public.t3a_d1_welfare_withholding w
                ON w.participant_id = o.participant_id
               AND w.dimension_id   = o.dimension_id
               AND w.stage_code::text = o.stage_code   -- text vs enum; see above
             WHERE o.observation_record_id = NEW.observation_record_id) THEN
    RAISE EXCEPTION 'OBSERVATION_WITHHELD_FOR_WELFARE: no statement is composed from an observation withheld for welfare. CX-29.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_d1_composed_statement_welfare_trg ON public.t3a_d1_composed_statement;
CREATE TRIGGER t3a_d1_composed_statement_welfare_trg
  BEFORE INSERT ON public.t3a_d1_composed_statement
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_composed_statement_not_withheld();

-- ---------------------------------------------------------------------
-- 4. Assert what C.7 says the record must NOT hold
-- ---------------------------------------------------------------------

DO $verify$
DECLARE v_bad text; v_n int;
BEGIN
  -- No column that could hold the content of a disclosure. Checked by name
  -- rather than trusted, because the table is the one place where a
  -- well-meaning later column would do the most harm.
  SELECT string_agg(a.attname, ', ') INTO v_bad
    FROM pg_attribute a
   WHERE a.attrelid = 'public.t3a_safety_event'::regclass
     AND a.attnum > 0 AND NOT a.attisdropped
     AND (a.attname ~* '(content|disclos|detail|note|body|text|descri|what_was_said|verbatim|quote|summary)');
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'C7_RECORD_COULD_HOLD_A_DISCLOSURE: t3a_safety_event carries % — C.7''s right column says the content of the disclosure is NOT recorded.', v_bad;
  END IF;

  -- Separate from every evidence table: no foreign key into one.
  SELECT string_agg(confrelid::regclass::text, ', ') INTO v_bad
    FROM pg_constraint
   WHERE conrelid = 'public.t3a_safety_event'::regclass AND contype = 'f'
     AND confrelid::regclass::text ~ '(observation_record|determination|confirmation|composed_statement|ber_report|release|statement_library)';
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'C7_RECORD_JOINS_TO_EVIDENCE: t3a_safety_event references % — it must be separate from every evidence table.', v_bad;
  END IF;

  SELECT count(*) INTO v_n FROM public.t3a_safety_contact;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'CX30D_WRONG_COUNT: % safety contact rows, expected the one seed designation.', v_n;
  END IF;

  IF (public.t3a_current_safety_contact() ->> 'refusal_code') IS DISTINCT FROM 'SAFETY_CONTACT_NOT_DESIGNATED' THEN
    RAISE EXCEPTION 'CX30D_UNEXPECTED_STATE: the Safety Contact reads % and this migration designates nobody.', public.t3a_current_safety_contact()::text;
  END IF;

  RAISE NOTICE 'CX-30(c): the safety event record holds no field that could carry a disclosure and joins to no evidence table. CX-30(d): configuration exists, designating nobody, reported by name.';
END;
$verify$;

-- ---------------------------------------------------------------------
-- 5. What is recorded rather than decided
-- ---------------------------------------------------------------------

INSERT INTO public.t3a_d1_build_conflict_register
  (entry_id, opened_by, scope, classification, status, blocked_on, note)
VALUES
  ('CORR-006/CX-30d/no-founder-exists-to-default-to',
   'CORR-006 Section 8, measured while building the Safety Contact',
   'Who the Safety Contact is until one is designated',
   'most restrictive behavior taken; a real safety event would have no readable record',
   'open',
   'Founder: designate a Safety Contact, or record who the founder is. Until one of those exists, the '
   || 'safety event record is readable by nobody.',
   'Annex C.6: "A named person designated by the founder and recorded in configuration. Until one is '
   || 'designated, THE FOUNDER IS THE SAFETY CONTACT." MEASURED: THERE IS NO FOUNDER IN THIS SCHEMA. '
   || 'is_admin() reads profiles.role = ''admin''; t3a_oversight_holder holds one holder with no claim '
   || 'to be the founder; no table, column or function names one. So the default C.6 gives cannot be '
   || 'resolved. '
   || 'THE BUILD DID NOT PICK SOMEONE. Naming the Safety Contact names who may read what a distressed '
   || 'participant disclosed, which is as clear a case for recording rather than deciding as this '
   || 'build has met. '
   || 'THE CONSEQUENCE, TAKEN DELIBERATELY: the safety event record is readable by NOBODY through its '
   || 'policy — not an admin, not an oversight holder. C.7 says "visible only to the Safety Contact '
   || 'and the founder", and with neither identifiable, nobody is the only reading that cannot '
   || 'over-disclose. Falling back to administrative standing would hand every administrator the fact '
   || 'that a named participant had a safety event. '
   || 'SAFE TODAY, NOT SAFE TO LEAVE: activation is separately gated so no real safety event can '
   || 'occur. A real one with no readable record is a record nobody can act on, and C4d requires '
   || 'escalation THE SAME DAY. This is the highest-priority open item in Section 8.'),

  ('CORR-006/CX-29/stage-code-is-an-enum-in-one-table-and-text-in-another',
   'CORR-006 Section 8, found by a negative control that had no reason to fail',
   'How the Stage is typed across tables',
   'latent defect in the build''s own guard, corrected; an underlying inconsistency recorded',
   'open',
   'Developer: note that t3a_observation_record.stage_code is unconstrained text. Narrowing it is a '
   || 'schema change on a table holding evidence and is not this instrument''s to make.',
   'THE GUARD I WROTE WOULD HAVE STOPPED EVERY COMMIT. '
   || 't3a_d1_observation_commit_not_withheld compared w.stage_code with NEW.stage_code. '
   || 't3a_d1_welfare_withholding.stage_code is the t3a_stage_code ENUM; '
   || 't3a_observation_record.stage_code is TEXT. Postgres raises "operator does not exist: '
   || 't3a_stage_code = text" — on EVERY insert into t3a_observation_record, not only withheld ones. '
   || 'So a guard meant to refuse a handful of writes would have refused all of them, with an error '
   || 'naming a missing operator rather than anything about welfare. '
   || 'HOW IT WAS CAUGHT: the proof''s NEGATIVE CONTROL — the same commit on an observation that was '
   || 'not withheld — failed. The line that was supposed to succeed is the one that found it. Had the '
   || 'proof only checked that withheld commits are refused, it would have read REFUSED_BY_NAME-ish '
   || 'and passed. Corrected with an explicit ::text cast in both guards. '
   || 'THE UNDERLYING INCONSISTENCY IS NOT CORRECTED: two tables in this schema record the same fact, '
   || 'the Stage, with different types, and the evidence table''s is unconstrained text that could '
   || 'hold any string. Narrowing it would be a schema change on a table holding evidence, which this '
   || 'instrument does not authorize.'),

  ('CORR-006/CX-29/report-and-release-exclusion-is-upstream',
   'CORR-006 Section 8, while enforcing the exclusion',
   'Where CX-29''s exclusion from report and release is actually enforced',
   'enforced at four points; the last two follow from those rather than having guards of their own',
   'open',
   'Developer: when the report composition path is next touched, confirm it selects through committed '
   || 'observation records only. It does today, which is why no guard was added there.',
   'CX-29 excludes a withheld observation from "confirmation, composition, statement, report and '
   || 'release". FOUR HARD REFUSALS WERE BUILT, each on a table where the thing must not exist: no '
   || 'determination (t3a_d1_s1_determination), no confirmation (t3a_d1_s1_confirmation), no COMMIT of '
   || 'the observation record (t3a_observation_record), and no composed statement '
   || '(t3a_d1_composed_statement). '
   || 'REPORT AND RELEASE HAVE NO GUARD OF THEIR OWN, and that is a deliberate choice rather than an '
   || 'omission. A report is keyed to a participant and dimension, not to one observation, so a '
   || 'trigger refusing the report would BLOCK the whole report — and CX-29 says the observation is '
   || 'EXCLUDED FROM the report, not that the report is blocked. The exclusion therefore has to happen '
   || 'in what the report composes from, and it does: a withheld observation can never be committed, '
   || 'and nothing uncommitted reaches a report or a release. '
   || 'MEASURED RATHER THAN ASSUMED: t3a_d1_report_face_assemble joins '
   || 't3a_d1_composed_statement to t3a_observation_record with "AND o.is_committed", read from '
   || 'pg_get_functiondef. '
   || 'RECORDED BECAUSE IT DEPENDS ON SOMETHING STAYING TRUE. If a later change ever composed a report '
   || 'from uncommitted observations, the exclusion would silently stop applying at exactly the two '
   || 'surfaces a participant would care about most.')
ON CONFLICT (entry_id) DO UPDATE SET
  opened_by = EXCLUDED.opened_by, scope = EXCLUDED.scope,
  classification = EXCLUDED.classification, status = EXCLUDED.status,
  blocked_on = EXCLUDED.blocked_on, note = EXCLUDED.note;

-- ---------------------------------------------------------------------
-- 6. The evidence, as rows
-- ---------------------------------------------------------------------

INSERT INTO public.t3a_d1_correction_test
  (correction_test_id, instrument, test_name, fixture, required_result,
   restated_by, supersedes_fixture, why_restated)
VALUES
  ('CX-29-WITHHELD-EXCLUSION', 'T3A-D1-EXEC-CORR-006 Section 8, CX-29 and CX-30(b)',
   'An observation withheld for welfare reaches no determination, confirmation, commit or statement, and the withholding cannot be undone',
   'One withheld observation and, BESIDE EACH EXCLUSION, a control observation that was not withheld. '
   || 'Synthetic, inside an aborted transaction.',
   'Every write about the withheld observation refused with OBSERVATION_WITHHELD_FOR_WELFARE; every '
   || 'same write on the control accepted; an UNCOMMITTED record on the withheld observation accepted, '
   || 'because CX-29 retains the responses in history; a delete of the withholding refused with '
   || 'WELFARE_WITHHOLDING_CANNOT_BE_UNDONE.',
   'CX-29', NULL,
   'Controls beside every exclusion, and that is not belt-and-braces here: the control is what found '
   || 'the defect. See the outcome.'),

  ('CX-30CD-SAFETY-RECORD', 'T3A-D1-EXEC-CORR-006 Section 8, CX-30(c) and (d)',
   'The safety event record holds no disclosure content and is visible to nobody while no Safety Contact is designated',
   'A synthetic safety event, read back AS AN OVERSIGHT HOLDER rather than as an unprivileged user, so '
   || 'the result is not merely "a stranger cannot see it".',
   'The Safety Contact reports SAFETY_CONTACT_NOT_DESIGNATED. The record has no column matching '
   || 'content, disclosure, detail, note, body, text, description, verbatim, quote or summary, and no '
   || 'foreign key into any evidence table. An escalation with no time is refused by name; an event '
   || 'where nothing was done is refused; an edit is refused by name. An oversight holder sees zero '
   || 'rows.',
   'CX-30', NULL,
   'The reader is an oversight holder deliberately. C.7 says "visible only to the Safety Contact and '
   || 'the founder", and the interesting question is not whether a stranger is excluded but whether '
   || 'the most privileged identity in the schema is.')
ON CONFLICT (correction_test_id) DO UPDATE SET
  instrument = EXCLUDED.instrument, test_name = EXCLUDED.test_name,
  fixture = EXCLUDED.fixture, required_result = EXCLUDED.required_result,
  restated_by = EXCLUDED.restated_by, supersedes_fixture = EXCLUDED.supersedes_fixture,
  why_restated = EXCLUDED.why_restated;

INSERT INTO public.t3a_d1_correction_test_outcome
  (correction_test_id, outcome, actual_result, build_version, tester, conflict_note)
VALUES
  ('CX-29-WITHHELD-EXCLUSION', 'pass',
   'scripts/proofs/safety-withholding-proof.sql, self-aborting: '
   || 'determinationOnWithheld=REFUSED_BY_NAME determinationOnControl=ACCEPTED '
   || 'confirmationOnWithheld=REFUSED_BY_NAME commitOnWithheld=REFUSED_BY_NAME '
   || 'commitOnControl=ACCEPTED uncommittedOnWithheld=ACCEPTED statementOnWithheld=REFUSED_BY_NAME '
   || 'withholdingUndone=REFUSED_BY_NAME reportAssemblyRequiresCommitted=true. Nothing committed.',
   '20261081000000', 'Claude Code, automated, non-production environment',
   'THE NEGATIVE CONTROL FOUND A DEFECT IN THE GUARD I HAD JUST WRITTEN, and it is the reason to keep '
   || 'writing controls. The commit guard compared t3a_d1_welfare_withholding.stage_code (the '
   || 't3a_stage_code enum) with t3a_observation_record.stage_code (TEXT), so Postgres raised '
   || '"operator does not exist" on EVERY insert into the observation record — not only withheld ones. '
   || 'A guard meant to refuse a handful of writes would have refused all of them. The line that '
   || 'failed was commitOnControl, the one with no reason to fail; had the proof only checked that '
   || 'withheld commits are refused, it would have passed. Corrected with an explicit ::text cast. '
   || 'Open at CORR-006/CX-29/stage-code-is-an-enum-in-one-table-and-text-in-another. '
   || 'A SECOND TEST FAULT, of a shape this build has met before: the first run left '
   || 'request.jwt.claims set to an oversight holder after the visibility check, so an existing guard '
   || '(OVERSIGHT_ROLE_MAY_NOT_ALTER_EVIDENCE) refused the CONTROL determination. The control read '
   || 'REFUSED while the withheld one read REFUSED_BY_NAME, which looks like the guard working. '
   || 'Impersonation has to be undone completely, not just the role.'),

  ('CX-30CD-SAFETY-RECORD', 'pass',
   'Same proof: safetyContact=SAFETY_CONTACT_NOT_DESIGNATED safetyEventWritten=YES '
   || 'escalationWithoutTime=REFUSED_BY_NAME eventWithNothingDone=REFUSED '
   || 'safetyEventEdit=REFUSED_BY_NAME rowsVisibleToOversightHolder=0 isSafetyContact=false. The '
   || 'migration additionally asserts, by name, that no column of t3a_safety_event could hold a '
   || 'disclosure and that it has no foreign key into any evidence table.',
   '20261081000000', 'Claude Code, automated, non-production environment',
   'rowsVisibleToOversightHolder=0 is the intended state and also the open problem: with no Safety '
   || 'Contact designated and no founder identifiable in the schema, a real safety event would have no '
   || 'readable record, while C4d requires escalation the same day. Open at '
   || 'CORR-006/CX-30d/no-founder-exists-to-default-to, and it is the highest-priority item in '
   || 'Section 8.');
