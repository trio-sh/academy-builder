# Written justification — why the editorial system was doing more work than it looked like

**From:** Hans Ade, Lead Platform Developer (Pixelways Solutions Inc.)
**To:** Dr. Tony Mofoke, The 3rd Academy Inc.
**Ref:** Response to feedback that led to the 2026-08-13 revert of the editorial paper system in favour of the AcademyHub techy system.
**Purpose:** A written record of what the editorial system was doing for the reader, and a concrete argument that the techy system now in place is heavier to read at a glance. Written to support a considered second look, not to reopen the decision.

---

## 1 — The two reviewer notes we were solving for

The written comment pack (T3A-DEV-RESP-002 review, 2026-08-12) made twenty-five specific requests. When the requests are grouped by what the reviewers were actually asking for, the distribution is not "make the design flashier." It is:

- **17 of 25 items** were about *readability*: text too small, spacing too tight, sections that were hard to scan, single words the reader wanted highlighted (e.g. items 3, 5, 7a, 7b, 8a, 9a, 11, 13, 15, 16, 17, 18, 19, 20, 21, 22, 23).
- **4 of 25 items** were about *wording* being off-tone (items 4, 6, 9b, 12).
- **3 of 25 items** were about *structure* (items 1/14 "entries → steps", 12 "add a Founder's Desk column").
- **1 of 25 items** was about *chrome*: item 24, "the purple logo looks off."
- **1 closing note** said the *desktop version is OK, but the mobile version needs some appeal — it looks too bare and not attractive to read.*

The technical reader could take from this that the reviewers were mostly asking for **more legibility, better hierarchy, and a mobile pass**. The founder direction that followed was to **replace the whole design**. That is a very large answer to a narrow question, and the specific readability items are precisely the ones the editorial system was best positioned to fix, because it was type-driven and hierarchy-driven from the start.

## 2 — What the editorial system was doing that is no longer being done

### 2.1 A single, obvious hierarchy the eye could follow

Every editorial section opened with `§ N · Section title` in mono, then a serif headline that named the section in plain language, then one body paragraph. The user knew, without reading, where they were in the document. The current techy system opens most sections with a gradient badge pill, a large gradient-text phrase across two lines, and a subhead, and then jumps to cards. The visual weight is roughly equal across all three registers, which means the eye has no anchor to enter the section from.

### 2.2 Small-caps and marginalia doing the summarising work

The editorial marginalia (`Fig 01`, `Pp 025–052`, `Iss 04`) were quietly telling the reader: *this is a report you can skim like a paper you already know how to read*. That is not decoration — it is a well-known convention that makes long-form content scannable without breaking the reading flow. When the marginalia disappear, the reader has to read every heading in full to know where they are.

### 2.3 One accent, used sparingly

Vermilion appeared on stamps, one italic phrase per hero, and challenge / warning callouts. That restraint meant that when the eye landed on vermilion, the user knew *something worth attention lives here*. The current system carries an indigo-to-purple gradient across the primary headline of every section, plus purple accent phrases, plus gradient badges, plus glow-ring cards. Because every attention-grabber is present at once, none of them grab attention. This is the design failure mode textbook-called "everything is important" — which resolves in the reader's eye as *nothing is important*.

### 2.4 Reading rhythm that matched the product

The 3rd Academy sells a **dated record you can read line by line**. The BER surface, the verification page, the challenge flow — all of these are documents. The editorial paper system taught the reader, on the marketing pages, how to read a T3A document *before they ever became a participant*. The techy system reads like a SaaS marketing site, which is a different product than what T3A actually delivers.

## 3 — What the techy system is measurably heavier on

Direct comparison against the current homepage as it renders on a mid-range Android:

| Property | Editorial system | Current techy system |
| :--- | :--- | :--- |
| First-paint above-the-fold assets | HTML + one CSS file, no image | HTML + CSS + a full-bleed MP4 video that starts autoplay, plus three animated blurred-blob layers, plus a floating decorative image loaded from an external host |
| Continuous animation while scrolling | none — the page is a static document | three animated gradient blobs, scan-line, hero video loop, and framer-motion staggers per section, running for the duration of the visit |
| Contrast ratio on body copy | 14.4 : 1 (ink on paper) — passes WCAG AAA | 4.5 – 6 : 1 on white-on-dark, drops to ~3.5 : 1 on gray-on-dark body copy inside gradient cards — many pass AA but not AAA, several body-copy runs are below AA on the darker sections |
| Cognitive load per section entry | one section marker, one headline, one paragraph — the reader can decide to keep reading or skip in one glance | badge pill (with icon) + gradient headline (2 – 3 lines with a colour shift mid-phrase) + subhead + cards — the reader has to process four visual elements before deciding whether to read on |
| Skimmability on mobile | the compact meta strip and single-column hierarchy scanned in under a second per section | the visual density of gradient badges, gradient headlines, glass cards, and glow blobs on a 375 px viewport reads as decoration first, content second — the reader scrolls past to find what the section is about |

None of these are hypothetical. The reviewers' items 3, 5, 7a, 8a, 11, 15, 16, 17, 18, 25 all describe symptoms of exactly the load listed above. The techy system will inherit those problems and add its own (animation over reading text, video autoplay carrying data cost on cellular, halos on card edges pulling the eye away from the copy).

## 4 — The specific comment that drove the revert

The founder's summary reason was: *"too simplistic and, at first sight, sends the wrong signal."*

Two observations, put respectfully:

- **"Too simplistic"** is a fair critique of a first draft. The editorial system's answer to that critique is to add more figure references, more marginalia, more numbered ledger rows — not to change the register. Simplicity is what made the individual claims land. The reviewers who asked for text to be bigger were asking for **more of the same design language**, not less of it.
- **"Sends the wrong signal"** deserves an honest question in return: what signal is the techy system sending? A dark futuristic gradient product with glassmorphism cards signals *AI SaaS startup*. A record with dated entries in a serif type signals *institutional-grade evidence you can rely on*. The second signal is exactly the one The 3rd Academy is selling. The first signal is one every VC-funded dashboard product on the market already sends, and the market has trained employers to be sceptical of it. Employers who reject "another AI dashboard" will read the T3A homepage as one, and the doctrinal claim ("we document, we do not score") will land harder to defend.

## 5 — A middle path

The revert does not have to be all-or-nothing. A concrete proposal that preserves the founder's direction on visual weight and simulation-feel while getting back the readability wins the reviewers were actually asking for:

- **Homepage hero:** keep the AcademyHub techy vibe (video, gradient headline, blobs). This is where "first sight" lives.
- **Section-header rhythm across the site:** restore the `§ N · Section title` mono marker and single-serif-headline pattern. This is the biggest legibility win per unit of design work.
- **Marginalia + figure references:** restore on the inner pages where content density is highest (Platform, Employers, Schools). These are the pages the reviewers were complaining about.
- **Accent restraint:** pick one accent phrase per section that carries the gradient text, not all of them. Everything else stays in white or muted grey.
- **BER / verification / challenge surfaces:** stay in the editorial register unambiguously. These are documents by product design; making them look like a SaaS card degrades the doctrinal claim.
- **Mobile:** commit to a pass that shrinks headline sizes, drops secondary meta, and compresses the meta row to one strip — the same pass PR #200 did on `/platform` — everywhere. This is the single biggest mobile-readability win available for the cost of a few evenings.

Every one of the twenty-five reviewer items has a target under this middle path, and none of them require reverting the visual system.

## 6 — Cost of the current path

Where we are today, in engineering terms:

- Twelve merged PRs (#153 through #205 across the editorial redesign, then #203 – #206 to unwind it) spent roughly two weeks of my time.
- The revert re-introduced dependencies on an external `api.a0.dev` image host and a Supabase-hosted `homelivebg.mp4` video, both of which are single points of failure for the homepage's first paint.
- The dashboards, chatbot, launch countdown, and legal-page assets still carry paper-scoped utility classes (`.paper-grain`, `.ink-vermilion`, `.stamp`, `.mono-label`). They render because the palette tokens were remapped, but the naming is now misleading — future developers will read `.ink-vermilion` and see purple pixels, which is a footgun.
- The 25 reviewer readability items are still open. The revert did not address any of them; it changed what the surface looks like around them.

## 7 — Request

Please consider this document as evidence for a second look at the middle path in §5 — specifically the piece about restoring the `§ N · Section title` rhythm and marginalia on the inner reading pages while keeping the techy hero the founder chose. If the answer is still no, the document remains here as the written record of the reasoning, so the same argument does not have to be reconstructed the next time a reader complains that the site is hard to read quickly.

---

**AI acknowledgement.** AI tools were used to structure and draft this document. The technical claims (contrast ratios, dependency list, PR counts, and the specific reviewer-item counts) are drawn from the repository state and the T3A-DEV-RESP-002 review PDF.
