/**
 * The twenty Workplace Moments — Post-Launch 04 · Notes 3 & 4.
 *
 * Card titles are the participant-facing names. `internalHome` is
 * catalog metadata for management and is NEVER displayed anywhere
 * in the product (no card, no detail screen, no search result).
 * `slug` is the URL segment for the moment detail route.
 *
 * Descriptions and prices are supplied by The 3rd Academy Inc. and
 * are not invented in the build. Until they arrive, cards render
 * without descriptions or prices.
 */

export type WorkplaceMoment = {
  index: number;
  slug: string;
  title: string;
  /** internal metadata — never displayed to participants */
  internalHome: string;
  /** short participant-facing situation description — supplied by T3A */
  situationDescription?: string;
  /** in minutes; supplied by T3A */
  approximateDurationMinutes?: number;
};

export const WORKPLACE_MOMENTS: WorkplaceMoment[] = [
  { index: 1,  slug: "when-doing-the-right-thing-has-a-cost",           title: "When Doing the Right Thing Has a Cost",           internalHome: "Integrity and Ethics" },
  { index: 2,  slug: "asked-to-let-it-slide",                           title: "Asked to Let It Slide",                            internalHome: "Integrity and Ethics" },
  { index: 3,  slug: "owning-what-happened",                            title: "Owning What Happened",                             internalHome: "Accountability and Ownership" },
  { index: 4,  slug: "when-you-promised-to-follow-up",                  title: "When You Promised to Follow Up",                   internalHome: "Accountability and Ownership" },
  { index: 5,  slug: "you-said-it-would-be-done",                       title: "You Said It Would Be Done",                        internalHome: "Execution Reliability" },
  { index: 6,  slug: "when-the-deadline-starts-slipping",               title: "When the Deadline Starts Slipping",                internalHome: "Execution Reliability" },
  { index: 7,  slug: "saying-the-hard-thing",                           title: "Saying the Hard Thing",                            internalHome: "Communication Under Pressure" },
  { index: 8,  slug: "feedback-you-did-not-want-to-hear",               title: "Feedback You Did Not Want to Hear",                internalHome: "Communication Under Pressure" },
  { index: 9,  slug: "when-you-and-a-teammate-see-it-differently",      title: "When You and a Teammate See It Differently",       internalHome: "Collaboration and Conflict Resolution" },
  { index: 10, slug: "disagreement-gets-personal",                      title: "Disagreement Gets Personal",                       internalHome: "Collaboration and Conflict Resolution" },
  { index: 11, slug: "reading-a-workplace-you-do-not-yet-understand",   title: "Reading a Workplace You Do Not Yet Understand",    internalHome: "Workplace Adaptability" },
  { index: 12, slug: "everything-is-urgent",                            title: "Everything Is Urgent",                             internalHome: "Prioritization and Time Management" },
  { index: 13, slug: "recovering-after-a-bad-day",                      title: "Recovering After a Bad Day",                       internalHome: "Resilience and Recovery" },
  { index: 14, slug: "when-feedback-shows-you-something-you-missed",    title: "When Feedback Shows You Something You Missed",     internalHome: "Learning Agility" },
  { index: 15, slug: "when-the-line-gets-blurry",                       title: "When the Line Gets Blurry",                        internalHome: "Professional Boundaries" },
  { index: 16, slug: "the-usual-fix-will-not-work",                     title: "The Usual Fix Will Not Work",                      internalHome: "Creative Problem-Solving" },
  { index: 17, slug: "more-than-the-standard-answer",                   title: "More Than the Standard Answer",                    internalHome: "Customer and Service Focus" },
  { index: 18, slug: "buy-in-without-authority",                        title: "Buy-In Without Authority",                         internalHome: "Influence and Persuasion" },
  { index: 19, slug: "when-the-work-depends-on-someone-you-do-not-know-yet", title: "When the Work Depends on Someone You Do Not Know Yet", internalHome: "Relationship Building" },
  { index: 20, slug: "keeping-a-working-relationship-alive",            title: "Keeping a Working Relationship Alive",             internalHome: "Relationship Building" },
];

/**
 * Focused Rehearsal Products.
 *
 * Only products that exist and can be delivered appear here — no
 * placeholders. Each product includes a set of Workplace Moments
 * from the shelf above by slug; the mapping is provisional and is
 * confirmed with T3A rather than assumed.
 */

export type FocusedProduct = {
  slug: string;
  title: string;
  purpose: string;
  /** internal build reference — buyer-facing cards use moment titles instead */
  internalBuildModuleNames?: string[];
  /** slugs from WORKPLACE_MOMENTS that this product bundles */
  includedMomentSlugs: string[];
  /** provisional mapping flag — set true until T3A confirms */
  mappingProvisional: boolean;
};

export const FOCUSED_PRODUCTS: FocusedProduct[] = [
  {
    slug: "probation-blueprint",
    title: "Probation Blueprint",
    purpose:
      "Prepare for the workplace moments that most often come up in the first ninety days.",
    includedMomentSlugs: [
      "when-doing-the-right-thing-has-a-cost",
      "owning-what-happened",
      "you-said-it-would-be-done",
      "saying-the-hard-thing",
      "when-you-and-a-teammate-see-it-differently",
      "recovering-after-a-bad-day",
      "when-feedback-shows-you-something-you-missed",
    ],
    mappingProvisional: true,
  },
  {
    slug: "ai-ready-behaviors",
    title: "AI-Ready Behaviors",
    purpose:
      "Prepare for the workplace moments AI is bringing to more roles: judgment, disclosure, override, gray-zone calls, and recovery when it goes wrong.",
    internalBuildModuleNames: [
      "AI Output Judgment",
      "AI Disclosure and Attribution",
      "AI Override and Escalation",
      "AI Gray Zone",
      "AI Breakdown and Recovery",
    ],
    // buyer-facing cards inside the product page will use moment-led
    // titles supplied by T3A when they land; leaving the shelf-slug
    // list empty until then so no fabricated mapping ships.
    includedMomentSlugs: [],
    mappingProvisional: true,
  },
];
