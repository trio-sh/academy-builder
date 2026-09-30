# Post-Close-Out Corrections and the Content That Completes D1

**Identifier** T3A-D1-EXEC-CORR-006  |  **Status: SIGNED — IMPLEMENT AS SPECIFIED**  |  The 3rd Academy Inc.

**Governing file** `T3A_D1_Observation_Pathway_EXECUTION_EDITION_v1_0_REISSUED_T3A_CODEBASE.md`, identifier T3A-D1-EXEC-001.

**What this instrument supplies.** Every build correction still owed after the close-out, and **all the content the build is waiting on:** the three Stage 1 administration documents, the participant safety configuration, and the ten Stage 4 impact assessments. The content is in the Annex and loads as data.

---

## Section 0 — How to use this file

This instrument is complete in itself. No external document is required. There is no design-return step and no approval cycle. The only instruction status is IMPLEMENT AS SPECIFIED.

**Precedence.** Where this instrument and T3A-D1-EXEC-CLOSE-001 or T3A-D1-EXEC-001 differ, **this instrument governs.** It corrects CLOSE-001 **CL-50** and **CL-35**; restates **CL-01**; sets the value of REC-10's **specification cooldown** and maps welfare stops within REC-10's existing events; and replaces two sentences of the approved participant-facing text at T3A-D1-EXEC-001 **Section 5.16**.

**Order of execution.** Sections 1 to 10, in order. Load the Annex where Sections 4, 7 and 8 direct. Then return the evidence at Section 11.

### 0.1 Required baseline — verify before executing

| # | Condition | How to verify |
| --- | --- | --- |
| **B1** | T3A-D1-EXEC-CLOSE-001 is executed | Thirty current source versions standing approved; Stage 4 standing approved: **zero** |
| **B2** | All ten Stage 4 approvals were withdrawn under CL-16 | Ten withdrawals, one per Stage 4 source |
| **B3** | No real participant observation has been committed | Committed non-demonstration observations: **zero** |

**If any condition fails, do not execute this instrument.** Record which failed, leave the affected routes as they are, log it, and continue with everything not dependent on it.

> **DEVELOPER JUDGMENT BOUNDARY** — Use reasonable technical judgment within the stated architecture and fail-closed rules. Where an issue would change T3A doctrine, evidence meaning, participant rights or authority, record it in the conflict register rather than deciding it, and take the most restrictive behavior available in the meantime.

---

## Section 1 — CL-50 is corrected

**CL-50 as issued was drawn too broadly; the fault is the founder's instruction, not the build.** It refused any capture-set label **or qualifier** inside verbatim speech. Because the qualifiers are the ordinary words *update* and *final*, it also refuses natural dialogue — *"Any update on the figure?"*, *"Is that your final answer?"*

**CX-01** **Refuse a sequence only where its verbatim speech contains a capture-set label that exists in the dimension's capture register**, alone or followed by a qualifier — for example *"C3"* or *"C3 update"*. **The words "update" and "final" on their own are legitimate speech and are accepted.**

**CX-02** **No loaded sequence changes.** None of the twenty Stage 2 and Stage 4 D1 scripts uses *update* or *final* as an ordinary word in speech. Re-run CL-T37 to confirm.

---

## Section 2 — AX-T4 runs on synthetic data

**CL-35 as issued could not be executed as written; the fault is the founder's instruction.** It asked for *"two concurrent sessions attempting to approve the same withdrawn version."* On live data the successful session writes a REC-07 approval, and **a build may never record a REC-07 approval.**

**CX-03** **Run AX-T4 on synthetic data only** — a synthetic source version and a synthetic oversight holder, in a design-only or synthetic-test environment, or inside a transaction that is rolled back. **Never against a live D1 source; never persisting an approval.**

**CX-04** **The test:** two concurrent sessions, each authenticated as the synthetic holder, attempt to approve the same withdrawn synthetic version at the same moment. **Exactly one succeeds.** The other is refused by the per-version lock or with `SOURCE_VERSION_ALREADY_APPROVED`. Record which.

**CX-05** **Prove the test can fail.** Run it once with the per-version lock disabled in the same synthetic environment: **both sessions should then succeed.** Re-enable the lock and confirm it is active.

---

## Section 3 — "C8 final": confirm the behavior exists

The close-out report lists *"C8 final is stored with no defined behavior"* as open, while reporting CLOSE-001 Section 1 as built. **One of those statements is wrong.** The required behavior, restated in full:

| # | Rule |
| --- | --- |
| R-a | **"final" closes the determination at that beat.** No selection or revision after it. A set with no final beat closes at commit |
| R-b | **A whole-session line is offered only at close:** C2 *"Did not raise it at any point in the session"* and C8a *"Did not disclose during the observation"* (worded *"Not within the observed period"* in BR-09). Identify each by answer value |
| R-c | **The Cockpit does not advance past a final beat while that determination is unanswered** — on `SRC-D1-S2-005`, `SRC-D1-S2-010`, `SRC-D1-S4-001` and `SRC-D1-S4-007`, each binding C8 with "final" at B7 |

**CX-06** **Run CL-T3, CL-T4 and CL-T5a.** If all pass, **close the finding and record that it was stale**; do not delete it.

**CX-07** **If any fails,** wire "final" to R-a to R-c exactly as above, then re-run all three.

---

## Section 4 — Stage 1: a deterministic engine, and its content

### 4.1 The decision

**Stage 1 is administered by a deterministic delivery engine. No generative AI model is used.** T3A-D1-EXEC-001 Section 8.1 already requires that nothing in Stage 1 is *"improvised, paraphrased, reordered or generated,"* and that the service selects no determination. A deterministic engine performs every function that contract permits; a generative model would add only the risk it prohibits.

**The ten Stage 1 situations are not re-authored.** They are loaded, approved and standing. What is supplied here is the layer that administers them.

### 4.2 Build instructions

**CX-08** **Build a production deterministic delivery engine as its own versioned object.** It presents the situation text and each reveal verbatim and in order, applies the Administration Configuration, captures each response exactly as typed, and timestamps every reveal. **It generates no wording, calls no language model, evaluates nothing, summarizes nothing and selects no determination.**

**CX-09** **Do not relabel the synthetic test objects as production.** The four objects marked `SYNTHETIC_TEST_ONLY`, and the trigger that refuses any real run citing them, stay exactly as they are.

**CX-10** **Map the four provenance fields as follows.** Section 8.1 names three references; the build requires four. **No field is renamed.**

| Build field | Holds | Supplied by |
| --- | --- | --- |
| Model reference (`model_ref`) | The engine's identifier, version and code hash | The build, under CX-08 |
| Prompt text (`prompt_ref`) | **Annex A** — the Stage 1 Delivery Specification | This instrument |
| Administration configuration (`configuration_ref`) | **Annex B** — the Stage 1 Administration Configuration | This instrument |
| Safety configuration | **Annex C** — the Participant Safety Configuration | This instrument |

**CX-11** **One Delivery Specification serves all ten Stage 1 sources.** It renders any source from that source's own approved text; there is no per-source prompt. The only words it adds are the fixed framing lines in Annex A.

**CX-12** **Load Annexes A, B and C as issued content, each under its identifier and a hash.** Every real Stage 1 run cites all four provenance objects. **After loading, no non-synthetic run may cite the demonstration placeholders.** A real run then refuses only for the reasons Section 8.1 and the activation gate already give — never for missing content.

**CX-13** **Build the Stop control and the persistent support line on every Stage 1 screen**, rendering their wording from Annexes A and C, never from code.

**CX-14** **Prove the engine cannot generate.** It makes no network call to any language-model endpoint, and every rendered situation and reveal is **byte-identical** to the served source version.

**CX-15** **Replace the two sentences of Section 5.16 set out in Annex E.** Section 5.16 tells every participant that Stage 1 is *"administered using artificial intelligence."* That is no longer true, and it is participant-facing wording. **Render the corrected text; the old sentences must no longer render anywhere.** Internal identifiers that contain "AI" are not renamed.

---

## Section 5 — The approval basis

### 5.1 The twenty-seven carried approvals

The forty original approvals were recorded in one minute and twenty-seven seconds, and **the record could not show what they rested on.** Twenty-seven standing approvals derive from them: the thirty-seven carried forward under T3A-D1-EXEC-CORR-004, less the ten Stage 4 approvals withdrawn under CL-16. The founder attests at Section 12 that those sources were reviewed during the authoring of T3A-D1-EXEC-001, before issue.

**CX-16** **Record the attestation as a basis against each of the twenty-seven**, in a separate basis table keyed to each approval, **never by altering an approval row.** Each row carries the approval it attaches to, the basis text at Section 12, the date entered there, and a reference to this instrument.

**CX-17** **Attach this basis to no other approval.** `SRC-D1-S1-010`, `SRC-D1-S2-010` and `SRC-D1-S3-010` carry their own basis, recorded as `FOUNDER_REAPPROVAL_REC07_REAPP_001_ISSUE_2`. The ten Stage 4 approvals are withdrawn. **The unaccounted Stage 3 row stays an audit finding, unaltered.**

### 5.2 Every future approval records its own basis

**CX-18** **Add a required approval basis to the approval route.** An approval refuses, by name, unless the approver selects one of:

| Basis | Records |
| --- | --- |
| Read in full in this screen | That the text was read at the point of approval |
| Reviewed during authoring of a named issued document | The document's identifier |
| Compared against specified values under a named instrument | The instrument's identifier |

**This is a closed list.** Every future approval — including the ten Stage 4 approvals and every D2 approval — then carries its own evidence of what it rested on.

---

## Section 6 — The legacy scenario library is quarantined

**The finding.** A legacy scenario library sits beside the build. **It is a scoring instrument:** it scores responses, marks correct answers, grades responses from excellent to poor, and offers timed ranking tests. It writes to `candidate_profiles`, `mentor_assignments`, `mentor_assigned_dimensions` and `observation_loops`, and to no evidence table. Its scores remain in its data even where its screens hide them.

**T3A-D1-EXEC-001 never mentions the library or its four tables**, so it was never governed — only bypassed. Section 4.3 of T3A-D1-EXEC-001 retires *score, rating, rank* and *candidate* in displayed text, code identifiers, database fields and routes, and grants the authority to retire them here.

**CX-19** **Find and report every route, page, link, API endpoint, scheduled job and navigation entry** that can reach the library or write to its four tables.

**CX-20** **Make every one unreachable, server-side.** No route serves the library, no navigation links to it, no job writes to its tables. **Prove each refusal by requesting the route directly**, never by observing that a screen hides it.

**CX-21** **Delete nothing and alter no stored row.** Historical records are never rewritten. Record the library and its four tables as retired in the build's register, with the reason: *a scoring instrument, closed under T3A-D1-EXEC-001 Section 4.3.*

**CX-22** **If quarantining would break a current, non-retired feature,** do not break it: block participant-facing access and all writes, keep the read, and record the dependency in the conflict register. **Nothing from the library may be used as a source of content for D1 or any later dimension.**

---

## Section 7 — Stage 4: the assessments, and the path to activation

**CX-23** **Load the ten Stage 4 impact assessments in Annex D as governed records,** one per Stage 4 source, each bound to that source's current version.

**CX-24** **The approval route accepts a Stage 4 approval only where that source's assessment record exists and was recorded before the approval.** An approval attempted without one, or before it, refuses by name. This makes the record show that approval followed assessment.

**CX-25** **Record no Stage 4 approval.** Approvals are the founder's, given in the approval screen after reading each source with its assessment, with the basis *Read in full in this screen.*

**CX-26** **Stage 4 activation stays refused.** It requires a separate founder decision, recorded only after: all ten approvals; an approved consent version naming Google Meet (CL-48); the Google Workspace configuration (CL-40); hosting accounts; and G1 certification.

---

## Section 8 — REC-10: the specification cooldown, and welfare stops

**CX-27** **The specification cooldown is set.** REC-10 lists it after a completed observation but T3A-D1-EXEC-001 never gives it a value. **After a completed observation, the next attempt on the same Stage and dimension waits seven days after the first completed observation and fourteen days after the second; there is none after the third, because there is no fourth attempt.** This is the schedule REC-10's own paragraph already states for completed attempts; this instrument applies it and ends the ambiguity.

**CX-28** **Welfare stops use an existing REC-10 event.** A session stopped for a participant's welfare — by the participant or by the mentor — and a Stage 1 or Stage 3 response withheld from confirmation for welfare before commit, are recorded as **"Withdrawal after observation begins, before commit"**: **no attempt consumed; the rescheduling cooldown applies.** Determinations already captured are excluded from current composition and retained in history, as for any withdrawal. A stop before observation begins is **"Session cancelled before observation begins."** No new event class is created.

**CX-29** **An observation withheld for welfare is excluded from confirmation, composition, statement, report and release.** Its stored responses are retained in history and are **visible only to the Safety Contact and the founder.**

**CX-30** **Build the four safety controls Annex C depends on:**

| # | Control |
| --- | --- |
| a | **Stop for welfare** in the Mentor Cockpit, available at every beat at Stages 2 and 4. It ends the session without commit and records the event under CX-28 |
| b | **Withhold for welfare** in the Stage 1 Confirmation Workbench and the Stage 3 review surface. It records no determination, withholds the observation under CX-28 and CX-29, and cannot be undone by the confirmer |
| c | **The safety event record** at Annex C.7, as its own table, **separate from every evidence table**, holding exactly the fields C.7 lists and **never the content of a disclosure**. Controls (a) and (b) open it. It is visible only to the Safety Contact and the founder |
| d | **The Safety Contact held as configuration,** defaulting to the founder until another person is designated |

**CX-31** **Show the Annex C support information on the participant's pre-session screen for every Stage**, before any Google Meet link, and on every Stage 1 and Stage 3 screen. **Show the Stage 3 line at Annex C.4a on every Stage 3 screen,** and, for `SRC-D1-S4-007` and `SRC-D1-S4-010`, **the theme line in Annex D on the pre-session screen.**

---

## Section 9 — Two corrections to the founder's earlier questions

The founder's SOP-002 email asked about two things on the twenty Stage 2 and Stage 4 sources. **Both questions rested on an incomplete reading, and are corrected here.**

**CX-32** **The session windows are set at bank level, not per source.** Stage 2: *600 minimum, 1,200 maximum per session.* Stage 4: *1,200 to 1,800 per session.* **Confirm the build applies the bank-level window to every source in the bank.** Where it does not, apply it.

**CX-33** **The situation class is defined at bank level as "stated per source,"** and each source states it at its head — for example *"Situation class S-5 with S-2."* **Confirm the build derives the interaction pattern family from that statement for all twenty.** Where a family is null, report the source and do not infer one; no real observation can occur before activation, so nothing is served in the meantime.

---

## Section 10 — Nothing else changes

**CX-34** **No route, field, table or code identifier is renamed. No approval row is altered or deleted. No historical record is rewritten.** Where a change here would require any of these, stop that change, log it, and continue with everything else.

---

## Section 11 — Evidence to return

| # | Item | Expected |
| --- | --- | --- |
| **X1** | Acceptance register count | Thirty of thirty |
| **X2** | Servable current versions, by Stage | Ten, ten, ten, zero |
| **X3** | Loaded sequences, itemized | Thirty-three: three demonstration, ten Stage 1, ten Stage 2, ten Stage 4 |
| **X4** | Stage 4 approval provenance, per source | Ten rows, each traced and withdrawn |
| **X5** | RA-T8R's three values | Zero, zero, **twenty-seven** |
| **X6** | Every CLOSE-001 test — CL-T1 to CL-T38, and CL-T5a — with its result | Thirty-nine rows |
| **X7** | T3A-DEV-PLC-005-A Notes 5 and 7 | Test results for each |
| **X8** | Stage 4 refusals R1 to R6 | Six results |
| **X9** | Live Session panel in place of live views; no placeholder stream | Confirmed |
| **X10** | Google Workspace configuration applied, or E3 on attestation alone | One of the two |
| **X11** | CL-50 corrected; CL-T37 re-run | Ordinary speech accepted; a spoken capture label refused |
| **X12** | AX-T4 under CX-03 to CX-05 | One succeeds; both succeed with the lock disabled; lock re-enabled |
| **X13** | CL-T3, CL-T4, CL-T5a; the "C8 final" finding | Three results; the finding closed as stale or wired |
| **X14** | The engine | Identifier, version, hash; no model endpoint; byte-identical rendering |
| **X15** | Annexes A, B and C loaded; no real run cites a placeholder | Three identifiers and hashes |
| **X16** | Section 5.16 | Corrected text renders; the two old sentences render nowhere |
| **X17** | Basis rows under CX-16; an approval with no basis | Twenty-seven rows; refused by name |
| **X18** | The legacy library | Every route and job listed; each refused on direct request; no row altered |
| **X19** | Ten assessments loaded; a Stage 4 approval without one | Ten records; refused by name |
| **X20** | A second attempt within seven days of a completed observation | Refused |
| **X21** | A welfare stop | No attempt consumed; cooldown applied; determinations excluded; record visible only to the Safety Contact and the founder |
| **X22** | CX-32 and CX-33 | Window applied per bank; the derivation of all twenty pattern families, with any nulls named |
| **X23** | The ten Stage 1 windows as loaded | Match AC-B3a exactly |
| **X24** | The four safety controls at CX-30 | Each exercised; the safety event record holds no disclosure content and is visible only to the Safety Contact and the founder |
| **X25** | The Stage 3 line and the two Stage 4 theme lines | Each renders where CX-31 places it |

---

## Section 12 — Approval and attestation

**Decisions.** I decide that Stage 1 is administered by a deterministic delivery engine and that no generative AI model is used. I set the specification cooldown at CX-27 and the welfare-stop mapping at CX-28. I issue Annexes A to E as content, and I complete the ten Stage 4 impact assessments in Annex D. I approve Sections 1 to 11 and the instructions CX-01 to CX-34.

**Attestation.** I reviewed the D1 production sources during the authoring of T3A-D1-EXEC-001, before it was issued. The approvals I recorded in the approval screen recorded that prior review; they were not made on first reading in that screen.

Founder and Chief Executive Officer: **Dr. Tony Mofoke**

Print name: **Dr. Tony Mofoke**

Date: **29 September 2026**

*Method of signature: typed signature, inserted on the instruction of the Founder and Chief Executive Officer and issued from his own account.*

---

# ANNEX — Issued content

**Everything below loads as data.** Each document carries its own identifier. **Participant-facing wording renders exactly as written.** Words in braces are record-bound values filled by the service, never free text.

---

## Annex A — Stage 1 Delivery Specification

**Identifier** `T3A-S1-DELIVERY-SPEC-001`  |  Loads as the Stage 1 **prompt text** (`prompt_ref`)  |  Applies to every Stage 1 source

### A.1 What the engine does, in order

1. Show the **opening** at A.3.
2. Show the source's block *"The situation, as the participant meets it,"* verbatim.
3. Show the source's reveals in order, R1 onward, verbatim, one at a time.
4. After each reveal, accept one typed response. **The participant submits it to continue.**
5. After the last response, show the **closing** at A.3.

### A.2 Fixed rules

| # | Rule |
| --- | --- |
| DS-1 | **Nothing is generated, paraphrased, reordered, summarized or added** beyond the words at A.3 |
| DS-2 | **A submitted response cannot be edited or recalled.** Later reveals change what the participant knows, and the account-test reveal depends on the earlier account standing as given |
| DS-3 | **No feedback, no correct answer, no indication of how a response was received** |
| DS-4 | **Progress is shown only as the part number** — for example *"Part 2"* — never as a bar, a percentage or a count of parts remaining |
| DS-5 | **The source title, source sheet and applicability are never shown** |
| DS-6 | **The participant never sees a determination, statement, record or anything a confirmer does** |

### A.3 The only words the engine adds

**Opening:**

> In this part, you will read a workplace situation on screen, one stage at a time. After each stage, type what you would do or say, in your own words. There is no score. Write as you would at work.
>
> You have up to {max_minutes} minutes. Once you submit a response, you move on and cannot go back to change it.
>
> Nobody reads what you type while you are typing it. If at any point you feel distressed, you can stop: use Stop at the top of the screen. Stopping does not use up one of your attempts.
>
> If you are in crisis or thinking about harming yourself, call or text 9-8-8, any time, day or night. In an emergency, call 9-1-1.

**Closing:**

> Thank you. Your responses have been saved exactly as you wrote them. An authorized person will read them. Nothing is decided automatically.
>
> If you need support, call or text 9-8-8, any time. In an emergency, call 9-1-1.

**On every screen, beside the Stop control:**

> Need support? Call or text 9-8-8. Emergency: 9-1-1.

`{max_minutes}` is the source's `max_seconds` divided by sixty, rounded down.

---

## Annex B — Stage 1 Administration Configuration

**Identifier** `T3A-S1-ADMIN-CONFIG-001`  |  Loads as the Stage 1 **administration configuration** (`configuration_ref`)

| # | Rule |
| --- | --- |
| AC-B1 | **A run may begin only when** the participant's identity is verified; a valid, current, in-scope consent record exists; Stage entry has passed; the attempt cap of three is not reached; no cooldown is in force; and any accommodation is settled and recorded. **Any accommodation is settled before the run, never during it** |
| AC-B2 | **Sequence:** as Annex A, fixed |
| AC-B3 | **Time allowed:** up to the source's `max_seconds`, counted from when the situation text is first shown. **No minimum is imposed on the participant.** `min_seconds` is recorded with the run for the confirmer and for scheduling. A forced wait would add pressure the situation does not call for |
| AC-B3a | **The ten loaded windows must be exactly these.** The issued file stores each Stage 1 window with both numbers in `max_seconds` and an empty `min_seconds`, so the loaded values are checked here: S1-001 600 and 1,500; S1-002 360 and 900; S1-003 360 and 900; S1-004 480 and 1,500; S1-005 360 and 1,200; S1-006 480 and 1,200; S1-007 360 and 1,000; S1-008 480 and 1,200; S1-009 480 and 1,200; S1-010 480 and 1,200 — minimum first. **Where a loaded value differs, the run for that source refuses until corrected** |
| AC-B4 | **When five minutes remain,** show once: *"About five minutes remain."* No running clock is shown |
| AC-B5 | **At `max_seconds` the run closes.** Submitted responses are kept. Text typed but not submitted is not captured. A reveal shown but not answered is recorded as `no response`; a reveal not reached is recorded as `never asked`. **The run is a completed observation** |
| AC-B6 | **No pause is available.** Stop ends the run under CX-28 |
| AC-B7 | **Disconnection:** the run holds at the current reveal, with submitted responses intact, and resumes there if the participant returns before `max_seconds`. If they do not return, the run ends as **"Withdrawal after observation begins, before commit"** — unless the platform logs a fault on its own side, in which case it is a **"Technical or platform failure."** This closes the route of abandoning a run to reset it without cooldown |
| AC-B8 | **Responses:** stored exactly as typed. **No content limit is imposed on the participant.** Any technical ceiling must exceed any plausible response and, if reached, **refuses visibly rather than truncating** |
| AC-B9 | **After the run,** responses pass to the Stage 1 Confirmation Workbench for an authorized confirmer, under T3A-D1-EXEC-001 Section 8.1.1 and Annex C |
| AC-B10 | **Provenance** recorded on every run: all four provenance objects with versions and hashes; start and end; a timestamp for every reveal; `source_version_id`; the rendered instance |

---

## Annex C — Participant Safety Configuration

**Identifier** `T3A-PARTICIPANT-SAFETY-001`  |  Loads as the Stage 1 **safety configuration**, and governs every Stage of every dimension

**Status.** Issued by the founder. **Counsel reviews it before real observation is activated at any Stage.** It loads now; activation remains separately gated.

### C.1 Principles

| # | Principle |
| --- | --- |
| C1 | **A participant's wellbeing comes before any observation.** Any observation can be stopped at any moment, by the participant or the mentor, and stopping never uses up an attempt |
| C2 | **A disclosure is never evidence.** Anything a participant says or writes about harm, distress or risk to themselves or others is never captured as a determination, never composed into a statement, never shown to an employer and never enters a report |
| C3 | **The Academy's role is stated honestly and kept narrow.** It does not counsel, diagnose or treat. It stops, signposts and escalates |

### C.2 What calls for this configuration

A participant — or, at Stage 4, anyone in the session — says or writes that they are thinking of harming themselves or someone else; discloses that they are being harmed or are unsafe; shows distress severe enough that continuing would be unkind; or has a medical emergency.

### C.3 Support information

Shown before every session and available throughout:

> If you are in crisis or thinking about harming yourself, call or text 9-8-8, any time, day or night. In an emergency, call 9-1-1.

Where a participant is outside Canada, the local emergency number applies. **The support information is held as configuration,** so it can be changed or localized without a code change.

### C.4 Stages 1 and 3 — no one is watching live

| # | Rule |
| --- | --- |
| C4a | **Before starting, the participant is told plainly that nobody reads responses while they are being written,** and is shown C.3. At Stage 1 this is the Annex A opening. **At Stage 3 it reads, exactly:** *Nobody reads your work while you are preparing it. If you need support at any time, call or text 9-8-8. In an emergency, call 9-1-1.* |
| C4b | **Stop is always available,** and is recorded under CX-28 |
| C4c | **The engine never reads, flags or interprets a response.** No automated detection is attempted: a deterministic engine cannot judge distress and must not pretend to |
| C4d | **When a confirmer at Stage 1, or a reviewing mentor at Stage 3, meets a disclosure,** they stop, record no determination, withhold the observation under CX-28 and CX-29, escalate to the Safety Contact **the same day**, and open a safety event record |

### C.5 Stages 2 and 4 — a mentor is present, on Google Meet

| # | Rule |
| --- | --- |
| C5a | **At any sign in C.2, the mentor stops the observation at once** with Stop for welfare (CX-30) |
| C5b | **The mentor stays with the person in the call,** shares C.3, does not counsel or probe, and **does not resume the observation** |
| C5c | **Stage 4:** the facilitator ends the whole session, thanks the co-participants and closes the call for them, and stays with the person affected. **The same care applies to a co-participant;** they are not observed, so nothing is recorded about them beyond the safety event |
| C5d | **The mentor escalates to the Safety Contact the same day** and opens a safety event record |
| C5e | **Nothing is recorded, and the mentor makes no notes of the disclosure** beyond the safety event record |

### C.6 The Safety Contact

A named person designated by the founder and recorded in configuration. **Until one is designated, the founder is the Safety Contact.**

On receiving an escalation, the Safety Contact decides whether and how to reach the participant, and records that decision. **Where a disclosure indicates an immediate risk to someone's life, the Safety Contact calls 9-1-1.** What information may be shared with emergency services is confirmed by counsel before activation.

### C.7 The safety event record

| Records | Does not record |
| --- | --- |
| That an event occurred; its date and time; the Stage and source version; who acted; and what was done — stopped, signposted, escalated, emergency services contacted | **The content of the disclosure** |

It is kept separate from all evidence, and is visible only to the Safety Contact and the founder. Its retention follows counsel's advice under REC-04.

### C.8 Training and review

Every mentor, confirmer and facilitator is trained in this configuration before authorization. It is reviewed by counsel before activation, and by the founder after the first ten real sessions or the first safety event, whichever comes first.

---

## Annex D — Stage 4 Impact Assessments

**Identifier** `T3A-D1-S4-IMPACT-001`  |  Ten assessments, one per Stage 4 source, each bound to its current version

The Execution Edition requires, before any Stage 4 source may be submitted for approval, a completed **shared-material, identity, recording, correction, withdrawal, group-composition and accommodation-impact** assessment. The seven parts below apply identically to all ten, because they follow from how Stage 4 is built. Section D.2 records what is particular to each source.

### D.1 The seven parts

| Part | Finding | Controls |
| --- | --- | --- |
| **1. Shared material** | The source's shared material is placed before the whole group. It uses fictional names cleared under name clearance and contains no personal data about any real person | Shown by the facilitator sharing one window or tab holding only that material, never the Cockpit or the whole screen (CL-46, attestation A4). Everyone sees the same material (R3). Each individual pack is visible only to its holder (T3A-D1-EXEC-001 Section 8.3) |
| **2. Identity** | The observed participant must be the verified participant. Co-participants are role players, not participants | The observed participant is verified by platform account and the facilitator's visual confirmation against their Academy identity in Meet, and admitted from the waiting room (REC-11, CL-43). Co-participants are arranged by the Academy, admitted by the host, never observed and never asked for observation consent. **Before composition, the facilitator confirms that no co-participant knows the observed participant; where one does, that co-participant is replaced** |
| **3. Recording** | Nothing is recorded | No media persists (Section 8.3, E3). The Workspace configuration (CL-40), attestation A2, and ending the session if a recording indicator appears (CL-45) |
| **4. Correction** | A correction can reach only the observed participant's record | A correction alters only the record it concerns. No co-participant can raise one against an observation of which they are not the subject, and nothing a co-participant says is recorded as their conduct (Section 8.3, R4) |
| **5. Withdrawal** | Withdrawal must remove the right things and nothing else | The observed participant's withdrawal excludes their determinations from composition and retains them in history. A co-participant's withdrawal removes nothing (Section 8.3, R5). Welfare stops under CX-28 |
| **6. Group composition** | One observed participant, three role-play co-participants and one facilitator. No shared record, no group outcome and no comparison | A composition record names every person, the source version, the facilitator and the session (Section 8.3). **Each co-participant signs a confidentiality undertaking before taking part,** covering the session and the observed participant's conduct |
| **7. Accommodation** | An accommodation must not change the observation mid-session | Settled before composition, never during (Section 8.3, R6). Where it affects what the group sees or hears, it applies to the whole session. Live captions only where so settled, and never saved (CL-47) |

### D.2 Each source

| Source | Title | Class | Bearing interest | Welfare attention | Result |
| --- | --- | --- | --- | --- | --- |
| SRC-D1-S4-001 | The Shortlist Round | S-5 with S-2 | Yes — decision point the agreement at B4 | Standard | **Completed** |
| SRC-D1-S4-002 | The Status Roll-Up | S-1 | None | Standard | **Completed** |
| SRC-D1-S4-003 | The Waiver Round | S-3 with S-1 | None | Standard | **Completed** |
| SRC-D1-S4-004 | The Write-Up | S-4 | None | Standard | **Completed** |
| SRC-D1-S4-005 | The Estimate Round | S-2 | None | Standard | **Completed** |
| SRC-D1-S4-006 | The Incident Review | S-6 with S-1 | None | Standard — an operational error, a batch sent to the wrong depot; no injury | **Completed** |
| SRC-D1-S4-007 | The Promotion Panel | S-5 | Yes — decision point the agreement at B4 | **Heightened** — a close personal friend is under discussion; loyalty may be felt as real | **Completed, with heightened welfare attention** |
| SRC-D1-S4-008 | The Figure in the Room | S-7 with S-1 | None | Standard | **Completed** |
| SRC-D1-S4-009 | The Commitment Round | S-2 with S-1 | None | Standard | **Completed** |
| SRC-D1-S4-010 | The Stand-Down | S-3 with S-1 | None | **Heightened** — resuming after a near-miss; a safety-incident theme | **Completed, with heightened welfare attention** |

**Heightened welfare attention means:** the facilitator re-reads Annex C before the session, and the pre-session screen shows the participant one neutral line naming the theme. **Each line states only what that source's pre-brief already tells the participant,** so it changes nothing about the observation:

| Source | Line shown on the pre-session screen |
| --- | --- |
| SRC-D1-S4-007 | *This session involves a decision about someone you know personally.* |
| SRC-D1-S4-010 | *This session involves a safety near-miss at work. Nobody was hurt.* |

**Where a bearing interest exists,** the participant's disclosure of it is their own conduct and is observed under C8; it is not a welfare event. A disclosure of harm or distress is a welfare event whatever the source.

---

## Annex E — Section 5.16, corrected text

Two sentences of T3A-D1-EXEC-001 Section 5.16 are replaced. **Everything else in Section 5.16 is unchanged.**

| Replace | With |
| --- | --- |
| *Some are administered using artificial intelligence.* | *Some are presented to you on screen by an automated system.* |
| *Where artificial intelligence is used, it presents the situation and organizes what happened. An authorized person is accountable for what enters your record. Artificial intelligence does not decide what your record says, does not issue your report, and does not decide a correction.* | *Where an automated system is used, it shows you the situation in fixed stages, exactly as written, and keeps your responses exactly as you typed them. It does not write, change or judge anything, and nobody reads your responses while you are typing them. An authorized person reads them afterwards and is accountable for what enters your record. The automated system does not decide what your record says, does not issue your report, and does not decide a correction.* |

---

**END. Nothing in this instrument waits on anyone. The Stage 4 approvals and the activation decisions are the founder's, taken after this instrument is executed.**
