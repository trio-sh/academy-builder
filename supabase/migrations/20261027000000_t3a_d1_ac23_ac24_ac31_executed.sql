-- =====================================================================
-- §11 — AC-23, AC-31 and AC-24, executed against approved sources
--
-- All fourteen remaining tests were blocked on one input: no source held
-- a REC-07 approval, so no source could be served and no Stage 2
-- interaction could be run against real content. On 2026-09-21 the
-- founder approved all forty through the route, each against an exact
-- version hash.
--
-- Three of the fourteen are about the §3.3 live-view rule and the
-- recording boundary. Those are properties of the mechanism rather than
-- of a rendered screen, and they are executed here. The other eleven are
-- about what a mentor sees and does — layout, beat synchronisation,
-- refresh recovery, working without a second tab — and those need a
-- driven browser session. They stay blocked, on a different blocker, and
-- the register says which.
--
-- WHAT WAS RUN. A Stage 2 entry against SRC-D1-S2-001, a source with a
-- standing REC-07 approval — not synthetic content. A mentor holding no
-- oversight standing, assigned to the participant, holding a current
-- observe authority. Synthetic fixtures for the session itself, in a
-- transaction ending in RAISE; the database was checked afterwards and
-- the forty approvals were verified intact.
--
-- AC-23 · participant view unavailable
--   baseline: advancement permitted
--   report UNAVAILABLE           -> effect PAUSED
--   advancement                  -> refused,
--                                   SOURCE_ADVANCEMENT_BLOCKED_PENDING_PAUSE_CLEARANCE
--   commit attempted while paused-> 42501 COMMIT_REFUSED_WHILE_SESSION_PAUSED
--   report AVAILABLE again       -> RESUMED_WITH_VARIANCE, one
--                                   administration variance recorded
--
-- AC-31 · mentor view unavailable
--   report UNAVAILABLE           -> effect PAUSED
--   advancement                  -> false
--
-- And the other half of §3.3, which a test for "unavailable" alone would
-- miss: reporting DEGRADED returned NO_CHANGE. A degraded view is
-- surfaced and the session continues; only unavailable takes the pause
-- route. A build that paused on degradation would be as wrong as one
-- that continued through unavailability.
--
-- AC-24 · recording boundary
--   * RECORDING consent is available = false, and
--     t3a_d1_consent_type_available refuses to grant an unavailable type
--     at all, so no route can obtain it;
--   * no storage bucket holds media — project-files, resumes, avatars,
--     and nothing for capture;
--   * no MediaRecorder, getDisplayMedia, captureStream, Blob or upload
--     path exists in the live-view code, and d1-surface-contracts already
--     asserts their absence from the cockpit;
--   * the live views take a MediaStream, measure it and display it. The
--     signalling relay added for them carries SDP and ICE, which describe
--     how two browsers reach each other and contain no media.
--
-- WHAT THIS DOES NOT COVER, stated so the pass is not read wider than it
-- is. AC-23 and AC-31 are recorded here for the RULE being followed —
-- the pause written, advancement refused, commit refused server-side.
-- The banner the mentor sees is built and was not exercised by this run.
-- AC-24 is recorded on the absence of a recording path rather than on
-- watching a session and confirming no file appeared.
-- =====================================================================

set search_path = public;

INSERT INTO public.t3a_d1_acceptance_evidence
  (test_id, outcome, actual_result, build_version, tester, executed_at, conflict_note)
VALUES
  ('AC-23', 'pass',
   'Executed against SRC-D1-S2-001, a source holding a standing REC-07 approval. '
   || 'Baseline advancement permitted. Reporting the participant live view UNAVAILABLE '
   || 'returned effect PAUSED; advancement was then refused with '
   || 'SOURCE_ADVANCEMENT_BLOCKED_PENDING_PAUSE_CLEARANCE; a commit attempted while the '
   || 'pause stood was refused with 42501 COMMIT_REFUSED_WHILE_SESSION_PAUSED. Reporting '
   || 'AVAILABLE again returned RESUMED_WITH_VARIANCE and one administration variance was '
   || 'recorded. The session did not continue as if conditions were intact. '
   || 'SCOPE: this records the rule being ENFORCED server-side. The banner the mentor '
   || 'sees is built and was not exercised by this run.',
   '5f3575b', 'Claude Code, automated, non-production environment', now(), NULL),

  ('AC-31', 'pass',
   'Same run, mentor view. Reporting the mentor live view UNAVAILABLE returned effect '
   || 'PAUSED and advancement became false. Additionally, reporting DEGRADED returned '
   || 'NO_CHANGE: §3.3 surfaces a degraded view and continues, and only unavailability '
   || 'takes the pause route — a build that paused on degradation would be as wrong as '
   || 'one that continued through unavailability. '
   || 'SCOPE: as AC-23, this is the rule enforced server-side.',
   '5f3575b', 'Claude Code, automated, non-production environment', now(), NULL),

  ('AC-24', 'pass',
   'RECORDING consent is available = false and t3a_d1_consent_type_available refuses to '
   || 'grant an unavailable type at all, so no route can obtain it. No storage bucket '
   || 'holds media: project-files, resumes and avatars exist and none is for capture. '
   || 'No MediaRecorder, getDisplayMedia, captureStream, Blob or upload path exists in the '
   || 'live-view code, and d1-surface-contracts already asserts their absence from the '
   || 'cockpit. The live views take a MediaStream, measure it and display it; the '
   || 'signalling relay carries SDP and ICE, which describe how two browsers reach each '
   || 'other and contain no media. '
   || 'SCOPE: recorded on the absence of any recording path, not on watching a live '
   || 'session and confirming no file appeared.',
   '5f3575b', 'Claude Code, automated, non-production environment', now(), NULL);

-- The remaining eleven are re-stated against their real blocker, which
-- is no longer the missing approval.
INSERT INTO public.t3a_d1_acceptance_evidence
  (test_id, outcome, actual_result, build_version, tester, executed_at, conflict_note)
SELECT t.test_id, 'blocked_by_conflict',
   'No longer blocked on REC-07: all forty sources were approved on 2026-09-21 and '
   || 't3a_d1_serving_readiness now reports 40 servable with nothing blocking. This test '
   || 'is about what a mentor sees and does — layout, beat synchronisation, refresh '
   || 'recovery, working without a second tab — and needs a driven browser session '
   || 'signed in as an authorized mentor against a served source. That is a test harness '
   || 'this repository does not yet have, not a missing governing input.',
   '5f3575b', 'Claude Code, automated, non-production environment', now(),
   'Needs an end-to-end browser run. Playwright is configured in this repository and no '
   || 'suite drives the Stage 2 cockpit yet.'
FROM public.t3a_d1_acceptance_test t
WHERE t.test_id IN ('AC-01','AC-04','AC-05','AC-06','AC-08','AC-12','AC-13',
                    'AC-17','AC-26','AC-27','AC-28');
