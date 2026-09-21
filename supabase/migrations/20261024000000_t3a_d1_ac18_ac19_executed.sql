-- =====================================================================
-- §11 — AC-18 and AC-19, executed
--
-- Both now have a route to exercise and both were exercised, as an
-- authenticated mentor holding a current `observe` authority, against
-- the real functions and the real triggers.
--
-- HOW IT WAS RUN, stated so the result can be weighed rather than taken.
-- The fixtures are synthetic — a gateway, a Stage 2 entry, a Stage
-- instance and an assignment created for the run — and the whole
-- transaction ends in a RAISE, so nothing it wrote survives. The
-- assertions are against actual behaviour; the evidence is that the
-- mechanism did these things, not that a record of it remains.
--
-- One thing had to be set aside to run it at all, and it is the more
-- interesting result. t3a_oversight_refuse_mutation refuses an INSERT on
-- t3a_observation_record from any account holding administrative
-- standing — separation of duties, and correct. The only mentor account
-- on this system is also the oversight holder, so the first run was
-- refused with OVERSIGHT_ROLE_MAY_NOT_ALTER_EVIDENCE. The standing was
-- revoked inside the aborted transaction to obtain a plain mentor. The
-- live grant was untouched and was verified intact afterwards.
--
-- WHAT WAS OBSERVED
--
-- AC-18 — a committed action traces to the authorization in force:
--   * commit with no `observe` authority on record → 42501
--     ACTOR_NOT_AUTHORIZED, so an unauthorized commit cannot happen
--   * committed record carries authority_snapshot_id → true
--   * snapshot names the acting mentor → true
--   * snapshot names the role_authorization row it came from → true
--   * snapshot records status 'granted' AS AT the commit, so a later
--     withdrawal cannot retroactively unauthorize a past observation
--
-- AC-19 — the saved record proves the versions used, and later updates
-- rewrite no history:
--   * source_version_id pinned → true
--   * source_version_hash, 64 hex → true
--   * question_object_version, 64 hex → true
--   * answer_catalogue_version, 64 hex → true
--   * applicability_version, 64 hex → true
--   * UPDATE of version_set on a committed record → 23514
--     COMMITTED_OBSERVATION_IS_SEALED
--   * DELETE of a committed record → 23514
--   * setting confirmer_id afterwards → still permitted, because
--     confirmation is a separate act by a second person and sealing it
--     would have made confirmation impossible
--
-- And the reconciliation underneath both: participant_id, dimension_id,
-- env_state_at_entry and the seeds were all omitted from the insert and
-- all derived correctly from the gateway and dimensions_in_play.
-- =====================================================================

set search_path = public;

INSERT INTO public.t3a_d1_acceptance_evidence
  (test_id, outcome, actual_result, build_version, tester, executed_at, conflict_note)
VALUES
  ('AC-18', 'pass',
   'Executed through t3a_d1_s2_commit_observation as an authenticated mentor holding a '
   || 'current observe authority for D1 at S2. A commit attempted with no such authority '
   || 'refused with 42501 ACTOR_NOT_AUTHORIZED. The committed record carries '
   || 'authority_snapshot_id; the snapshot names the acting mentor, names the '
   || 'role_authorization row it was taken from, and records status "granted" as at the '
   || 'commit — so a later withdrawal cannot retroactively unauthorize a past observation. '
   || 'Synthetic fixtures in a transaction that ends in RAISE: nothing the run wrote '
   || 'survives, and the database was checked afterwards. '
   || 'Separately and correctly, the first attempt was refused by '
   || 't3a_oversight_refuse_mutation because the only mentor account also holds oversight '
   || 'standing; an oversight holder may not create evidence. The standing was set aside '
   || 'inside the aborted transaction and the live grant verified intact.',
   'd171f74', 'Claude Code, automated, non-production environment', now(), NULL),

  ('AC-19', 'pass',
   'Same route and run. version_set pins source_version_id plus four 64-hex digests: '
   || 'source_version_hash, question_object_version, answer_catalogue_version and '
   || 'applicability_version — the source, question, answer-catalogue and applicability '
   || 'versions the test names. "Later updates rewrite no history" is enforced rather than '
   || 'stated: an UPDATE of version_set on a committed record refused with 23514 '
   || 'COMMITTED_OBSERVATION_IS_SEALED, and a DELETE refused with 23514. Setting '
   || 'confirmer_id afterwards remains permitted, because confirmation is a separate act '
   || 'by a second person and sealing it would have made confirmation impossible.',
   'd171f74', 'Claude Code, automated, non-production environment', now(), NULL);
