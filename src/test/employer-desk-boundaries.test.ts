/**
 * Employer Desk boundaries — T3A-DEV-CN-EMP-001.
 *
 * These assert the boundaries the change note draws, in the form the
 * client can check. The server-side proofs live in the migration run log
 * (docs/employer-desk/CN-EMP-001-implementation-return.md); a control
 * absent from a screen is not a control, so nothing here stands in for
 * those.
 */
import { describe, it, expect } from "vitest";
import {
  controlledText,
  VERIFICATION_MARK_TEXT,
  VERIFICATION_VALUE_TEXT,
  VERIFICATION_FIELD_LABEL,
  APPROVER_NOT_RECORDED,
  FEEDBACK_CATEGORIES,
  type ControlledTextId,
} from "@/lib/employerDeskText";

const ALL_IDS: ControlledTextId[] = [
  "L-EMP-WELCOME-001",
  "L-EMP-TILE01-001",
  "L-EMP-TILE01-EMPTY",
  "L-EMP-TILE02-001",
  "L-EMP-POOL-001",
  "L-EMP-POOL-002",
  "L-EMP-POOL-EMPTY",
  "L-EMP-POOL-NOMATCH",
  "L-EMP-DISC-001",
  "L-EMP-DISC-002",
  "L-EMP-FDBK-001",
  "L-EMP-FDBK-BOUNDARY",
  "L-EMP-SECTION-HEADING",
];

const employerFacingText = (): string =>
  ALL_IDS.map((id) => (controlledText(id) ?? []).join(" ")).join(" ");

describe("Item 1 — the welcome block", () => {
  it("renders the three controlled lines verbatim", () => {
    const lines = controlledText("L-EMP-WELCOME-001");
    expect(lines).not.toBeNull();
    expect(lines).toHaveLength(3);
    expect(lines![0]).toBe(
      "Welcome to the evidence people chose to place in your hands."
    );
  });

  it("carries no salutation and no account name placeholder", () => {
    const text = (controlledText("L-EMP-WELCOME-001") ?? []).join(" ");
    expect(text).not.toMatch(/welcome back/i);
    expect(text).not.toMatch(/\{|\}|\$\{/);
  });

  it("does not promise complete disclosure", () => {
    expect(employerFacingText()).not.toMatch(/nothing more, nothing hidden/i);
  });

  it("names the permitted-use boundary", () => {
    const text = (controlledText("L-EMP-WELCOME-001") ?? []).join(" ");
    expect(text).toMatch(/keep every employment judgment inside your organization/i);
  });
});

describe("Item 2 — one verification value, three controlled states", () => {
  it("offers exactly three values and no more", () => {
    expect(Object.keys(VERIFICATION_VALUE_TEXT).sort()).toEqual(
      ["not_verified", "pending", "verified"].sort()
    );
  });

  it("never renders a bare VERIFIED mark", () => {
    expect(Object.values(VERIFICATION_MARK_TEXT)).not.toContain("VERIFIED");
    expect(VERIFICATION_MARK_TEXT.verified).toBe("ORGANIZATION VERIFIED");
  });

  it("keeps the mark and the field in lockstep across all three states", () => {
    (Object.keys(VERIFICATION_VALUE_TEXT) as Array<keyof typeof VERIFICATION_VALUE_TEXT>)
      .forEach((state) => {
        expect(VERIFICATION_MARK_TEXT[state]).toBeTruthy();
        expect(VERIFICATION_VALUE_TEXT[state]).toBeTruthy();
      });
  });

  it("never collapses pending into not verified", () => {
    expect(VERIFICATION_VALUE_TEXT.pending).not.toBe(VERIFICATION_VALUE_TEXT.not_verified);
    expect(VERIFICATION_MARK_TEXT.pending).not.toBe(VERIFICATION_MARK_TEXT.not_verified);
  });

  it("states a missing approver rather than supplying one", () => {
    expect(APPROVER_NOT_RECORDED).toBe("Approver not recorded");
  });

  it("never attaches verified to a person, participant, report or record", () => {
    expect(VERIFICATION_FIELD_LABEL).toBe("Organization verification");
    // Item 2 step 5.8. The adjective attaches to the organization and to
    // nothing else. The verb "verify" is untouched by this rule — the
    // issued welcome text asks the employer to verify that a record is
    // current, which is an instruction, not a claim about evidence.
    const text = employerFacingText();
    expect(text).not.toMatch(
      /\bverified\b\s+(participants?|people|persons?|reports?|records?|holders?)/i
    );
    expect(text).not.toMatch(
      /\b(participants?|people|persons?|reports?|records?)\s+(is|are|was|were)\s+verified\b/i
    );
  });
});

describe("Item 4 — the section heading makes no claim about intent", () => {
  it("reads Employer actions", () => {
    expect(controlledText("L-EMP-SECTION-HEADING")).toEqual(["Employer actions"]);
  });

  it("does not guess what the employer wanted", () => {
    expect(employerFacingText()).not.toMatch(/likely wanted|you probably|commonly/i);
  });
});

describe("Item 5 and Item 8 — the pool copy", () => {
  it("states both lines, including the withdrawal boundary", () => {
    const lines = controlledText("L-EMP-TILE01-001");
    expect(lines).toHaveLength(2);
    expect(lines![1]).toMatch(/withdraw it at any time/i);
  });

  it("never says a participant released a report to this organization", () => {
    expect(employerFacingText()).not.toMatch(/released (their|the) .*to your organization/i);
    expect(employerFacingText()).not.toMatch(/released to your organization/i);
  });

  it("uses the locked expansion and retires the other one", () => {
    expect(employerFacingText()).not.toMatch(/Behavioral Evidence Record/i);
    expect(employerFacingText()).toMatch(/Behavioral Evidence Reports?™/);
  });

  it("carries the principle banner", () => {
    expect(controlledText("L-EMP-POOL-002")).toEqual([
      "The 3rd Academy does not score, rank or recommend. Every employment decision is yours.",
    ]);
  });

  it("offers no invitation or broaden-your-search control in either empty state", () => {
    const empty = (controlledText("L-EMP-POOL-EMPTY") ?? []).join(" ");
    const noMatch = (controlledText("L-EMP-POOL-NOMATCH") ?? []).join(" ");
    [empty, noMatch].forEach((text) => {
      expect(text).not.toMatch(/try |adjust|broaden|invite|request|check back/i);
    });
  });
});

describe("Item 6 — the LiveWorks tile", () => {
  it("says who observes, and that it is not the employer", () => {
    const lines = controlledText("L-EMP-TILE02-001");
    expect(lines).toHaveLength(3);
    expect(lines![2]).toBe(
      "Conduct during the project is observed and documented by The 3rd Academy, not by your organization."
    );
  });

  it("never says the project generates evidence, or names the register", () => {
    expect(employerFacingText()).not.toMatch(/generates evidence/i);
    expect(employerFacingText()).not.toMatch(/\bthe register\b/i);
  });

  it("never implies the employer observes or evaluates the participant", () => {
    expect(employerFacingText()).not.toMatch(
      /you (observe|evaluate|rate)|your organization (observes|evaluates|rates)/i
    );
  });
});

describe("Item 8 — no ranking vocabulary anywhere on the desk", () => {
  it("offers no match, fit, relevance or recommendation language", () => {
    expect(employerFacingText()).not.toMatch(
      /match score|best fit|relevance|recommended for you|top candidates/i
    );
  });

  it("retires talent and candidate from employer-facing text", () => {
    expect(employerFacingText()).not.toMatch(/\btalent\b/i);
    expect(employerFacingText()).not.toMatch(/\bcandidates?\b/i);
  });

  it("makes no causal claim connecting the record to an outcome", () => {
    expect(employerFacingText()).not.toMatch(
      /based on (the|your) record|informed by the record|attributed to|resulting from/i
    );
  });
});

describe("Item 9A — the coverage disclosure", () => {
  it("exposes no internal mechanism vocabulary", () => {
    const text = [
      ...(controlledText("L-EMP-DISC-001") ?? []),
      ...(controlledText("L-EMP-DISC-002") ?? []),
    ].join(" ");
    ["TEER", "Track B", "OD-09", "Section 8", "minimum floor", "count band", "closed field schedule"]
      .forEach((term) => expect(text.toLowerCase()).not.toContain(term.toLowerCase()));
    // Bare dimension identifiers are not employer-facing text.
    expect(text).not.toMatch(/\bD(1[0-4]|[1-9])\b/);
  });

  it("states that availability moves in both directions", () => {
    const lines = controlledText("L-EMP-DISC-002");
    expect(lines![0]).toMatch(/increase or decrease/i);
  });
});

describe("Item 12 — Employer Feedback is about the product", () => {
  it("states the boundary that feedback does not alter a report", () => {
    const lines = controlledText("L-EMP-FDBK-001");
    expect(lines).toHaveLength(2);
    expect(lines![1]).toMatch(/does not alter a participant's Behavioral Evidence Report/i);
  });

  it("never claims feedback improves report accuracy", () => {
    expect(employerFacingText()).not.toMatch(/improve the accuracy/i);
    expect(employerFacingText()).not.toMatch(/quality of the talent pool/i);
  });

  it("offers no category that selects a person or a time interval", () => {
    FEEDBACK_CATEGORIES.forEach((c) => {
      expect(c.label).not.toMatch(/hire|employee|participant|30|60|90|performance/i);
    });
  });

  it("gates the LiveWorks category on activation", () => {
    const liveworks = FEEDBACK_CATEGORIES.find((c) => c.value === "liveworks_experience");
    expect(liveworks?.requiresLiveWorks).toBe(true);
  });

  it("carries a boundary line on the free-text field", () => {
    expect(controlledText("L-EMP-FDBK-BOUNDARY")).toEqual([
      "This form is about the product, not about a person.",
    ]);
  });
});

describe("Controlled text register", () => {
  it("resolves every issued identifier", () => {
    ALL_IDS.forEach((id) => expect(controlledText(id)).not.toBeNull());
  });

  it("holds no empty or whitespace-only line", () => {
    ALL_IDS.forEach((id) => {
      (controlledText(id) ?? []).forEach((line) => expect(line.trim()).not.toBe(""));
    });
  });
});
