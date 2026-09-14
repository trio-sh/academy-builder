/**
 * D1 surface contracts — T3A-D1-EXEC-001 §8.4.
 *
 * "Layout is yours; the screens, the actions and the refusals are not."
 *
 * These assert the *must not appear* column, which is the half a later
 * edit can quietly break: a preselected answer, a free-text box, a
 * combined review-and-issue control. Server-side refusals are proved in
 * the migration run log; a control absent from a screen is not a
 * control, so nothing here stands in for those.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const WORKBENCH = "src/pages/dashboard/mentor/S1Workbench.tsx";
const workbench = read(WORKBENCH);

const REVIEW = "src/pages/dashboard/mentor/EvidenceReview.tsx";
const review = read(REVIEW);

const RECIPIENT = "src/pages/RecipientReportAccess.tsx";
const recipient = read(RECIPIENT);

const DISCLOSURES = "src/pages/dashboard/candidate/Disclosures.tsx";
const disclosures = read(DISCLOSURES);

const RECONSIDERATION = "src/pages/dashboard/mentor/Reconsideration.tsx";
const reconsideration = read(RECONSIDERATION);

const WORKSAMPLE = "src/pages/dashboard/candidate/WorkSample.tsx";
const workSample = read(WORKSAMPLE);

const GROUPSESSION = "src/pages/dashboard/mentor/GroupSession.tsx";
const groupSession = read(GROUPSESSION);

const REFCARD = "src/pages/dashboard/mentor/ReferenceCard.tsx";
const refCard = read(REFCARD);

const REPORTFACE = "src/pages/dashboard/mentor/ReportFace.tsx";
const reportFace = read(REPORTFACE);

const ACCEPTANCE = "src/pages/dashboard/mentor/AcceptanceTests.tsx";
const acceptance = read(ACCEPTANCE);

const COCKPIT = "src/pages/dashboard/mentor/Cockpit.tsx";
const cockpit = read(COCKPIT);

/** Strip comments so prose about a prohibition is not read as the thing. */
const code = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

const workbenchCode = code(workbench);
const reviewCode = code(review);
const recipientCode = code(recipient);
const disclosuresCode = code(disclosures);
const reconsiderationCode = code(reconsideration);
const workSampleCode = code(workSample);
const groupSessionCode = code(groupSession);
const refCardCode = code(refCard);
const reportFaceCode = code(reportFace);
const acceptanceCode = code(acceptance);
const cockpitCode = code(cockpit);

describe("§8.4 Stage 1 — no determination control, no AI-suggested answer", () => {
  it("offers no free-text input for a determination", () => {
    // "No free text. No summary of the response written by anyone."
    expect(workbenchCode).not.toMatch(/<textarea/i);
    expect(workbenchCode).not.toMatch(/type=["']text["']/);
  });

  it("preselects nothing", () => {
    // No defaultChecked, no defaultValue, no seeded selection state.
    expect(workbenchCode).not.toMatch(/defaultChecked/);
    expect(workbenchCode).not.toMatch(/defaultValue/);
    expect(workbenchCode).toMatch(/useState<Record<string, number>>\(\{\}\)/);
  });

  it("holds no suggestion, recommendation or highlight of an answer", () => {
    expect(workbenchCode).not.toMatch(
      /suggest|recommend|preferred|likely|bestAnswer|highlightAnswer|autoSelect/i
    );
  });

  it("renders capture lines in the register's own order, never re-sorted", () => {
    // The only ordering is the register's line_order, applied server-side.
    expect(workbenchCode).not.toMatch(/\.sort\(/);
    expect(workbenchCode).toMatch(/order\("line_order"\)/);
  });

  it("reads serving from the server rather than deciding it", () => {
    expect(workbenchCode).toMatch(/rpc\("t3a_d1_served_questions"/);
    expect(workbenchCode).toMatch(/rpc\("t3a_d1_s1_may_confirm"/);
    expect(workbenchCode).toMatch(/rpc\("t3a_d1_s1_workbench_may_open"/);
  });
});

describe("§8.1.1 What the confirmer sees — nothing else", () => {
  it("reads no other observation, prior record, rehearsal history or profile", () => {
    const forbiddenTables = [
      "t3a_observation_record",
      "t3a_rehearsal_session",
      "t3a_rehearsal_artifact",
      "candidate_profiles",
      "growth_log_entries",
      "t3a_d1_progression_decision",
    ];
    forbiddenTables.forEach((t) =>
      expect(workbenchCode).not.toContain(`from("${t}")`)
    );
  });

  it("reads only the administration run, the served source and the registers", () => {
    const permitted = [
      "t3a_d1_ai_administration_run",
      "t3a_d1_content_version",
      "t3a_d1_capture_set",
      "t3a_d1_capture_line",
      "t3a_d1_capture_resolution",
    ];
    const reads = [...workbenchCode.matchAll(/\.from\("([a-z0-9_]+)"\)/g)].map((m) => m[1]);
    reads.forEach((t) => expect(permitted).toContain(t));
  });
});

describe("§5.5 missing states — the two that may never be applied at commit", () => {
  it("does not offer `not applicable`", () => {
    // Inapplicability is expressed by non-service under the branch rules.
    expect(workbenchCode).not.toMatch(/"not applicable"/);
  });

  it("does not offer `not yet observed`", () => {
    // It describes a dimension before observation, not a field within one.
    expect(workbenchCode).not.toMatch(/"not yet observed"/);
  });

  it("offers the codes the server says are applicable, not a copy of the list", () => {
    // The list used to be hardcoded here. A copy drifts from the
    // register, so the screen now reads t3a_d1_missing_states() and
    // offers only the codes it marks applicable at commit.
    expect(workbenchCode).toMatch(/rpc\("t3a_d1_missing_states"\)/);
    expect(workbenchCode).toMatch(/filter\(\(c\) => c\.applicable_at_commit\)/);
    // And no literal list of codes remains to drift.
    expect(workbenchCode).not.toMatch(/"not captured"|"never asked"|"technical failure"/);
  });

  it("keeps the missing state outside the answer enumeration", () => {
    // A missing state is metadata on the field, never a value inside the
    // answer list, so it is a separate control.
    const radioBlock = workbenchCode.slice(
      workbenchCode.indexOf('type="radio"'),
      workbenchCode.indexOf("Or record why no answer was captured")
    );
    expect(radioBlock).not.toMatch(/missingStateCodes|missing_state/);
  });
});

describe("§8.1.1 capture and confirm are separate persisted actions", () => {
  it("offers no combined capture-and-confirm control", () => {
    expect(workbenchCode).not.toMatch(/captureAndConfirm|confirmAndCommit|commitAndProgress/i);
  });

  it("states that capturing makes the actor involved", () => {
    // Whitespace-tolerant: the sentence wraps across lines in JSX.
    expect(workbench.replace(/\s+/g, " ")).toMatch(/involved in this record/i);
  });
});

describe("§5.4 a question not served carries no answer and no missing state", () => {
  it("shows the rule that excluded it rather than an empty control", () => {
    expect(workbench).toMatch(/reason_code/);
    expect(workbench.replace(/\s+/g, " ")).toMatch(/never applied/i);
  });

  it("renders no capture control for an unserved question", () => {
    // Only servedQuestions drives the control list.
    expect(workbenchCode).toMatch(/servedQuestions\.map/);
    expect(workbenchCode).not.toMatch(/notServed\.map\([\s\S]{0,400}type="radio"/);
  });
});


describe("§8.4 Evidence review and issue — the two prohibitions", () => {
  it("offers no manual override on any checklist item", () => {
    // §6.1: "a checklist with an override is a checklist that will be
    // overridden." The word itself is permitted — the screen says No
    // override exists for any item, and the server payload carries
    // override_available: false. What must not exist is a control that
    // applies one.
    expect(reviewCode).not.toMatch(
      /setOverride|onOverride|applyOverride|handleOverride|overrideItem|waive|forceIssue|bypass|exempt/i
    );
  });

  it("never writes to the override signal, only reads it", () => {
    // override_available is the server stating there is none. Nothing
    // here assigns it.
    expect(reviewCode).not.toMatch(/override_available\s*[:=]\s*true/);
  });

  it("offers no combined review-and-issue control", () => {
    // §6.1 item 19: reviewing makes an actor involved, so the reviewer
    // can never issue the report they reviewed. One control doing both
    // would make that impossible to honour.
    expect(reviewCode).not.toMatch(/reviewAndIssue|completeAndIssue|issueReport|issueNow/i);
  });

  it("records only the three checklist outcomes, with no fourth", () => {
    expect(reviewCode).toMatch(/\["pass", "fail", "not_established"\] as const/);
  });

  it("treats not_established as blocking rather than as a pass", () => {
    expect(review.replace(/\s+/g, " ")).toMatch(/not established is not a pass/i);
  });

  it("reads the block verdict from the server rather than computing it", () => {
    expect(reviewCode).toMatch(/rpc\("t3a_d1_review_blocks_issuance"/);
  });

  it("offers no edit or delete of a recorded result", () => {
    // Review results are append-only server-side, so no control is
    // offered that would fail.
    expect(reviewCode).not.toMatch(/\.update\(|\.delete\(|\.upsert\(/);
  });

  it("states plainly that no override exists", () => {
    expect(review.replace(/\s+/g, " ")).toMatch(/No override exists for any item/i);
  });
});

describe("§6.3 the traceability sheet is never part of the report face", () => {
  it("renders on the evidence-review surface, one of its permitted targets", () => {
    expect(reviewCode).toMatch(/t3a_d1_statement_trace/);
  });

  it("says a sentence with no trace should not issue", () => {
    expect(review.replace(/\s+/g, " ")).toMatch(
      /no trace is not defensible and should not issue/i
    );
  });
});


describe("§8.4 Named recipient — the longest must-not-appear list", () => {
  it("requires no account and reads none", () => {
    // "A recipient does not need an approved employer account, and an
    // approved employer account does not give access to anything."
    expect(recipientCode).not.toMatch(/useAuth|ProtectedRoute|signIn|signUp|session\?/);
    expect(recipientCode).not.toMatch(/employer_profiles|t3a_employer_application/);
  });

  it("reads no full record and no traceability sheet", () => {
    ["t3a_d1_statement_trace", "t3a_observation_record", "t3a_d1_composed_statement"].forEach(
      (t) => expect(recipientCode).not.toContain(`from("${t}")`)
    );
  });

  it("reads no table at all", () => {
    // It used to read the global block schedule and controlled-text
    // register, which is how a valid recipient ended up seeing
    // boilerplate instead of their report. Everything now arrives
    // through the token-scoped route, so there is no table read left to
    // reach past one report into another.
    const reads = [...recipientCode.matchAll(/\.from\("([a-z0-9_]+)"\)/g)].map((m) => m[1]);
    expect(reads).toEqual([]);
  });

  it("offers no search", () => {
    expect(recipientCode).not.toMatch(/search|query|filter|browse|\.ilike\(|\.textSearch\(/i);
  });

  it("offers no export beyond the report face", () => {
    // `export default` is the module keyword, not an export feature, so
    // the assertion names the affordances rather than the word.
    expect(recipientCode).not.toMatch(
      /download|toPDF|toPdf|printReport|window\.print|csv|Blob\(|createObjectURL|exportReport|saveAs/i
    );
  });

  it("returns a state and no content for every refused path", () => {
    // Each refusal is copy only; none of them renders the report face.
    ["REVOKED", "EXPIRED", "SUPERSEDED", "ADDRESS_NOT_VERIFIED", "UNKNOWN_TOKEN"].forEach(
      (s) => expect(recipient).toContain(s)
    );
    // The face renders only where the server said content is permitted.
    expect(recipientCode).toMatch(/result\?\.content &&/);
  });

  it("verifies status only, never content", () => {
    expect(recipientCode).toMatch(/rpc\("t3a_d1_verify_status"/);
    expect(recipient.replace(/\s+/g, " ")).toMatch(/returns no content/i);
  });

  it("refuses the whole face where a mandatory block's text is absent", () => {
    // §6.2. The assembler refuses the face rather than dropping a block,
    // and the page carries that refusal through rather than rendering a
    // short report that looks complete.
    expect(recipientCode).toMatch(/faceRefusal/);
    expect(recipient.replace(/\s+/g, " ")).toMatch(
      /this report face is incomplete and is not a valid rendering. Nothing partial is shown/i
    );
  });

  it("renders no placeholder for a block that did not fire", () => {
    // Block 11 remains EMPTY and NO EMPTY LABEL OR PLACEHOLDER RENDERS.
    // Which blocks fired is the server's answer, read here.
    expect(recipientCode).toMatch(/if \(!b\.renders\) return null;/);
    expect(recipientCode).not.toMatch(/renders_always/);
  });
});


describe("§8.4 Participant pathway — the two standing prohibitions", () => {
  it("shows no score, rank, readiness indicator or progress percentage", () => {
    expect(disclosuresCode).not.toMatch(
      /score|rank|readiness|percentComplete|progressPercent|current_tier|readiness_tier/i
    );
  });

  it("shows no mentor pool, list, name, count or availability", () => {
    // "Any mentor pool, list, name, count or availability before
    // assignment" is prohibited, and this surface has no business
    // reading a mentor at all.
    expect(disclosuresCode).not.toMatch(/mentor_profiles|mentor_assignments|availability/i);
  });

  it("reads only the participant's own reports and releases", () => {
    const reads = [...disclosuresCode.matchAll(/\.from\("([a-z0-9_]+)"\)/g)].map((m) => m[1]);
    expect([...new Set(reads)].sort()).toEqual(
      ["t3a_d1_ber_report", "t3a_d1_release_token"].sort()
    );
  });

  it("offers revoke on a live release and nothing on a dead one", () => {
    expect(disclosuresCode).toMatch(/state\.live \?/);
    expect(disclosuresCode).toMatch(/onRevoke/);
  });

  it("states that a release covers one version only", () => {
    expect(disclosures.replace(/\s+/g, " ")).toMatch(
      /A release covers one report at one version/i
    );
  });

  it("states that the recipient needs no account", () => {
    expect(disclosures.replace(/\s+/g, " ")).toMatch(
      /do not need an account, and having one gives them nothing extra/i
    );
  });
});

describe("§8.4 Request a mentor — no pool before assignment", () => {
  const dashboard = read("src/pages/dashboard/CandidateDashboard.tsx");

  it("constrains every mentor read to identifiers drawn from an assignment", () => {
    // The prohibition is a *pool*: a list, a count, an availability view.
    // The invariant that rules it out is that no read of mentor_profiles
    // is unbounded — each one filters on an id the participant's own
    // assignment supplied. There are three such reads; all three must
    // hold, so the assertion walks them rather than checking the first.
    const reads = [...dashboard.matchAll(/\.from\("mentor_profiles"\)/g)].map((m) => m.index ?? 0);
    expect(reads.length).toBeGreaterThan(0);

    reads.forEach((idx) => {
      // The id constraint follows the .from() within the same call chain.
      const after = dashboard.slice(idx, idx + 260);
      expect(after).toMatch(/\.(eq|in)\("id",/);
    });
  });

  it("derives those identifiers from the participant's own assignment", () => {
    const reads = [...dashboard.matchAll(/\.from\("mentor_profiles"\)/g)].map((m) => m.index ?? 0);
    reads.forEach((idx) => {
      const before = dashboard.slice(Math.max(0, idx - 1400), idx);
      expect(before).toMatch(/mentor_assignments|activeAssignment/);
    });
  });

  it("never selects mentors without an identifier filter", () => {
    // An unbounded select over mentor_profiles would be a pool.
    expect(dashboard).not.toMatch(
      /from\("mentor_profiles"\)\s*\.select\([^)]*\)\s*(;|\.order|\.limit)/
    );
  });
});


describe("§8.4 Correction and reconsideration — the two prohibitions", () => {
  it("never decides eligibility on the client", () => {
    // Assignment to an involved actor is refused at the data layer, and
    // this screen reads that verdict rather than reimplementing it.
    expect(reconsiderationCode).toMatch(/rpc\("t3a_d1_reconsiderer_eligible"/);
    expect(reconsiderationCode).not.toMatch(/t3a_d1_involvement|involving_action\s*===/);
  });

  it("shows the outcome control only where the server said so", () => {
    // An involved actor never sees an action they would be refused.
    expect(reconsiderationCode).toMatch(/mineToDecide && eligibility\?\.eligible &&/);
  });

  it("offers no in-place edit of a composed statement", () => {
    ["t3a_d1_composed_statement", "t3a_composed_statement", "statement_body"].forEach((t) =>
      expect(reconsiderationCode).not.toContain(t)
    );
    expect(reconsiderationCode).not.toMatch(/\.update\(|\.upsert\(|\.delete\(/);
  });

  it("records only the three outcomes, each requiring reasoning", () => {
    expect(reconsiderationCode).toMatch(/"upheld"[\s\S]{0,200}"amended"[\s\S]{0,200}"withdrawn"/);
    expect(reconsiderationCode).toMatch(/reasoning\.trim\(\)\.length < 8/);
  });

  it("states that an amendment supersedes rather than rewrites", () => {
    expect(reconsideration.replace(/\s+/g, " ")).toMatch(
      /supersedes the statement and the earlier version stays in the audit history/i
    );
  });

  it("states that reconsidering makes the actor involved", () => {
    expect(reconsideration.replace(/\s+/g, " ")).toMatch(
      /makes you involved in it from now on/i
    );
  });

  it("reads only the case and its assignment", () => {
    const reads = [...reconsiderationCode.matchAll(/\.from\("([a-z0-9_]+)"\)/g)].map((m) => m[1]);
    expect([...new Set(reads)].sort()).toEqual(
      ["t3a_correction_case", "t3a_reconsideration_assignment"].sort()
    );
  });
});


describe("§8.2 Stage 3 — the three declarations, verbatim and closed", () => {
  it("renders the controlled wording exactly", () => {
    expect(workSample).toContain("The work I am submitting is my own.");
    expect(workSample).toContain("I received help from another person on this work.");
    expect(workSample).toContain(
      "I used a software tool, including any artificial-intelligence tool, on this work."
    );
  });

  it("offers the controlled assistance list and nothing else", () => {
    ["a colleague", "a manager", "a friend or family member", "a tutor or coach", "someone else"]
      .forEach((o) => expect(workSample).toContain(`"${o}"`));
  });

  it("offers the controlled tooling list and nothing else", () => {
    ["drafting or writing", "calculation or analysis", "formatting or layout",
     "checking or review", "something else"]
      .forEach((o) => expect(workSample).toContain(`"${o}"`));
  });

  it("has no free-text route in any declaration", () => {
    // The only text input is the artifact reference. Each declaration is
    // a boolean plus, where it applies, one controlled selection.
    const textInputs = [...workSampleCode.matchAll(/<(input|textarea)\b[^>]*/g)].map((m) => m[0]);
    const freeText = textInputs.filter(
      (t) => t.startsWith("<textarea") || (!/type="(checkbox|radio)"/.test(t))
    );
    expect(freeText).toHaveLength(1);
    expect(freeText[0]).toMatch(/artifactRef/);
  });

  it("requires the attestation to be affirmed before submit", () => {
    expect(workSampleCode).toMatch(/authorship &&/);
  });

  it("requires both other declarations to be answered", () => {
    expect(workSampleCode).toMatch(/assistance !== null/);
    expect(workSampleCode).toMatch(/tooling !== null/);
  });
});

describe("§8.4 Stage 3 — no grade and no artifact on a report face", () => {
  it("records no grade or quality judgment", () => {
    // The words appear in the copy that *denies* a grade — "It is not
    // graded", "no judgment about its quality is recorded". What must
    // not exist is a field or control that holds one, so the assertion
    // names those rather than the vocabulary.
    expect(workSampleCode).not.toMatch(
      /setGrade|gradeValue|quality_score|qualityScore|rubric|ratingValue|setRating|\bmarks?\s*[:=]|assessment_score/i
    );
    // And no such column is ever written.
    expect(workSampleCode).not.toMatch(
      /(grade|quality|rating|score)\s*:\s*(?!.*not)/i
    );
  });

  it("states that the work is not graded", () => {
    expect(workSample.replace(/\s+/g, " ")).toMatch(/It is not graded/i);
  });

  it("states that a decline is not an outcome and collects no reason", () => {
    expect(workSample.replace(/\s+/g, " ")).toMatch(/decline without giving a reason/i);
    expect(workSample.replace(/\s+/g, " ")).toMatch(/it is not an outcome/i);
  });

  it("states that a missed deadline is not adverse and uses no attempt", () => {
    expect(workSample.replace(/\s+/g, " ")).toMatch(
      /composes no statement, is not adverse, and does not use up an attempt/i
    );
  });

  it("runs the provenance check server-side rather than locally", () => {
    expect(workSampleCode).toMatch(/rpc\("t3a_d1_work_sample_provenance_check"/);
  });

  it("reads only its own submissions table", () => {
    const reads = [...workSampleCode.matchAll(/\.from\("([a-z0-9_]+)"\)/g)].map((m) => m[1]);
    expect([...new Set(reads)]).toEqual(["t3a_d1_work_sample_submission"]);
  });
});

describe("§8.3/§8.4 Stage 4 shared session — one lane, and it is the observed participant's", () => {
  // The co-participant block, taken as a region of the file rather than
  // searched for words: the page's own copy says a co-participant gets
  // no determination and no progression, so word-matching would fail on
  // the sentence that denies the thing. What must not exist is a
  // control, so the assertions name controls.
  const coParticipantBlock = groupSessionCode.slice(
    groupSessionCode.indexOf("coParticipants.map"),
    groupSessionCode.indexOf("§ III · Pre-briefs")
  );

  it("isolates a co-participant block to assert against", () => {
    expect(coParticipantBlock.length).toBeGreaterThan(200);
  });

  it("renders a capture lane for the observed participant and for nobody else", () => {
    // capture_lanes is the count the server returns. It is read once, in
    // the observed participant's row.
    // Once in the verdict type, and once in the render — the observed
    // participant's row.
    const lanes = [...groupSessionCode.matchAll(/capture_lanes/g)];
    expect(lanes).toHaveLength(2);
    expect(groupSessionCode).toMatch(/capture_lanes\?: number;/);
    const rendered = [
      ...groupSessionCode.matchAll(/verdicts\[([a-zA-Z.?_]+)\]\?\.capture_lanes/g),
    ].map((m) => m[1]);
    expect(rendered).toEqual(["observed.participant_id"]);
    expect(coParticipantBlock).not.toMatch(/capture_lanes/);
  });

  it("offers a co-participant no action but recording that they dropped out", () => {
    const handlers = [...coParticipantBlock.matchAll(/onClick=\{[^}]*\}/g)].map((m) => m[0]);
    expect(handlers.length).toBeGreaterThan(0);
    for (const h of handlers) {
      expect(h).toMatch(/onMemberEvent\(m\.participant_id, "disconnect"\)/);
    }
    // No determination, progression or composition route of any kind.
    expect(coParticipantBlock).not.toMatch(
      /rpc\(|\.insert\(|\.update\(|\.upsert\(|setOutcome|setDetermination|progress/i
    );
  });

  it("asks the server whether a lane exists rather than deciding locally", () => {
    expect(groupSessionCode).toMatch(/rpc\("t3a_d1_group_capture_permitted"/);
    // permitted is read from the server's verdict, never assigned here.
    expect(groupSessionCode).not.toMatch(/permitted:\s*true/);
  });

  it("calls only the two governed session routines", () => {
    const rpcs = [...groupSessionCode.matchAll(/rpc\("([a-z0-9_]+)"/g)].map((m) => m[1]);
    expect([...new Set(rpcs)].sort()).toEqual([
      "t3a_d1_group_capture_permitted",
      "t3a_d1_group_member_event",
    ]);
  });

  it("reads only the two shared-session tables", () => {
    const reads = [...groupSessionCode.matchAll(/\.from\("([a-z0-9_]+)"\)/g)].map((m) => m[1]);
    expect([...new Set(reads)].sort()).toEqual([
      "t3a_d1_group_session",
      "t3a_d1_group_session_member",
    ]);
  });

  it("has no recording or media control of any kind", () => {
    // RECORDING consent is not granted at any Stage in D1, so there is
    // no capture device, no upload and no media element here. "Record a
    // disconnection" is a ledger entry, not a recording, so the check
    // names devices and elements rather than the word.
    expect(groupSession).not.toMatch(
      /MediaRecorder|getUserMedia|getDisplayMedia|<video|<audio|startRecording|type="file"/i
    );
  });

  it("states that no participant sees a lane, the observed one included", () => {
    expect(groupSession.replace(/\s+/g, " ")).toMatch(
      /No participant sees any determination, record, capture lane or progression, at any point, by any route — including the person being observed/
    );
  });

  it("states that nothing is recorded about a co-participant", () => {
    expect(groupSession.replace(/\s+/g, " ")).toMatch(
      /Nothing is recorded about this person from this session/
    );
  });

  it("treats a co-participant leaving as an administration variance, not a judgment", () => {
    expect(groupSession.replace(/\s+/g, " ")).toMatch(
      /administration variance on the observed participant's record — never as a judgment about the person who left/
    );
  });

  it("settles accommodation before composition rather than during the session", () => {
    expect(groupSession.replace(/\s+/g, " ")).toMatch(
      /Accommodation needs are settled before a session is composed, never during it/
    );
  });
});

describe("§5.3/§1.5 The mentor reference card — it holds no better line", () => {
  it("holds no expected response, strong answer or red flag", () => {
    // The card's own §VI says it holds none of these, so a word-match
    // would fail on the sentence that says so. What must not exist is a
    // field or a rendering that marks one line above another, and those
    // are what the assertion names.
    expect(refCardCode).not.toMatch(
      /expected_response|expectedResponse|strongAnswer|strong_answer|red_?[Ff]lag|preferredLine|preferred_line|isPreferred|correctLine|modelAnswer|lineWeight|lineScore/
    );
  });

  it("renders every line identically, with no emphasis carried by position", () => {
    // One className expression covers all lines, and it contains no
    // conditional. A line cannot be highlighted without changing this.
    const lineBlock = refCardCode.slice(
      refCardCode.indexOf("(s.lines ?? []).map"),
      refCardCode.indexOf("</ul>")
    );
    expect(lineBlock).toMatch(/l\.line_text/);
    expect(lineBlock).not.toMatch(/line_order\s*===|line_order\s*==|\?\s*"[^"]*"\s*:/);
  });

  it("never sorts, filters or reorders the lines it is given", () => {
    expect(refCardCode).not.toMatch(/\.sort\(|\.reverse\(|lines\.filter\(/);
  });

  it("assembles nothing — the card is the server's, whole", () => {
    expect(refCardCode).toMatch(/rpc\("t3a_d1_reference_card"/);
    const rpcs = [...refCardCode.matchAll(/rpc\("([a-z0-9_]+)"/g)].map((m) => m[1]);
    expect([...new Set(rpcs)]).toEqual(["t3a_d1_reference_card"]);
  });

  it("reads only the source index, and never a determination or a record", () => {
    const reads = [...refCardCode.matchAll(/\.from\("([a-z0-9_]+)"\)/g)].map((m) => m[1]);
    expect([...new Set(reads)]).toEqual(["t3a_content_object"]);
  });

  it("shows a malformed source list as refused rather than as a list", () => {
    // §1.5: sections 2 and 3 are the lists a claim is checked against. A
    // wrong list is worse than an absent one.
    expect(refCardCode).toMatch(/list\.well_formed \?/);
    expect(refCardCode).toMatch(/list\.refusal_code/);
  });

  it("states that the source is not registered for serving", () => {
    expect(refCardCode).toMatch(/operational_state !== "serving"/);
  });

  it("supplies no question the script does not state", () => {
    expect(refCard.replace(/\s+/g, " ")).toMatch(
      /The card shows only what the script states and supplies nothing/
    );
  });

  it("carries the four sentences §1.5 gives as the reason", () => {
    const flat = refCard.replace(/\s+/g, " ");
    expect(flat).toMatch(
      /no expected response, no strong answer, no red flag and nothing indicating which capture line is the better one/
    );
    expect(flat).toMatch(/agreeing with each other about the participant rather than about what happened/);
    expect(flat).toMatch(/a defensible choice, not a right one/);
    expect(flat).toMatch(/the record stops describing conduct and starts scoring judgment/);
  });
});

describe("§6 The report face — eleven blocks, and nothing behind them", () => {
  it("never reads or renders the traceability sheet", () => {
    // §6.3. The face carries the string NEVER_PART_OF_THE_REPORT_FACE, so
    // the assertion names the registers rather than the word.
    expect(reportFaceCode).not.toMatch(
      /t3a_d1_traceability_field|t3a_d1_statement_trace|trace_body|sentence_ref|field_no/
    );
  });

  it("carries no mentor, observer, confirmer or composer identity", () => {
    // Block 5: mentor names never render. The assembly never selects one,
    // so there is nothing here to strip.
    expect(reportFaceCode).not.toMatch(
      /observer_id|confirmer_id|composed_by|reviewed_by|mentor_name|mentorName/
    );
  });

  it("renders a controlled text with no substitution step", () => {
    // §6.2 — verbatim. Printed as it arrives.
    expect(reportFaceCode).toMatch(/\{b\.controlled_text\}/);
    expect(reportFaceCode).not.toMatch(
      /controlled_text\.replace|controlled_text\s*\+|interpolat|template\(/i
    );
  });

  it("shows a conditional block that did not fire, with its reason", () => {
    expect(reportFaceCode).toMatch(/not_rendering_reason/);
    // The block is rendered, not filtered out of the list.
    expect(reportFaceCode).not.toMatch(/blocks\s*\?\?\s*\[\]\)\.filter\(/);
  });

  it("offers no override on a blocked report", () => {
    expect(reportFaceCode).not.toMatch(
      /setOverride|onOverride|applyOverride|forceIssue|issueAnyway|bypass|waive/i
    );
  });

  it("holds no score, rank or readiness indicator", () => {
    expect(reportFaceCode).not.toMatch(
      /score|rank|readiness|percentile|rating|grade|band/i
    );
  });

  it("assembles nothing locally — one routine, and the report index", () => {
    const rpcs = [...reportFaceCode.matchAll(/rpc\("([a-z0-9_]+)"/g)].map((m) => m[1]);
    expect([...new Set(rpcs)]).toEqual(["t3a_d1_report_face"]);
    const reads = [...reportFaceCode.matchAll(/\.from\("([a-z0-9_]+)"\)/g)].map((m) => m[1]);
    expect([...new Set(reads)]).toEqual(["t3a_d1_ber_report"]);
  });

  it("states that an unreached review item is not a pass", () => {
    expect(reportFace.replace(/\s+/g, " ")).toMatch(
      /An item that has not been reached is not a pass/
    );
  });
});

describe("§11 Acceptance tests — a specification is not a passed test", () => {
  it("keeps the register and the evidence as two separate reads", () => {
    const reads = [...acceptanceCode.matchAll(/\.from\("([a-z0-9_]+)"\)/g)].map((m) => m[1]);
    expect([...new Set(reads)].sort()).toEqual([
      "t3a_d1_acceptance_evidence",
      "t3a_d1_acceptance_test",
    ]);
  });

  it("offers no control that records or changes an outcome", () => {
    // The page reads. Nothing on it writes, because a result that could
    // be set from a screen would not be evidence of anything.
    expect(acceptanceCode).not.toMatch(
      /\.insert\(|\.update\(|\.upsert\(|\.delete\(|setOutcome|markPass|recordPass|onPass/i
    );
  });

  it("reads the completeness gate rather than computing it", () => {
    expect(acceptanceCode).toMatch(/rpc\("t3a_d1_acceptance_evidence_complete"/);
    // No local pass-count arithmetic standing in for the gate.
    expect(acceptanceCode).not.toMatch(/filter\([^)]*outcome === "pass"[^)]*\)\.length/);
  });

  it("treats a test with no evidence as having none, not as a pass", () => {
    expect(acceptanceCode).toMatch(/e \? OUTCOME_LABEL\[e\.outcome\] : "No evidence recorded"/);
    // No default outcome anywhere.
    expect(acceptanceCode).not.toMatch(/outcome\s*(\?\?|\|\|)\s*"pass"|outcome = "pass"/);
  });

  it("offers exactly the four outcomes the register allows", () => {
    const labels = acceptanceCode.slice(
      acceptanceCode.indexOf("OUTCOME_LABEL"),
      acceptanceCode.indexOf("};", acceptanceCode.indexOf("OUTCOME_LABEL"))
    );
    expect(labels).toMatch(/pass:/);
    expect(labels).toMatch(/fail:/);
    expect(labels).toMatch(/not_executed:/);
    expect(labels).toMatch(/blocked_by_conflict:/);
  });

  it("offers no override on the gate", () => {
    expect(acceptanceCode).not.toMatch(
      /setOverride|onOverride|applyOverride|forceComplete|waive|bypass/i
    );
  });

  it("names the tests without a pass rather than only counting them", () => {
    expect(acceptanceCode).toMatch(/without_a_pass/);
  });

  it("states the five things §11 forbids as a resolution", () => {
    expect(acceptance.replace(/\s+/g, " ")).toMatch(
      /not resolved by hiding a field, adding free text, introducing a default, combining controls, or reducing either live view/
    );
  });

  it("states that evidence is append-only", () => {
    expect(acceptance.replace(/\s+/g, " ")).toMatch(
      /a test that once failed does not become a test that always passed/
    );
  });
});

describe("§3 Mentor Cockpit — six regions, and no smaller version of them", () => {
  it("refuses below the supported minimum rather than reflowing", () => {
    // Build 065: live capture must refuse, not degrade. The refusal is a
    // return before the layout, so no reduced view can render under it.
    expect(cockpitCode).toMatch(/rpc\("t3a_d1_s2_capture_permitted"/);
    expect(cockpitCode).toMatch(/if \(viewportGate && !viewportGate\.permitted\)/);
  });

  it("decides neither the viewport nor the live-view state locally", () => {
    // No local threshold arithmetic standing in for the server's answer.
    expect(cockpitCode).not.toMatch(/innerWidth\s*[<>]=?\s*\d|innerHeight\s*[<>]=?\s*\d/);
    expect(cockpitCode).not.toMatch(/1280|800(?![0-9])/);
  });

  it("holds the six regions in the arrangement build 057 fixes", () => {
    const body = cockpitCode.slice(
      cockpitCode.indexOf('grid grid-cols-2'),
      cockpitCode.indexOf("After-commit follow-through")
    );
    const order = [
      "Participant — Live View",
      "Mentor — Live View",
      "Pane 1 — Source and Script",
      "Pane 2 — Determination Capture",
    ].map((label) => body.indexOf(label));
    expect(order.every((i) => i >= 0)).toBe(true);
    // Participant above mentor; source above capture.
    expect(order[0]).toBeLessThan(order[1]);
    expect(order[2]).toBeLessThan(order[3]);
  });

  it("has no responsive breakpoint that would reduce a live view", () => {
    const body = cockpitCode.slice(
      cockpitCode.indexOf('grid grid-cols-2'),
      cockpitCode.indexOf("After-commit follow-through")
    );
    expect(body).not.toMatch(/\b(sm|md|lg|xl|2xl):/);
    expect(body).not.toMatch(/hidden|collapse|overlay/);
  });

  it("shows no recording indicator, because D1 grants no recording consent", () => {
    // t3a_d1_consent_type records RECORDING as unavailable in D1.
    expect(cockpitCode).not.toMatch(/\bREC\b|isRecording|recordingActive|MediaRecorder/);
  });

  it("records an administration variance at the beat, not only at session end", () => {
    expect(cockpitCode).toMatch(/t3a_d1_s2_administration_variance/);
    expect(cockpitCode).toMatch(/beat_code: varianceBeat/);
    // The control lives in the script pane, beside the beat it concerns.
    const pane1 = cockpitCode.slice(
      cockpitCode.indexOf("Pane 1 — Source and Script"),
      cockpitCode.indexOf("Pane 2 — Determination Capture")
    );
    expect(pane1).toMatch(/onRecordVariance/);
  });

  it("holds none of the §3.4 prohibitions", () => {
    expect(cockpitCode).not.toMatch(
      /readiness|percentile|traitLabel|trait_label|prediction|employability|coverageMeter|coverage_meter|trafficLight|progressPercent|suitability/i
    );
  });
});

describe("§3.4/§8.4 The participant pathway holds no scoring route", () => {
  const CANDIDATE = "src/pages/dashboard/CandidateDashboard.tsx";
  const candidate = read(CANDIDATE);
  const candidateCode = code(candidate);

  it("mounts no route to the speech-and-AI-scoring assessment", () => {
    // The component captured microphone speech and produced per-dimension
    // AI scores, mounted as the participant's "S1 Session". D1 grants no
    // RECORDING consent at any Stage, S1 is administered and then
    // confirmed by an authorized human, and §3.4 forbids a score about
    // conduct. The route is withdrawn; the component is left in the tree.
    expect(candidateCode).not.toMatch(/<Route[^>]*InteractiveSkillAssessment/);
    expect(candidateCode).not.toMatch(/to="\/dashboard\/candidate\/observations\/session"/);
  });

  it("offers the participant no control that starts a Stage 1 session", () => {
    // S1 is arranged for the participant. A button implying otherwise is
    // the thing that made the scoring route reachable in the first place.
    expect(candidateCode).not.toMatch(/Begin S1 Session|Continue S1 Session/);
  });

  it("renders no score count or progress indicator for a Stage", () => {
    expect(candidateCode).not.toMatch(/dimensions scored|ScoredDims\.size/);
  });
});

describe("Report face — entitlement, not identifier possession", () => {
  it("the recipient page reads the released report, not the global schedule", () => {
    // It used to load t3a_d1_report_block and the controlled-text
    // register after redeeming, so every valid recipient saw boilerplate
    // and a render-behaviour string instead of their report.
    expect(recipientCode).toMatch(/rpc\("t3a_d1_report_face_for_release"/);
    const reads = [...recipientCode.matchAll(/\.from\("([a-z0-9_]+)"\)/g)].map((m) => m[1]);
    expect(reads).toEqual([]);
  });

  it("the recipient page renders only blocks the server says render", () => {
    expect(recipientCode).toMatch(/if \(!b\.renders\) return null;/);
    // And it decides nothing about which blocks those are.
    expect(recipientCode).not.toMatch(/renders_always/);
  });

  it("the release form issues a release rather than announcing one", () => {
    // It previously prevented the submit and showed a success toast,
    // creating no consent and no token, so there was nothing to redeem.
    expect(disclosuresCode).toMatch(/rpc\("t3a_d1_issue_release_token"/);
    expect(disclosuresCode).toMatch(/if \(!result\?\.issued\)/);
  });

  it("the release link is held only until it is shown", () => {
    // Stored as a hash server-side; the page keeps it in state and says
    // it cannot be recovered.
    expect(disclosures.replace(/\s+/g, " ")).toMatch(
      /stored only as a hash, so it cannot be recovered afterwards/
    );
  });
});

describe("REC-07 Source approval — a signature, not a calculation", () => {
  const APPROVAL = "src/pages/dashboard/mentor/SourceApproval.tsx";
  const approval = read(APPROVAL);
  const approvalCode = code(approval);

  it("records an approval only through the governed route", () => {
    expect(approvalCode).toMatch(/rpc\("t3a_d1_record_source_approval"/);
    // Never a direct write to the approval table.
    expect(approvalCode).not.toMatch(
      /from\("t3a_d1_source_approval"\)\s*\.\s*(insert|update|upsert|delete)/
    );
  });

  it("offers no approve-all control", () => {
    // A control that approves forty at once approves forty unread.
    expect(approvalCode).not.toMatch(
      /approveAll|bulkApprove|selectAll|approveEvery|\.map\([^)]*onRecord\([^)]*"approved"/
    );
  });

  it("offers no edit to a source", () => {
    // Approving is not editing. A screen offering both invites a
    // correction recorded as an approval.
    expect(approvalCode).not.toMatch(/<textarea|contentEditable|updateSource|editSource/i);
  });

  it("cannot offer approval for a version carrying no hash", () => {
    expect(approvalCode).toMatch(/disabled=\{working === s\.content_object_id \|\| !hash\}/);
  });

  it("withdraws by recording a withdrawal rather than erasing", () => {
    expect(approvalCode).toMatch(/"withdrawn"/);
    expect(approval.replace(/\s+/g, " ")).toMatch(
      /Withdrawing does not erase an approval/
    );
  });
});

describe("§3.3 The live views — measured here, judged by the server", () => {
  const LIVEVIEW = "src/lib/liveView.ts";
  const liveView = read(LIVEVIEW);
  const liveViewCode = code(liveView);

  it("holds no threshold of its own", () => {
    // §3.3 sets three, ten and five seconds, and
    // t3a_d1_s2_live_view_state holds them. A second opinion in the
    // client is how a session continues as if conditions were intact.
    expect(liveViewCode).toMatch(/rpc\("t3a_d1_s2_live_view_state"/);
    expect(liveViewCode).not.toMatch(/>=\s*3\b|>=\s*10\b|>=\s*5\b/);
  });

  it("treats a view with no track as unavailable, not as available", () => {
    // Saying AVAILABLE before a track arrives is a claim, not an
    // observation.
    expect(liveViewCode).toMatch(/NO_TRACK_PRESENTED/);
    expect(liveViewCode).toMatch(/state: "UNAVAILABLE"/);
  });

  it("restarts the restoration count on any gap", () => {
    // Restoration must be five CONSECUTIVE seconds; one good second
    // after a gap starts them again.
    expect(liveViewCode).toMatch(/secondsOfDecodedFrames\.current = 0;/);
  });

  it("records and retains nothing", () => {
    expect(liveViewCode).not.toMatch(
      /MediaRecorder|getUserMedia|getDisplayMedia|createObjectURL|new Blob|upload/i
    );
  });

  it("binds to no media vendor", () => {
    // It takes a MediaStream, so the provider decision stays open.
    expect(liveViewCode).not.toMatch(/livekit|daily-co|twilio|agora|opentok|zoom/i);
  });

  it("the cockpit displays a stream without recording one", () => {
    expect(cockpitCode).toMatch(/useLiveViewMonitor/);
    expect(cockpitCode).toMatch(/<video/);
    expect(cockpitCode).not.toMatch(/MediaRecorder|getDisplayMedia|captureStream/);
  });
});

describe("Two review findings on #284, and what they were", () => {
  const APPROVAL = "src/pages/dashboard/mentor/SourceApproval.tsx";
  const approvalCode = code(read(APPROVAL));

  it("derives approval standing from the latest event at this version", () => {
    // The table is append-only, so a withdrawal leaves the approved row
    // in place. Finding any approved row reported a withdrawn source as
    // approved, and ignored which version it belonged to.
    expect(approvalCode).toMatch(/const standing = \(sourceId: string, versionId: string \| undefined\)/);
    expect(approvalCode).toMatch(/a\.source_version_id === versionId/);
    expect(approvalCode).toMatch(/latest\.status === "approved"/);
    // And no predicate that would match a historical row.
    expect(approvalCode).not.toMatch(/approvals\.find\(\([^)]*\) =>[^;]*status === "approved"\)/);
  });

  it("the cockpit reports each live-view verdict rather than only painting it", () => {
    // A verdict that drives a banner and nothing else is not a rule.
    expect(cockpitCode).toMatch(/rpc\("t3a_d1_s2_report_live_view"/);
    expect(cockpitCode).toMatch(/p_view: "participant"/);
    expect(cockpitCode).toMatch(/p_view: "mentor"/);
  });

  it("the commit control is blocked while advancement is", () => {
    expect(cockpitCode).toMatch(
      /participantView\.source_advancement_blocked === true/
    );
  });
});
