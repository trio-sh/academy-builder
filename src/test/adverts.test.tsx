import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ADVERTS, advertLines, altText, caption, releasedAdverts, splitEmphasis, type Advert } from "@/content/adverts";
import { AdvertCard, AdvertSlot } from "@/components/adverts/AdvertCard";
import { AdvertPoster } from "@/components/adverts/AdvertPoster";

/**
 * The approved copy of 27 November 2026, as Dr. Tony Mofoke wrote it, copied here as the source of truth. The advertisements must match it exactly.
 * Each entry: the lines of the advertisement in reading order (eyebrow, lines, call to action, fine print).
 */
const PILOT_FINE = "Coming soon. Free for pilot participants who complete the process. Limited places. Join the list to hear first.";
const EMPLOYER_FINE = "Coming soon. Free preview with a sample report. Participants control their reports; hiring decisions stay with you.";
const APPROVED: Record<string, string[]> = {
  ad1: ["THE 3RD ACADEMY · JOB SEEKERS", "AI can polish your résumé.", "It doesn't show how you respond under workplace pressure.", "Stand out with a free Behavioral Evidence Report from The 3rd Academy.", "Join the interest list: hello@the3rdacademy.com", "Subject: Pilot", PILOT_FINE],
  ad2: ["THE 3RD ACADEMY · JOB SEEKERS", "Your evidence. Your choice.", "A record of how you respond under workplace pressure.", "You decide whether to share it.", "Discover the free Behavioral Evidence Report from The 3rd Academy.", "Join the interest list: hello@the3rdacademy.com", "Subject: Pilot", PILOT_FINE],
  ad3: ["THE 3RD ACADEMY · EMPLOYERS", "Strong résumé. Great interview. Then came the first difficult week.", "Interviews show how candidates talk about work. The Behavioral Evidence Report from The 3rd Academy records how a person responded in realistic workplace-pressure moments, observed by an experienced professional.", "Request a sample report and decide what it could add to your hiring process.", "hello@the3rdacademy.com", "Subject: Employer Sample", EMPLOYER_FINE],
  ad4: ["THE 3RD ACADEMY · EMPLOYERS", "They interviewed well.", "Then workplace pressure revealed what the interview hadn't.", "Request a sample Behavioral Evidence Report from The 3rd Academy and decide what it could add to your hiring process.", "hello@the3rdacademy.com", "Subject: Employer Sample", EMPLOYER_FINE],
};
const LINKS = { ad1: "mailto:hello@the3rdacademy.com?subject=Pilot", ad2: "mailto:hello@the3rdacademy.com?subject=Pilot", ad3: "mailto:hello@the3rdacademy.com?subject=Employer%20Sample", ad4: "mailto:hello@the3rdacademy.com?subject=Employer%20Sample" };

describe("the four advertisements", () => {
  it("are the four approved ones, in order", () => { expect(ADVERTS.map((a) => a.id)).toEqual(["ad1", "ad2", "ad3", "ad4"]); });
  for (const a of ADVERTS) {
    it(`${a.id}: every line is exactly as approved, in order, with nothing added or dropped`, () => {
      expect(advertLines(a)).toEqual(APPROVED[a.id]);
    });
    it(`${a.id}: the call to action opens the pre-filled email of Table 4.1`, () => { expect(a.cta.href).toBe(LINKS[a.id]); });
    it(`${a.id}: the caption carries the full text and ends with the fine print`, () => {
      const c = caption(a);
      for (const line of APPROVED[a.id]) expect(c).toContain(line);
      expect(c.endsWith(a.finePrint)).toBe(true);
      expect(c.indexOf(a.eyebrow)).toBe(0);
    });
    it(`${a.id}: the alt text carries the full wording`, () => {
      const t = altText(a);
      for (const line of APPROVED[a.id]) expect(t).toContain(line);
    });
    it(`${a.id}: each emphasised part is a part of its line, so no word is changed by styling`, () => {
      for (const l of a.lines) { const [x, em, y] = splitEmphasis(l); expect(em.length).toBeGreaterThan(0); expect(x + em + y).toBe(l.text); }
    });
  }
});

describe("the wording rules", () => {
  const all = ADVERTS.flatMap((a) => advertLines(a));
  const text = all.join("\n");
  it("3.1 spells Behavioral the American way and keeps the accent in résumé", () => {
    expect(text).not.toMatch(/behaviour/i);
    expect(text).not.toMatch(/\bresume\b/i);          // a résumé without its accents
    expect(text).toMatch(/Behavioral/); expect(text).toMatch(/résumé/);
    expect(text).not.toMatch(/\bresum[ée]\b|\brésume\b|\bresumé\b/);   // neither accent dropped nor misplaced
  });
  it("3.2 workplace-pressure moments keeps its hyphen and no other hyphen is added", () => {
    const hyphens = text.match(/\w-\w/g) ?? [];
    expect(hyphens).toEqual(["e-p"]);                  // the one in "workplace-pressure"
    expect(text).toContain("workplace-pressure moments");
    expect(text).not.toMatch(/[–—]/);                  // no dashes either
  });
  it("3.3 pressure always appears with workplace before it", () => {
    const n = (text.match(/pressure/gi) ?? []).length;
    expect(n).toBeGreaterThan(0);
    expect((text.match(/workplace[ -]pressure/gi) ?? []).length).toBe(n);
  });
});

describe("staged, not published", () => {
  it("none is released, so none may appear on a public page", () => {
    expect(ADVERTS.every((a) => a.released === false)).toBe(true);
    expect(releasedAdverts()).toEqual([]);
  });
  it("a slot shows nothing for an advertisement that is not released, and the advertisement once it is", () => {
    const { container } = render(<AdvertSlot id="ad1" />);
    expect(container.innerHTML).toBe("");
    const released: Advert[] = ADVERTS.map((a) => (a.id === "ad1" ? { ...a, released: true } : a));
    render(<AdvertSlot id="ad1" adverts={released} />);
    expect(screen.getByTestId("advert-ad1")).toBeTruthy();
    const { container: other } = render(<AdvertSlot id="ad2" adverts={released} />);
    expect(other.innerHTML).toBe("");                  // releasing one does not release another
  });
});

describe("on the platform", () => {
  for (const a of ADVERTS) {
    it(`${a.id}: the call to action is a button that opens the pre-filled email and carries only the advertisement's own lines`, () => {
      render(<AdvertCard advert={a} />);
      const cta = screen.getByTestId(`advert-${a.id}-cta`) as HTMLAnchorElement;
      expect(cta.getAttribute("href")).toBe(LINKS[a.id]);
      expect(cta.textContent).toBe(a.cta.lines.join(""));
    });
    it(`${a.id}: the poster reads exactly as the advertisement, in both sizes`, () => {
      for (const f of ["portrait", "landscape"] as const) {
        const { container, unmount } = render(<AdvertPoster advert={a} format={f} />);
        const lines = [...container.querySelectorAll(".advert-eyebrow, .advert-line, .advert-cta-main, .advert-cta-sub, .advert-fine")].map((el) => el.textContent);
        expect(lines).toEqual(APPROVED[a.id]);
        unmount();
      }
    });
  }
});
