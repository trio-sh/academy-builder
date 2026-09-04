import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  ShieldOff,
  ShieldAlert,
  FileQuestion,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { LedgerHero, LedgerSection } from "@/components/ledger";
import { Button } from "@/components/ui/button";
import { todayStamp } from "@/lib/dateStamp";

/**
 * Public, unauthenticated verification surface for D1 Observation Pathway
 * disclosure tokens — T3A-D1-DEV-INS-007 §7 t3a_d1_verify_by_token.
 *
 * A holder of a shared report link pastes the opaque token from the
 * URL. We call t3a_d1_verify_by_token(text) via the anon key. No
 * account required, no cookies set. The RPC returns a minimal fact
 * set — never the rendered report body.
 */

type VerifyResponse =
  | {
      verified: true;
      participant_name?: string;
      dimension_id?: string;
      issued_at?: string;
      state?: "issued" | "superseded" | "withdrawn";
      superseded_by?: string | null;
    }
  | {
      verified: false;
      reason:
        | "TOKEN_MISSING"
        | "TOKEN_UNKNOWN"
        | "DISCLOSURE_NOT_ACTIVE"
        | "ISSUANCE_WITHDRAWN"
        | string;
      state?: string;
    };

const REFUSAL_META: Record<
  string,
  { label: string; body: string; tone: "warn" | "stop" | "muted" }
> = {
  TOKEN_MISSING: {
    label: "Token missing",
    body: "The verification form did not receive a token to check.",
    tone: "muted",
  },
  TOKEN_UNKNOWN: {
    label: "No matching record",
    body: "No disclosed record matches this token. The link may be mistyped, may have been revoked, or may never have existed.",
    tone: "muted",
  },
  DISCLOSURE_NOT_ACTIVE: {
    label: "Disclosure not active",
    body: "The participant who shared this record has revoked or expired the disclosure. The record itself remains on file with them; it is no longer viewable through this token.",
    tone: "stop",
  },
  ISSUANCE_WITHDRAWN: {
    label: "Withdrawn",
    body: "The issuance this token refers to has been withdrawn. Do not rely on it as current evidence.",
    tone: "stop",
  },
};

function toneClass(tone: "ok" | "warn" | "stop" | "muted") {
  switch (tone) {
    case "ok":    return "border-foreground bg-foreground/[0.04]";
    case "warn":  return "border-vermilion bg-vermilion/[0.06]";
    case "stop":  return "border-vermilion bg-vermilion/10";
    case "muted": return "border-foreground/40 bg-foreground/[0.02]";
  }
}
function toneInk(tone: "ok" | "warn" | "stop" | "muted") {
  switch (tone) {
    case "ok":    return "text-foreground";
    case "warn":  return "ink-vermilion";
    case "stop":  return "ink-vermilion";
    case "muted": return "text-foreground/70";
  }
}

const TOKEN_MIN = 8;
const TOKEN_MAX = 128;

export default function VerifyReportToken() {
  const { token: routeToken } = useParams<{ token?: string }>();
  const [params] = useSearchParams();
  const queryToken = params.get("token") ?? params.get("t") ?? "";

  const [input, setInput] = useState<string>(routeToken ?? queryToken ?? "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verify = async (token: string) => {
    const trimmed = token.trim();
    if (!trimmed) return;
    if (trimmed.length < TOKEN_MIN || trimmed.length > TOKEN_MAX) {
      setError(
        "Enter the verification token from the report link. It is a short opaque string, not an email address or a name."
      );
      setResult(null);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { data, error: rpcErr } = await supabase.rpc(
        "t3a_d1_verify_by_token",
        { p_token: trimmed }
      );
      if (rpcErr) {
        setError(rpcErr.message);
        setResult(null);
      } else {
        setResult(data as VerifyResponse);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initial = (routeToken || queryToken || "").trim();
    if (initial && initial.length >= TOKEN_MIN) void verify(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeToken, queryToken]);

  const okState = result && result.verified ? result.state : undefined;
  const okTone: "ok" | "muted" | "stop" =
    okState === "issued"
      ? "ok"
      : okState === "superseded"
      ? "muted"
      : okState === "withdrawn"
      ? "stop"
      : "ok";

  return (
    <PublicLayout>
      <LedgerHero
        eyebrow="§ D1 Verification"
        meta="Public register — no account required"
        stamp={todayStamp()}
        title={
          <>
            <span className="block">Verify a shared</span>
            <span className="block italic display-serif-italic">
              Behavioral Evidence
            </span>
            <span className="block">
              Report link.{" "}
              <span className="ink-vermilion">Minimal facts only.</span>
            </span>
          </>
        }
        lede={
          <>
            Paste the verification token from the report link. We confirm the
            record was issued, disclosed to you by the participant, and is
            still current. We never return the report body through this
            surface — that stays on the participant's disclosure page.
          </>
        }
      >
        <div className="mono-label text-foreground/60">
          Endpoint: <span className="text-foreground">t3a_d1_verify_by_token</span> · unauthenticated
        </div>
      </LedgerHero>

      <LedgerSection first className="pt-10 pb-14">
        <div className="max-w-2xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void verify(input);
            }}
            className="border-2 border-foreground p-5 md:p-6 bg-background"
          >
            <label className="mono-label text-foreground block mb-2">
              § Verification token
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="paste the token from the report link"
                className="flex-1 bg-background border border-foreground/40 focus:border-foreground outline-none px-3 py-2 font-mono text-sm text-foreground rounded-none"
                autoComplete="off"
                spellCheck={false}
              />
              <Button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none px-5 py-2 text-sm font-medium tracking-wide"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying…
                  </>
                ) : (
                  <>Verify token</>
                )}
              </Button>
            </div>
            <p className="marginalia text-[0.75rem] mt-3">
              No account. No cookie. No profile. Nothing about the reader is
              disclosed to the participant.
            </p>
          </form>

          {error && (
            <div className="mt-6 border-2 border-vermilion bg-vermilion/[0.06] p-4">
              <div className="mono-label ink-vermilion mb-1">
                § Verification error
              </div>
              <p className="text-sm text-foreground">{error}</p>
            </div>
          )}

          {result && !result.verified && (() => {
            const meta =
              REFUSAL_META[result.reason] ?? {
                label: "Not verified",
                body: `The verification service returned ${result.reason}.`,
                tone: "muted" as const,
              };
            const Icon =
              meta.tone === "stop"
                ? ShieldOff
                : meta.tone === "warn"
                ? ShieldAlert
                : FileQuestion;
            return (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={`mt-6 border-2 p-5 ${toneClass(meta.tone)}`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`w-5 h-5 mt-0.5 ${toneInk(meta.tone)}`} />
                  <div>
                    <div className="mono-label text-foreground/70 mb-1">
                      § {meta.label}
                    </div>
                    <h3
                      className={`display-serif text-xl leading-tight ${toneInk(
                        meta.tone
                      )}`}
                    >
                      {meta.label}
                    </h3>
                    <p className="text-sm text-foreground/80 mt-3 leading-relaxed">
                      {meta.body}
                    </p>
                    <p className="mono-label text-[0.65rem] text-foreground/50 mt-4">
                      Reason code: {result.reason}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })()}

          {result && result.verified && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className={`mt-6 border-2 p-5 md:p-6 ${toneClass(okTone)}`}
            >
              <div className="flex items-start gap-4">
                {okState === "superseded" ? (
                  <RotateCcw className={`w-6 h-6 mt-0.5 ${toneInk(okTone)}`} />
                ) : okState === "withdrawn" ? (
                  <ShieldOff className={`w-6 h-6 mt-0.5 ${toneInk(okTone)}`} />
                ) : (
                  <CheckCircle2
                    className={`w-6 h-6 mt-0.5 ${toneInk(okTone)}`}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="mono-label text-foreground/60 mb-1">
                    § Verified
                  </div>
                  <h3
                    className={`display-serif text-2xl md:text-3xl leading-tight ${toneInk(
                      okTone
                    )}`}
                  >
                    {result.participant_name || "Record on file"}
                  </h3>
                  <p className="text-sm text-foreground/75 mt-3">
                    This token corresponds to an issued Behavioral Evidence
                    Report the named participant has disclosed to a specific
                    reader. The record's state is authoritative through the
                    participant's own disclosure page.
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-4 border-t border-foreground/20 pt-4">
                    <div>
                      <div className="mono-label text-foreground/50">
                        Issued at
                      </div>
                      <div className="text-foreground text-[0.9375rem] mt-1">
                        {result.issued_at
                          ? new Date(result.issued_at).toLocaleDateString(
                              undefined,
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )
                          : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="mono-label text-foreground/50">State</div>
                      <div className="text-foreground text-[0.9375rem] mt-1 capitalize">
                        {okState ?? "issued"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t border-foreground/15 pt-4">
                <p className="mono-label text-[0.65rem] text-foreground/50">
                  Verification returns minimal facts — never the report body.
                </p>
              </div>
            </motion.div>
          )}

          <div className="mt-10 border-t border-foreground/20 pt-6">
            <h4 className="display-serif text-lg text-foreground mb-3">
              What this endpoint returns
            </h4>
            <div className="grid sm:grid-cols-2 gap-4 text-sm text-foreground/75">
              <div className="border-l-2 border-foreground/40 pl-3">
                <div className="mono-label text-foreground/60 mb-1">
                  § In scope
                </div>
                Whether the token points to a real, disclosed, still-active
                issuance; the participant's name as they registered it; the
                dimension it concerns; the date it was issued.
              </div>
              <div className="border-l-2 border-vermilion pl-3">
                <div className="mono-label ink-vermilion mb-1">
                  § Out of scope
                </div>
                The report body, dimension statements, statement wording,
                confidential concerns, correction history, or anything that
                could rank, compare, or predict.
              </div>
            </div>
            <p className="marginalia mt-6">
              A disclosed record names the participant; anyone relying on it
              should separately confirm the holder is that person. Verification
              does not attest to identity.
            </p>
            <div className="mt-8">
              <Link
                to="/"
                className="mono-label text-foreground/70 hover:text-foreground underline underline-offset-4"
              >
                ← Back to the front page
              </Link>
            </div>
          </div>
        </div>
      </LedgerSection>
    </PublicLayout>
  );
}
