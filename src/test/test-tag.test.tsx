/** The founder's condition on delivery (23 October 2026): every Behavioral Evidence Report the platform produces carries a visible "TEST" tag. */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { readFileSync } from "node:fs";
import path from "node:path";

const rpc = vi.fn();
vi.mock("@/lib/supabase", () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }));

import TestTag from "@/components/TestTag";
import AccessibleReport from "@/pages/dashboard/candidate/AccessibleReport";
import EmployerReportReader from "@/pages/dashboard/employer/EmployerReportReader";
import { BerMultiDocument } from "@/pages/print/BerMultiPrintView";
import fixture from "@/lib/berMultipage/fix-multipage.json";

beforeEach(() => rpc.mockReset());
const at = (route: string, el: JSX.Element) => render(<MemoryRouter initialEntries={[route]}><Routes><Route path="/r/:berReportId" element={el} /></Routes></MemoryRouter>);

describe("every face of a report carries the TEST tag", () => {
  it("the tag is the word TEST, as text, in a note", () => {
    render(<TestTag inline />);
    expect(screen.getByTestId("test-tag")).toHaveTextContent(/^TEST$/);
    expect(screen.getByRole("note")).toBeInTheDocument();
  });

  it("the accessible version shows it", async () => {
    rpc.mockResolvedValueOnce({ data: { rendered: true, tagged: { lang: "en", title: "Behavioral Evidence Report", children: [] } }, error: null });
    at("/r/abc", <AccessibleReport />);
    expect(await screen.findByTestId("accessible-report")).toBeInTheDocument();
    expect(screen.getByTestId("test-tag")).toHaveTextContent("TEST");
  });

  it("the employer reader shows it on a report that reads", async () => {
    rpc.mockResolvedValueOnce({ data: { outcome: "read", face: { rendered: true, blocks: [] } }, error: null });
    at("/r/abc", <EmployerReportReader />);
    expect(await screen.findByTestId("reader")).toBeInTheDocument();
    expect(screen.getByTestId("test-tag")).toHaveTextContent("TEST");
  });

  it("the employer reader shows no tag on a report it does not show (nothing is produced)", async () => {
    rpc.mockResolvedValueOnce({ data: { outcome: "unavailable" }, error: null });
    at("/r/abc", <EmployerReportReader />);
    expect(await screen.findByTestId("reader-unavailable")).toBeInTheDocument();
    expect(screen.queryByTestId("test-tag")).toBeNull();
  });

  it("every page of the multi page package shows it", () => {
    const { container } = render(<BerMultiDocument pkg={JSON.parse(JSON.stringify(fixture))} />);
    const pages = container.querySelectorAll(".mp-page");
    expect(pages.length).toBeGreaterThan(1);
    for (const p of Array.from(pages)) expect(p.querySelector("[data-testid='test-tag']")).not.toBeNull();
  });

  it.each([
    ["src/pages/print/BerPrintView.tsx", /<div className="ber-page">\s*<TestTag \/>/],
    ["src/pages/RecipientReportAccess.tsx", /<article className="mb-16">\s*<TestTag inline \/>/],
  ])("%s renders the tag as the first thing on the face", (file, pattern) => {
    expect(readFileSync(path.resolve(__dirname, "../..", file), "utf8")).toMatch(pattern);
  });
});
