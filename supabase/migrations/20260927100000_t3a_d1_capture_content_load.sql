-- =====================================================================
-- T3A-D1-EXEC-001 Section 5 — capture content load (§5.2, §5.3, §5.4)
--
-- GENERATED content, moved here verbatim from
-- 20260926000000_t3a_d1_content_load.sql. Not re-extracted, not
-- re-typed, not reformatted — the same bytes in a file that sorts
-- later.
--
-- Why it moved: these three sections load the question object register,
-- the response capture catalogue and the branch rules, and all four of
-- the tables they write to are created by
-- 20260927000000_t3a_d1_capture_and_branching.sql. 20260926 sorts
-- BEFORE 20260927, so the load ran against tables that did not exist
-- yet and the whole content load aborted on
-- `relation "public.t3a_d1_question_object" does not exist`.
--
-- That took the other 40 sources, 44 statements and 14 language
-- templates down with it, because a migration is one transaction. The
-- fault was never in the content; it was in which file it sat in.
--
-- Splitting rather than renaming 20260926: a rename would move a file
-- that other migrations, the extractor and the acceptance evidence all
-- refer to by name. Moving the three dependent sections costs nothing
-- and leaves every existing reference true.
-- =====================================================================

set search_path = public;

-- ── 5.2 Question object register — 15 question objects ──
INSERT INTO public.t3a_d1_question_object
  (question_code, conduct_element, answer_type, applicability, missing_state_eligible, display_order)
VALUES
  ($lit$Q-D1-01$lit$, $lit$CE-01$lit$, $lit$Single select, fixed$lit$, $lit$Always where the element is in play$lit$, true, 1),
  ($lit$Q-D1-02$lit$, $lit$CE-02$lit$, $lit$Single select, fixed$lit$, $lit$Source carries `enquiry_point`$lit$, true, 2),
  ($lit$Q-D1-03a$lit$, $lit$CE-03$lit$, $lit$Single select, fixed$lit$, $lit$Source carries `information_made_available` and `material_items`$lit$, true, 3),
  ($lit$Q-D1-03b1$lit$, $lit$CE-03$lit$, $lit$Structured selection, multi, bound to the source version's `material_items`$lit$, $lit$Q-D1-03a returned an omission, or both$lit$, false, 4),
  ($lit$Q-D1-03b2$lit$, $lit$CE-03$lit$, $lit$Constrained selection from the source version's `assertion_reference_set`$lit$, $lit$Q-D1-03a returned an unsupported claim, or both$lit$, false, 5),
  ($lit$Q-D1-04a$lit$, $lit$CE-04$lit$, $lit$Single select, fixed$lit$, $lit$Always where the element is in play$lit$, true, 6),
  ($lit$Q-D1-04b$lit$, $lit$CE-04$lit$, $lit$Single select, fixed, with a bound child selection on one option$lit$, $lit$Source carries `attribution_support_set`$lit$, true, 7),
  ($lit$Q-D1-05a$lit$, $lit$CE-05$lit$, $lit$Single select, fixed$lit$, $lit$Always where the element is in play$lit$, true, 8),
  ($lit$Q-D1-05b1$lit$, $lit$CE-05$lit$, $lit$Single select, fixed$lit$, $lit$`accountable_actor_available = true` AND Q-D1-05a returned an action$lit$, false, 9),
  ($lit$Q-D1-05b2$lit$, $lit$CE-05$lit$, $lit$Single select, fixed$lit$, $lit$Source carries `available_routes` AND Q-D1-05a returned an action$lit$, false, 10),
  ($lit$Q-D1-05c$lit$, $lit$CE-05$lit$, $lit$Single select, fixed$lit$, $lit$`time_reference_called_for = true` AND Q-D1-05a returned an action$lit$, false, 11),
  ($lit$Q-D1-06$lit$, $lit$CE-06$lit$, $lit$Structured selection, single, bound to `available_routes` plus two fixed options$lit$, $lit$Source carries `available_routes`$lit$, true, 12),
  ($lit$Q-D1-07$lit$, $lit$CE-07$lit$, $lit$Single select, fixed$lit$, $lit$Source carries `account_test_point` AND `post_test_account_opportunity`$lit$, true, 13),
  ($lit$Q-D1-08a$lit$, $lit$CE-08$lit$, $lit$Single select, fixed — timing relative to the decision$lit$, $lit$Source carries `bearing_interest`$lit$, true, 14),
  ($lit$Q-D1-08b$lit$, $lit$CE-08$lit$, $lit$Single select, fixed — prompt condition$lit$, $lit$Source carries `bearing_interest` AND Q-D1-08a returned a disclosure$lit$, false, 15)
ON CONFLICT (question_code) DO NOTHING;

-- ── 5.3 Response capture catalogue — 13 sets ──
-- Each line states exactly which combination it covers. No line is a
-- superset of another and no two can be true at once. The set carries no
-- expected response, no strong answer and nothing indicating which line
-- is the better one.
INSERT INTO public.t3a_d1_capture_set (capture_set_code, title, applicability_note, display_order)
VALUES
  ($lit$C1$lit$, $lit$What was said about the issue$lit$, NULL, 1),
  ($lit$C2$lit$, $lit$When it was first raised$lit$, NULL, 2),
  ($lit$C3$lit$, $lit$What the account contained$lit$, NULL, 3),
  ($lit$C4a$lit$, $lit$What was said about the participant's own part$lit$, NULL, 4),
  ($lit$C4b$lit$, $lit$What was attributed to another person$lit$, NULL, 5),
  ($lit$C5a$lit$, $lit$Corrective action$lit$, NULL, 6),
  ($lit$C5b1$lit$, $lit$Accountable actor$lit$, $lit$only where the source offers one$lit$, 7),
  ($lit$C5b2$lit$, $lit$Corrective route$lit$, $lit$only where the source offers one$lit$, 8),
  ($lit$C5c$lit$, $lit$Time reference$lit$, $lit$only where the source calls for one$lit$, 9),
  ($lit$C6$lit$, $lit$Which route was used$lit$, NULL, 10),
  ($lit$C7$lit$, $lit$What changed when the account was tested$lit$, NULL, 11),
  ($lit$C8a$lit$, $lit$Disclosure timing relative to the decision point$lit$, $lit$only where the source carries a bearing interest$lit$, 12),
  ($lit$C8b$lit$, $lit$Prompt condition$lit$, $lit$only where a disclosure occurred$lit$, 13)
ON CONFLICT (capture_set_code) DO NOTHING;

INSERT INTO public.t3a_d1_capture_line (capture_set_code, line_text, line_order)
VALUES
  ($lit$C1$lit$, $lit$Named the specific issue and what it was.$lit$, 1),
  ($lit$C1$lit$, $lit$Said something was wrong without identifying what.$lit$, 2),
  ($lit$C1$lit$, $lit$Made no reference to an issue.$lit$, 3),
  ($lit$C2$lit$, $lit$Raised it before the direct question was asked.$lit$, 1),
  ($lit$C2$lit$, $lit$Raised it in response to the direct question.$lit$, 2),
  ($lit$C2$lit$, $lit$Raised it later in the exchange, having not done so when asked.$lit$, 3),
  ($lit$C2$lit$, $lit$Did not raise it at any point in the session.$lit$, 4),
  ($lit$C3$lit$, $lit$The account included every material item and included no unsupported claim.$lit$, 1),
  ($lit$C3$lit$, $lit$The account omitted one or more material items and included no unsupported claim — select which omitted items.$lit$, 2),
  ($lit$C3$lit$, $lit$The account included one or more unsupported claims and omitted no material item — select which unsupported claims from the `assertion_reference_set`, or select `UNLISTED_UNSUPPORTED_ASSERTION` where the claim made is not in the set.$lit$, 3),
  ($lit$C3$lit$, $lit$The account both omitted one or more material items and included one or more unsupported claims — select both, using `UNLISTED_UNSUPPORTED_ASSERTION` where the claim is not in the set.$lit$, 4),
  ($lit$C3$lit$, $lit$No account was given.$lit$, 5),
  ($lit$C4a$lit$, $lit$Stated what they themselves had done.$lit$, 1),
  ($lit$C4a$lit$, $lit$Referred to their own involvement without stating what they did.$lit$, 2),
  ($lit$C4a$lit$, $lit$Made no statement about their own involvement.$lit$, 3),
  ($lit$C4b$lit$, $lit$Made no attribution of responsibility to another person.$lit$, 1),
  ($lit$C4b$lit$, $lit$Made one or more attributions and all were aligned to the source support set — select which.$lit$, 2),
  ($lit$C4b$lit$, $lit$Made one or more attributions and none were aligned to the source support set.$lit$, 3),
  ($lit$C4b$lit$, $lit$Made both aligned and non-aligned attributions — select the aligned items and record the presence of non-aligned attribution.$lit$, 4),
  ($lit$C5a$lit$, $lit$Named one or more specific corrective actions.$lit$, 1),
  ($lit$C5a$lit$, $lit$Said action was needed without naming a specific action.$lit$, 2),
  ($lit$C5a$lit$, $lit$Named no corrective action.$lit$, 3),
  ($lit$C5b1$lit$, $lit$Named who would carry out the action.$lit$, 1),
  ($lit$C5b1$lit$, $lit$Did not name who would carry out the action.$lit$, 2),
  ($lit$C5b2$lit$, $lit$Identified an available route for the corrective action — select which.$lit$, 1),
  ($lit$C5b2$lit$, $lit$Identified a route not listed by the source.$lit$, 2),
  ($lit$C5b2$lit$, $lit$Did not identify a route for the corrective action.$lit$, 3),
  ($lit$C5c$lit$, $lit$Named when the action would occur.$lit$, 1),
  ($lit$C5c$lit$, $lit$Did not name when the action would occur.$lit$, 2),
  ($lit$C6$lit$, $lit$Used one of the routes the source provides and verifiable in session — select which.$lit$, 1),
  ($lit$C6$lit$, $lit$Used an observable means the source does not list.$lit$, 2),
  ($lit$C6$lit$, $lit$Used no route in the session.$lit$, 3),
  ($lit$C7$lit$, $lit$No material-item content changed.$lit$, 1),
  ($lit$C7$lit$, $lit$Added one or more material items absent from the first account, and omitted none that had been present.$lit$, 2),
  ($lit$C7$lit$, $lit$Omitted one or more material items present in the first account, and added none.$lit$, 3),
  ($lit$C7$lit$, $lit$Both added and omitted material-item content.$lit$, 4),
  ($lit$C7$lit$, $lit$Gave no account at the test point.$lit$, 5),
  ($lit$C8a$lit$, $lit$First disclosed before the decision point.$lit$, 1),
  ($lit$C8a$lit$, $lit$First disclosed at the decision point.$lit$, 2),
  ($lit$C8a$lit$, $lit$First disclosed after the decision point.$lit$, 3),
  ($lit$C8a$lit$, $lit$Did not disclose during the observation.$lit$, 4),
  ($lit$C8b$lit$, $lit$First disclosed before any direct question about the interest.$lit$, 1),
  ($lit$C8b$lit$, $lit$First disclosed in direct response to the direct question about the interest.$lit$, 2),
  ($lit$C8b$lit$, $lit$First disclosed after the direct question, but not in direct response to it.$lit$, 3)
ON CONFLICT (capture_set_code, line_order) DO NOTHING;

-- ── 5.4 Branch rules — 10 rules ──
-- A question not served under any of these rules produces no answer and
-- no missing state. It is absent because it never applied, and the
-- composed statement must not reference it.
INSERT INTO public.t3a_d1_branch_rule (rule_code, rule_condition, rule_effect, rule_order)
VALUES
  ($lit$BR-01$lit$, $lit$Q-D1-03a returns *Corresponded* or *No account*$lit$, $lit$Neither Q-D1-03b1 nor Q-D1-03b2 is served$lit$, 1),
  ($lit$BR-02a$lit$, $lit$Q-D1-03a returns an omission, or both$lit$, $lit$Q-D1-03b1 served, bound to the source's `material_items`$lit$, 2),
  ($lit$BR-02b$lit$, $lit$Q-D1-03a returns an unsupported claim, or both$lit$, $lit$Q-D1-03b2 served, bound to `assertion_reference_set`$lit$, 3),
  ($lit$BR-03$lit$, $lit$`accountable_actor_available = false`$lit$, $lit$Q-D1-05b1 not served; its absence is not a missing state. Q-D1-05b2 unaffected$lit$, 4),
  ($lit$BR-04$lit$, $lit$`time_reference_called_for = false`$lit$, $lit$Q-D1-05c not served; absence is not a missing state$lit$, 5),
  ($lit$BR-05$lit$, $lit$Q-D1-05a returns *Did not refer to any corrective action*$lit$, $lit$Q-D1-05b1, 05b2 and 05c are not served, whatever the source offers$lit$, 6),
  ($lit$BR-06$lit$, $lit$Q-D1-04b returns *aligned to the support set* or *both aligned and non-aligned*$lit$, $lit$The bound child selection is served, identifying which items were aligned. It is served in both states, because the resolution table needs the aligned items in each$lit$, 7),
  ($lit$BR-07$lit$, $lit$Source lacks `enquiry_point`, `account_test_point` or `bearing_interest`$lit$, $lit$Q-D1-02, Q-D1-07 and Q-D1-08a respectively are not served$lit$, 8),
  ($lit$BR-08$lit$, $lit$Stage is S3 and the source sheet does not carry the enabling field — `enquiry_point`, `account_test_point` or `bearing_interest` respectively$lit$, $lit$The corresponding question is not served. This is the ordinary case for a nine-brief launch design, but it is not a Stage-level rule. A Stage 3 source that carries the enabling field — a review-exchange or panel design such as SRC-D1-S3-010 — serves that question normally. SOURCE APPLICABILITY GOVERNS. Read what each source sheet carries; never infer service or non-service from the Stage$lit$, 9),
  ($lit$BR-09$lit$, $lit$Q-D1-08a returns *Not within the observed period*$lit$, $lit$Q-D1-08b is not served$lit$, 10)
ON CONFLICT (rule_code) DO NOTHING;

