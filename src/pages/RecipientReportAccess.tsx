/**
 * Named recipient — T3A-D1-EXEC-001 §7.5 and §8.4.
 *
 * A recipient does not need an approved employer account, and an
 * approved employer account does not give access to anything. These are
 * two independent things, and this route joins neither: it requires no
 * sign-in, reads no account, and asks for nothing but the token and the
 * address the participant named.
 *
 * Must not appear here, and are therefore absent rather than gated:
 *   — any full record;
 *   — any traceability sheet;
 *   — any other report;
 *   — any other participant;
 *   — any search;
 *   — any export beyond the report face;
 *   — any account requirement.
 *
 * Every state but one returns no content: revoked, expired, superseded,
 * unknown token and unverified address all return a state alone.
 */
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

type Redemption = {
  content: boolean;
  state?: string;
  render_target?: string;
  ber_report_id?: string;
  report_version?: string;
};

/**
 * A block of THIS report, exactly as t3a_d1_report_face_for_release
 * assembled it. The screen no longer reads the global block schedule or
 * the controlled-text register: a recipient sees the report they were
 * released, and nothing that describes reports in general.
 */
type FaceBlock = {
  block_no: number;
  block_name: string;
  render_behaviour: string;
  renders: boolean;
  not_rendering_reason: string | null;
  controlled_text_ref: string | null;
  controlled_text: string | null;
  rows: { dimension_id: string; stage_code: string; statement: string }[] | null;
};

/** §7.5 — each state, and what the recipient is told. None returns content. */
const STATE_COPY: Record<string, { heading: string; body: string }> = {
  REVOKED: {
    heading: "This release has been revoked",
    body: "The participant controls this disclosure and has withdrawn it. The report must not be read, retained or relied upon further.",
  },
  EXPIRED: {
    heading: "This release has expired",
    body: "A release is time-limited. Ask the participant to make a new release if you still need to read the report.",
  },
  SUPERSEDED: {
    heading: "This version has been superseded",
    body: "A release covers one version of a report. This report has since been amended, and the later version is not covered by this release. A new release is needed to read it.",
  },
  DISCLOSURE_CONSENT_NOT_GRANTED: {
    heading: "This release is not in force",
    body: "A release requires the participant's consent for this specific disclosure. That consent is not currently granted.",
  },
  ADDRESS_NOT_VERIFIED: {
    heading: "That address does not match this release",
    body: "A release is bound to the recipient the participant named. Enter the address the release was sent to.",
  },
  UNKNOWN_TOKEN: {
    heading: "That link is not recognized",
    body: "Check the link in full. Nothing about any report or participant is returned for an unrecognized link.",
  },
};

const RecipientReportAccess = () => {
  const [token, setToken] = useState("");
  const [address, setAddress] = useState("");
  const [result, setResult] = useState<Redemption | null>(null);
  const [blocks, setBlocks] = useState<ReportBlock[]>([]);
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [isWorking, setIsWorking] = useState(false);

  // Status-only verification, §6.2.4 and §7.5. Returns current, amended
  // or withdrawn, and never content.
  // The blocks of THIS report, as the server assembled them.
  const [face, setFace] = useState<FaceBlock[]>([]);
  const [faceRefusal, setFaceRefusal] = useState<string | null>(null);

  const [verifyId, setVerifyId] = useState("");
  const [verifyState, setVerifyState] = useState<string | null>(null);

  const onRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsWorking(true);
    // One call. It redeems the token and returns the face of the report
    // that token authorizes — not the global block schedule, which is
    // what this screen used to render and which would have shown every
    // valid recipient the boilerplate instead of the report.
    //
    // The token is re-checked inside it on every call, so a revocation
    // takes effect here immediately rather than at a login the recipient
    // does not have.
    const { data } = await supabase.rpc("t3a_d1_report_face_for_release", {
      p_token: token,
      p_verified_address: address,
    });
    const payload = (data ?? { content: false, state: "UNKNOWN_TOKEN" }) as
      Redemption & {
        face?: { rendered?: boolean; refusal_code?: string; blocks?: FaceBlock[] };
      };
    setResult(payload);
    // §6.2 — where a mandatory block's controlled text is not loaded the
    // assembler refuses the whole face. An incomplete face must never
    // render as a short one, so the refusal is carried through.
    setFaceRefusal(
      payload.content && payload.face && payload.face.rendered === false
        ? (payload.face.refusal_code ?? "REPORT_FACE_DID_NOT_RENDER")
        : null
    );
    setFace(payload.content ? (payload.face?.blocks ?? []) : []);
    setIsWorking(false);
  };

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await supabase.rpc("t3a_d1_verify_status", {
      p_verification_id: verifyId,
    });
    const v = data as { known?: boolean; status?: string } | null;
    setVerifyState(v?.known ? (v.status ?? "unknown") : "not recognized");
  };

  const stateCopy = result && !result.content ? STATE_COPY[result.state ?? ""] : null;

  return (
    <main className="min-h-screen px-6 py-16 md:py-24">
      <div className="max-w-3xl mx-auto">
        <p className="mono-label text-foreground/55 mb-3">The 3rd Academy</p>
        <h1 className="display-serif text-3xl md:text-4xl text-foreground mb-4">
          Read a Behavioral Evidence Report&trade;
        </h1>
        <p className="text-foreground/75 leading-relaxed mb-12 max-w-2xl">
          A participant released one report to you, at one version. No account
          is needed, and creating one would give you no additional access.
        </p>

        {!result?.content && (
          <form onSubmit={onRedeem} className="space-y-6 max-w-xl mb-16">
            <label className="block">
              <span className="mono-label text-foreground/70 block mb-2">
                The link you were sent
              </span>
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full border border-foreground/30 bg-transparent px-3 py-2 text-foreground"
              />
            </label>
            <label className="block">
              <span className="mono-label text-foreground/70 block mb-2">
                The address it was sent to
              </span>
              <input
                type="email"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full border border-foreground/30 bg-transparent px-3 py-2 text-foreground"
              />
              <span className="block text-foreground/55 text-[0.875rem] mt-2 leading-relaxed">
                The release is bound to the person the participant named. The
                address is checked at this moment, not when the link was made.
              </span>
            </label>
            <Button type="submit" disabled={isWorking || token.trim() === ""}>
              {isWorking ? "Checking…" : "Open the report"}
            </Button>
          </form>
        )}

        {/* A state, and no content. */}
        {stateCopy && (
          <section className="border-l-2 border-foreground pl-8 mb-16 max-w-2xl">
            <h2 className="display-serif text-2xl text-foreground mb-3">
              {stateCopy.heading}
            </h2>
            <p className="text-foreground/75 leading-relaxed">{stateCopy.body}</p>
          </section>
        )}

        {result && !result.content && !stateCopy && (
          <section className="border-l-2 border-foreground pl-8 mb-16 max-w-2xl">
            <h2 className="display-serif text-2xl text-foreground mb-3">
              This report cannot be opened
            </h2>
            <p className="text-foreground/75 leading-relaxed">
              No content is returned. If you believe this is wrong, ask the
              participant who released it.
            </p>
          </section>
        )}

        {/* The report face, at the released version. §6.2's eleven blocks
            in fixed order. Nothing else renders: no full record, no
            traceability sheet, no other report, no other participant. */}
        {result?.content && (
          <article className="mb-16">
            <header className="border-y-2 border-foreground py-6 mb-10">
              <p className="mono-label text-foreground/55 mb-2">
                Behavioral Evidence Report&trade; · version {result.report_version}
              </p>
              <p className="text-foreground/70 text-[0.9375rem]">
                Released to you by the participant. Render target:{" "}
                {result.render_target}.
              </p>
            </header>

            {faceRefusal && (
              <p className="mono-label ink-vermilion mb-8">
                {faceRefusal} — this report face is incomplete and is not a
                valid rendering. Nothing partial is shown.
              </p>
            )}

            {!faceRefusal && face.map((b) => {
              // A conditional block that did not fire renders nothing at
              // all here. The recipient reads a report, not an account of
              // which parts of a report template were inapplicable.
              if (!b.renders) return null;

              return (
                <section key={b.block_no} className="mb-10">
                  <h2 className="mono-label text-foreground/55 mb-3">
                    {b.block_no}. {b.block_name}
                  </h2>

                  {b.controlled_text && (
                    <p className="text-foreground/85 leading-relaxed max-w-2xl whitespace-pre-line">
                      {b.controlled_text}
                    </p>
                  )}

                  {/* Block 4 — the observed conduct, as composed. */}
                  {b.rows !== null && b.rows.length > 0 && (
                    <div className="overflow-x-auto mt-4">
                      <table className="w-full border-t-2 border-foreground text-left">
                        <thead>
                          <tr className="border-b border-foreground/30">
                            <th className="mono-label text-foreground/55 py-3 pr-6 font-normal">
                              Dimension
                            </th>
                            <th className="mono-label text-foreground/55 py-3 pr-6 font-normal">
                              Stage
                            </th>
                            <th className="mono-label text-foreground/55 py-3 font-normal">
                              Observed conduct
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {b.rows.map((row, i) => (
                            <tr
                              key={`${b.block_no}-${i}`}
                              className="border-b border-foreground/20 align-top"
                            >
                              <td className="py-4 pr-6 text-foreground/80">
                                {row.dimension_id}
                              </td>
                              <td className="py-4 pr-6 text-foreground/80">
                                {row.stage_code}
                              </td>
                              <td className="py-4 text-foreground/85 leading-relaxed">
                                {row.statement}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              );
            })}
          </article>
        )}

        {/* Status-only verification. Returns current, amended or
            withdrawn, and never content. */}
        <section className="border-t-2 border-foreground pt-10">
          <h2 className="display-serif text-2xl text-foreground mb-3">
            Check the status of a report
          </h2>
          <p className="text-foreground/70 leading-relaxed mb-6 max-w-2xl">
            Verification confirms status only. It returns whether a report is
            current, amended or withdrawn, and it returns no content. Holding a
            report is not proof of the identity of the person it describes.
          </p>
          <form onSubmit={onVerify} className="flex flex-wrap gap-4 items-end max-w-xl">
            <label className="flex-1 min-w-[16rem]">
              <span className="mono-label text-foreground/70 block mb-2">
                Verification identifier
              </span>
              <input
                value={verifyId}
                onChange={(e) => setVerifyId(e.target.value)}
                className="w-full border border-foreground/30 bg-transparent px-3 py-2 text-foreground"
              />
            </label>
            <Button type="submit" variant="outline" disabled={verifyId.trim() === ""}>
              Check status
            </Button>
          </form>
          {verifyState && (
            <p className="mono-label text-foreground mt-5">Status: {verifyState}</p>
          )}
        </section>
      </div>
    </main>
  );
};

export default RecipientReportAccess;
