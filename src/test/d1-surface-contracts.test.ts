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

/** Strip comments so prose about a prohibition is not read as the thing. */
const code = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

const workbenchCode = code(workbench);
const reviewCode = code(review);

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

  it("offers exactly the six codes that may be applied", () => {
    const offered = [
      "not captured",
      "never asked",
      "declined",
      "no response",
      "technical failure",
      "withdrawn",
    ];
    offered.forEach((c) => expect(workbench).toContain(`"${c}"`));
  });

  it("keeps the missing state outside the answer enumeration", () => {
    // A missing state is metadata on the field, never a value inside the
    // answer list, so it is a separate control.
    const radioBlock = workbenchCode.slice(
      workbenchCode.indexOf('type="radio"'),
      workbenchCode.indexOf("Or record why no answer was captured")
    );
    expect(radioBlock).not.toMatch(/MISSING_STATE_CODES/);
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
