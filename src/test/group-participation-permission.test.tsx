import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

const rpc = vi.fn();
vi.mock("@/lib/supabase", () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }));

import GroupParticipationPermission from "@/pages/dashboard/candidate/GroupParticipationPermission";

const NOTICE = {
  rendered: true,
  notice_version: "1.0",
  text: "In this session you will take part in a live discussion on Google Meet with a mentor and three people who play set roles. Only you are observed.\nDo you agree to take part in this group session?",
};

beforeEach(() => rpc.mockReset());

describe("Stage 4 group participation permission", () => {
  it("shows nothing while the notice is unloaded", async () => {
    rpc.mockResolvedValueOnce({ data: { rendered: false, reason: "group_notice_unloaded" } });
    const { container } = render(<GroupParticipationPermission groupSessionId="gs-1" />);
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("t3a_group_participation_notice"));
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the loaded text, one question, Yes and No, nothing preselected", async () => {
    rpc.mockResolvedValueOnce({ data: NOTICE });
    render(<GroupParticipationPermission groupSessionId="gs-1" />);
    expect(await screen.findByText(/live discussion on Google Meet/)).toBeInTheDocument();
    expect(screen.getByText("Do you agree to take part in this group session?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yes" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "No" })).toBeEnabled();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    expect(rpc).toHaveBeenCalledTimes(1); // nothing is recorded until an answer
  });

  it("Yes records the permission for this session and reports it", async () => {
    rpc.mockResolvedValueOnce({ data: NOTICE }).mockResolvedValueOnce({ data: { outcome: "recorded" }, error: null });
    const onDone = vi.fn();
    render(<GroupParticipationPermission groupSessionId="gs-9" onDone={onDone} />);
    fireEvent.click(await screen.findByRole("button", { name: "Yes" }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith("yes"));
    expect(rpc).toHaveBeenLastCalledWith("t3a_cr30_answer", { p_group_session: "gs-9", p_answer: "yes" });
  });

  it("No records nothing", async () => {
    rpc.mockResolvedValueOnce({ data: NOTICE });
    const onDone = vi.fn();
    render(<GroupParticipationPermission groupSessionId="gs-1" onDone={onDone} />);
    fireEvent.click(await screen.findByRole("button", { name: "No" }));
    expect(onDone).toHaveBeenCalledWith("no");
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("status")).toHaveTextContent("Nothing has been recorded");
  });

  it("a refused or failed save is not reported as agreement", async () => {
    rpc.mockResolvedValueOnce({ data: NOTICE }).mockResolvedValueOnce({ data: { outcome: "refused" }, error: null });
    const onDone = vi.fn();
    render(<GroupParticipationPermission groupSessionId="gs-1" onDone={onDone} />);
    fireEvent.click(await screen.findByRole("button", { name: "Yes" }));
    expect(await screen.findByRole("status")).toHaveTextContent("could not be saved");
    expect(onDone).not.toHaveBeenCalled();
  });
});
