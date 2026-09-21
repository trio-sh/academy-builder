-- =====================================================================
-- The Stage 2 entry register, reconciled — path 1 of the two written up
-- in §7b of the build report, taken on the founder's instruction.
--
-- The cockpit reads eleven columns of t3a_stage_entry_event and eight
-- did not exist, so it loaded undefined for all eight and then failed at
-- commit with 42703. What that looked like was a cockpit built against
-- an imagined schema. It was not.
--
-- 20260903000000_t3a_d1_gateway_and_source.sql DEFINES those eight
-- columns, by name and by type. It is one of the four migrations
-- 20260905's post-mortem covers: applied statement by statement with the
-- errors swallowed, and its CREATE TABLE IF NOT EXISTS for this table
-- lost silently to the spec-002 table 20260811160000 had already
-- created. The richer definition never landed, the insert function that
-- fills it did, and nothing failed loudly enough to notice.
--
-- So this adds the columns that migration intended rather than columns
-- anybody invented today. Its definition, verbatim:
--
--   participant_id uuid not null references profiles(id)
--   dimension_id text not null
--   source_version_id uuid references t3a_content_version(...)
--   randomization_seed bigint not null
--   presentation_variant_seed bigint not null
--   administration_conditions_snapshot jsonb not null default '{}'
--   session_identity_receipt_id text
--   env_state_at_entry t3a_env_state not null
--   entered_at timestamptz not null default now()
--
-- Two deliberate departures from it, both because the repair migration
-- moved the ground underneath:
--
--   * source_version_id references t3a_d1_content_version, not
--     t3a_content_version. The forty sources are in the D1 register;
--     pointing at the legacy one would be a foreign key to an empty
--     table, which is the fault 20261015000000 fixed for source
--     approvals.
--   * the gateway link is the existing observation_path_gateway_id. A
--     second gateway column would be two answers to one question.
--
-- NOTHING IS RENAMED. administration_conditions and created_at stay
-- exactly as they are, alongside the new administration_conditions_snapshot
-- and entered_at. They overlap, and that is recorded in §7b rather than
-- resolved by dropping a column other code may read.
-- =====================================================================

set search_path = public;

-- ---------------------------------------------------------------------
-- 1. The columns
-- ---------------------------------------------------------------------

-- The table is empty, so NOT NULL is stated where the design states it
-- rather than deferred to a later tightening that never comes.
ALTER TABLE public.t3a_stage_entry_event
  ADD COLUMN IF NOT EXISTS participant_id uuid
    REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS dimension_id text,
  ADD COLUMN IF NOT EXISTS source_version_id uuid
    REFERENCES public.t3a_d1_content_version(content_version_id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS randomization_seed bigint,
  ADD COLUMN IF NOT EXISTS presentation_variant_seed bigint,
  ADD COLUMN IF NOT EXISTS administration_conditions_snapshot jsonb
    NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS session_identity_receipt_id text,
  ADD COLUMN IF NOT EXISTS env_state_at_entry public.t3a_env_state,
  ADD COLUMN IF NOT EXISTS entered_at timestamptz NOT NULL DEFAULT now();

-- ---------------------------------------------------------------------
-- 2. Derived rather than demanded
-- ---------------------------------------------------------------------

-- Two insert paths already write this table: the spec-002 route in
-- 20260811180000 and the D1 route in 20260903000000. The first supplies
-- none of the new columns, so making them NOT NULL outright would break
-- a working route to satisfy a constraint.
--
-- Instead the facts are DERIVED from what the row already carries, and
-- only then required. participant_id comes from the gateway, which is
-- the register that knows whose pathway this is; dimension_id comes from
-- dimensions_in_play; the seeds and the environment from the clock and
-- t3a_current_env_state(). A caller that supplies them is not
-- overridden — a caller that omits them does not get a null.
CREATE OR REPLACE FUNCTION public.t3a_stage_entry_event_derive()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NEW.participant_id IS NULL THEN
    SELECT g.participant_id INTO NEW.participant_id
    FROM public.t3a_observation_path_gateway g
    WHERE g.observation_path_gateway_id = NEW.observation_path_gateway_id;
  END IF;

  -- dimensions_in_play is the array of dimensions this entry serves;
  -- dimension_id is the one it is about. With exactly one in play they
  -- are the same fact, and taking the first of several would be a guess,
  -- so it is left null and the check below refuses.
  IF NEW.dimension_id IS NULL
     AND NEW.dimensions_in_play IS NOT NULL
     AND array_length(NEW.dimensions_in_play, 1) = 1 THEN
    NEW.dimension_id := NEW.dimensions_in_play[1]::text;
  END IF;

  IF NEW.randomization_seed IS NULL THEN
    NEW.randomization_seed := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  END IF;

  IF NEW.presentation_variant_seed IS NULL THEN
    NEW.presentation_variant_seed := (extract(epoch from clock_timestamp()) * 997)::bigint;
  END IF;

  IF NEW.env_state_at_entry IS NULL THEN
    NEW.env_state_at_entry := public.t3a_current_env_state();
  END IF;

  -- A participant that could not be derived is a refusal, not a null. An
  -- observation record anchored to an entry that names nobody is the
  -- thing AC-18 and AC-19 exist to prevent.
  IF NEW.participant_id IS NULL THEN
    RAISE EXCEPTION 'STAGE_ENTRY_NAMES_NO_PARTICIPANT: the gateway % does not resolve a participant',
      NEW.observation_path_gateway_id
      USING ERRCODE = 'not_null_violation';
  END IF;

  IF NEW.dimension_id IS NULL THEN
    RAISE EXCEPTION 'STAGE_ENTRY_NAMES_NO_DIMENSION: dimensions_in_play carries % dimensions, so which one this entry is about must be stated',
      coalesce(array_length(NEW.dimensions_in_play, 1), 0)
      USING ERRCODE = 'not_null_violation';
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_stage_entry_event_derive_trg
  ON public.t3a_stage_entry_event;
CREATE TRIGGER t3a_stage_entry_event_derive_trg
  BEFORE INSERT ON public.t3a_stage_entry_event
  FOR EACH ROW EXECUTE FUNCTION public.t3a_stage_entry_event_derive();

-- The participant on the entry and the participant on the gateway must
-- be the same person. Two places holding one fact is how they come to
-- disagree, so the constraint says they may not.
CREATE OR REPLACE FUNCTION public.t3a_stage_entry_participant_matches_gateway()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE v_gateway_participant uuid;
BEGIN
  SELECT g.participant_id INTO v_gateway_participant
  FROM public.t3a_observation_path_gateway g
  WHERE g.observation_path_gateway_id = NEW.observation_path_gateway_id;

  IF v_gateway_participant IS NOT NULL
     AND NEW.participant_id IS DISTINCT FROM v_gateway_participant THEN
    RAISE EXCEPTION 'STAGE_ENTRY_PARTICIPANT_CONTRADICTS_GATEWAY: entry names %, gateway names %',
      NEW.participant_id, v_gateway_participant
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_stage_entry_participant_matches_gateway_trg
  ON public.t3a_stage_entry_event;
CREATE TRIGGER t3a_stage_entry_participant_matches_gateway_trg
  BEFORE INSERT OR UPDATE ON public.t3a_stage_entry_event
  FOR EACH ROW EXECUTE FUNCTION public.t3a_stage_entry_participant_matches_gateway();

CREATE INDEX IF NOT EXISTS t3a_stage_entry_event_participant_idx
  ON public.t3a_stage_entry_event (participant_id, dimension_id, stage_code);

COMMENT ON COLUMN public.t3a_stage_entry_event.administration_conditions_snapshot IS
  'The D1 design column, from 20260903000000. administration_conditions alongside it is the spec-002 column from 20260811160000 and is not renamed or dropped; the overlap is recorded in the build report rather than resolved by removing a column other code may read.';

COMMENT ON COLUMN public.t3a_stage_entry_event.entered_at IS
  'The D1 design column. created_at alongside it is the spec-002 column and is left as it is, for the same reason.';
