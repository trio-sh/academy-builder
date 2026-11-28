/**
 * The four approved advertisements (Dr. Tony Mofoke, 27 November 2026). Every word below is his, exactly as written: do not add, shorten or rephrase a line.
 * Wording rules (his section 3): "Behavioral" spelled the American way; "résumé" keeps its accent; "workplace-pressure moments" keeps its hyphen and no other
 * hyphen is added; "pressure" always has "workplace" before it. The caption of each post carries the full text ending with the fine print (3.4), and each image's
 * alt text carries the full wording (3.5); both are built here from the same lines, so they cannot drift from the image.
 * STAGED, NOT PUBLISHED: every advertisement is released: false. Dr. Mofoke releases each one; nothing on a public page shows an advertisement until it is.
 */
export type LineRole = "lead" | "sub" | "body" | "ask";

export interface AdLine {
  role: LineRole;
  text: string;
  /** a part of the text set in italics and the brand colour; the words themselves do not change */
  em?: string;
}

export interface Advert {
  id: "ad1" | "ad2" | "ad3" | "ad4";
  /** the brief's name for it, for the people staging it; not part of the advertisement */
  name: string;
  audience: "job-seekers" | "employers";
  eyebrow: string;
  lines: AdLine[];
  /** the call to action: the lines as they appear, and the link the button opens */
  cta: { lines: string[]; href: string };
  finePrint: string;
  released: boolean;
}

const PILOT = "mailto:hello@the3rdacademy.com?subject=Pilot";
const EMPLOYER = "mailto:hello@the3rdacademy.com?subject=Employer%20Sample";
const PILOT_FINE = "Coming soon. Free for pilot participants who complete the process. Limited places. Join the list to hear first.";
const EMPLOYER_FINE = "Coming soon. Free preview with a sample report. Participants control their reports; hiring decisions stay with you.";

export const ADVERTS: Advert[] = [
  {
    id: "ad1", name: "Ad 1 · Job Seekers: Lead Advertisement", audience: "job-seekers",
    eyebrow: "THE 3RD ACADEMY · JOB SEEKERS",
    lines: [
      { role: "lead", text: "AI can polish your résumé.", em: "polish your résumé" },
      { role: "sub", text: "It doesn't show how you respond under workplace pressure.", em: "workplace pressure" },
      { role: "ask", text: "Stand out with a free Behavioral Evidence Report from The 3rd Academy.", em: "free Behavioral Evidence Report" },
    ],
    cta: { lines: ["Join the interest list: hello@the3rdacademy.com", "Subject: Pilot"], href: PILOT },
    finePrint: PILOT_FINE, released: false,
  },
  {
    id: "ad2", name: "Ad 2 · Job Seekers: Trust and Participant Control", audience: "job-seekers",
    eyebrow: "THE 3RD ACADEMY · JOB SEEKERS",
    lines: [
      { role: "lead", text: "Your evidence. Your choice.", em: "Your choice." },
      { role: "sub", text: "A record of how you respond under workplace pressure.", em: "workplace pressure" },
      { role: "sub", text: "You decide whether to share it.", em: "You decide" },
      { role: "ask", text: "Discover the free Behavioral Evidence Report from The 3rd Academy.", em: "free Behavioral Evidence Report" },
    ],
    cta: { lines: ["Join the interest list: hello@the3rdacademy.com", "Subject: Pilot"], href: PILOT },
    finePrint: PILOT_FINE, released: false,
  },
  {
    id: "ad3", name: "Ad 3 · Employers: Lead Advertisement", audience: "employers",
    eyebrow: "THE 3RD ACADEMY · EMPLOYERS",
    lines: [
      { role: "lead", text: "Strong résumé. Great interview. Then came the first difficult week.", em: "first difficult week." },
      { role: "body", text: "Interviews show how candidates talk about work. The Behavioral Evidence Report from The 3rd Academy records how a person responded in realistic workplace-pressure moments, observed by an experienced professional.", em: "realistic workplace-pressure moments" },
      { role: "ask", text: "Request a sample report and decide what it could add to your hiring process.", em: "Request a sample report" },
    ],
    cta: { lines: ["hello@the3rdacademy.com", "Subject: Employer Sample"], href: EMPLOYER },
    finePrint: EMPLOYER_FINE, released: false,
  },
  {
    id: "ad4", name: "Ad 4 · Employers: Short Advertisement", audience: "employers",
    eyebrow: "THE 3RD ACADEMY · EMPLOYERS",
    lines: [
      { role: "lead", text: "They interviewed well.", em: "interviewed well." },
      { role: "sub", text: "Then workplace pressure revealed what the interview hadn't.", em: "workplace pressure" },
      { role: "ask", text: "Request a sample Behavioral Evidence Report from The 3rd Academy and decide what it could add to your hiring process.", em: "sample Behavioral Evidence Report" },
    ],
    cta: { lines: ["hello@the3rdacademy.com", "Subject: Employer Sample"], href: EMPLOYER },
    finePrint: EMPLOYER_FINE, released: false,
  },
];

/** every line of the advertisement in reading order: the eyebrow, the lines, the call to action, the fine print */
export function advertLines(a: Advert): string[] {
  return [a.eyebrow, ...a.lines.map((l) => l.text), ...a.cta.lines, a.finePrint];
}

/** the post caption: the full text, ending with the fine print (his 3.4). The call to action's two lines stay together. */
export function caption(a: Advert): string {
  return [a.eyebrow, ...a.lines.map((l) => l.text), a.cta.lines.join("\n"), a.finePrint].join("\n\n");
}

/** the alt text of every image of the advertisement: the full wording (his 3.5) */
export function altText(a: Advert): string {
  return advertLines(a).join(" ");
}

/** split a line around its emphasised part, so the words render unchanged */
export function splitEmphasis(l: AdLine): [string, string, string] {
  if (!l.em) return [l.text, "", ""];
  const i = l.text.indexOf(l.em);
  return i < 0 ? [l.text, "", ""] : [l.text.slice(0, i), l.em, l.text.slice(i + l.em.length)];
}

/** only an advertisement Dr. Mofoke has released may appear on a public page */
export function releasedAdverts(list: Advert[] = ADVERTS): Advert[] {
  return list.filter((a) => a.released);
}
