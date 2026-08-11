import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle, ShieldAlert, ShieldOff, Clock, RotateCcw, FileQuestion, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { LedgerHero, LedgerSection } from "@/components/ledger";
import { Button } from "@/components/ui/button";
import { todayStamp } from "@/lib/dateStamp";

/**
 * Public, unauthenticated verification surface — T3A-DEV-SPEC-002 §13 verifyReport.
 *
 * Calls t3a_verify_report(uuid) via the anon key.  Renders STATUS ONLY;
 * never any BER content, participant identity, or recipient identity.
 * The status vocabulary matches the spec's verify contract (§9.6):
 *   current | superseded | withdrawn | expired | under_challenge |
 *   evidence_expired | not_current | not_found.
 *
 * No account required (per §3 verification service row).
 */

type VerifyResponse = {
  verified: boolean;
  reason?: string;
  status?: string;
  current_until?: string | null;
  notice?: string;
};

const STATUS_META: Record<
  string,
  { label: string; icon: typeof CheckCircle2; tone: "ok" | "warn" | "muted" | "stop"; body: string }
> = {
  current: {
    label: "Current record",
    icon: CheckCircle2,
    tone: "ok",
    body: "This record has been issued, is within its stated evidence-currency period, and no open challenge is affecting it.",
  },
  superseded: {
    label: "Superseded",
    icon: RotateCcw,
    tone: "muted",
    body: "A newer version of this record has been issued. The current version is authoritative; earlier versions remain in the full record and are never deleted.",
  },
  withdrawn: {
    label: "Withdrawn",
    icon: ShieldOff,
    tone: "stop",
    body: "The record has been withdrawn. Do not rely on it as current evidence.",
  },
  expired: {
    label: "Expired",
    icon: Clock,
    tone: "muted",
    body: "The record is past its stated currency period. The observations it names still occurred; they are now historical.",
  },
  under_challenge: {
    label: "Under challenge",
    icon: ShieldAlert,
    tone: "warn",
    body: "The participant has opened a challenge against one or more statements in this record. A discoverability badge is not affected while a challenge is open.",
  },
  evidence_expired: {
    label: "Evidence expired",
    icon: Clock,
    tone: "stop",
    body: "The underlying observation evidence has been destroyed under the retention program. The record can no longer be substantiated from source.",
  },
  not_current: {
    label: "Not current",
    icon: FileQuestion,
    tone: "muted",
    body: "The record exists but is not currently in the issued state.",
  },
};

function toneClass(tone: "ok" | "warn" | "muted" | "stop") {
  switch (tone) {
    case "ok":    return "border-foreground bg-foreground/[0.04]";
    case "warn":  return "border-vermilion bg-vermilion/[0.06]";
    case "stop":  return "border-vermilion bg-vermilion/10";
    case "muted": return "border-foreground/40 bg-foreground/[0.02]";
  }
}
function toneInk(tone: "ok" | "warn" | "muted" | "stop") {
  switch (tone) {
    case "ok":    return "text-foreground";
    case "warn":  return "ink-vermilion";
    case "stop":  return "ink-vermilion";
    case "muted": return "text-foreground/70";
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function VerifyBER() {
  const { id: routeId } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get("id") ?? "";

  const [input, setInput] = useState<string>(routeId ?? queryId ?? "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verify = async (id: string) => {
    const trimmed = id.trim();
    if (!trimmed) return;
    if (!UUID_RE.test(trimmed)) {
      setError("Enter a valid record identifier — the id from the verification block on the report.");
      setResult(null);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { data, error: rpcErr } = await supabase.rpc("t3a_verify_report", { p_ber_report_id: trimmed });
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

  // Auto-verify when the route/query already carries an id.
  useEffect(() => {
    const initial = (routeId || queryId || "").trim();
    if (initial && UUID_RE.test(initial)) void verify(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId, queryId]);

  const meta = result?.verified && result.status ? STATUS_META[result.status] : null;

  return (
    <PublicLayout>
      <LedgerHero
        eyebrow="§ Verification"
        meta="Public register — no account required"
        stamp={todayStamp()}
        title={
          <>
            <span className="block">Confirm a</span>
            <span className="block italic display-serif-italic">Behavioral Evidence</span>
            <span className="block">
              Report. <span className="ink-vermilion">Status only.</span>
            </span>
          </>
        }
        lede={
          <>
            Enter the record identifier from the report's verification block. We
            return status — never content, never identity, never the identity of
            the recipient who reads it. Verification is anonymous by design.
          </>
        }
      >
        <div className="mono-label text-foreground/60">
          Endpoint: <span className="text-foreground">t3a_verify_report</span> · unauthenticated
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
              § Record identifier
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="00000000-0000-0000-0000-000000000000"
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
                  <>Verify record</>
                )}
              </Button>
            </div>
            <p className="marginalia text-[0.75rem] mt-3">
              This form does not create an account, cookie or profile. Nothing about the record's holder is disclosed.
            </p>
          </form>

          {error && (
            <div className="mt-6 border-2 border-vermilion bg-vermilion/[0.06] p-4">
              <div className="mono-label ink-vermilion mb-1">§ Verification error</div>
              <p className="text-sm text-foreground">{error}</p>
            </div>
          )}

          {result && !result.verified && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="mt-6 border-2 border-foreground/40 bg-foreground/[0.02] p-5"
            >
              <div className="flex items-start gap-3">
                <FileQuestion className="w-5 h-5 text-foreground/60 mt-0.5" />
                <div>
                  <div className="mono-label text-foreground/70 mb-1">§ No record</div>
                  <h3 className="display-serif text-xl leading-tight text-foreground">
                    No record with that identifier exists in the register.
                  </h3>
                  <p className="text-sm text-foreground/70 mt-2">
                    Check the identifier you copied from the verification block. The
                    identifier is a full UUID including its four hyphens.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {result && result.verified && meta && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className={`mt-6 border-2 p-5 md:p-6 ${toneClass(meta.tone)}`}
            >
              <div className="flex items-start gap-4">
                <meta.icon className={`w-6 h-6 mt-0.5 ${toneInk(meta.tone)}`} />
                <div className="flex-1 min-w-0">
                  <div className="mono-label text-foreground/60 mb-1">§ Status</div>
                  <h3 className={`display-serif text-2xl md:text-3xl leading-tight ${toneInk(meta.tone)}`}>
                    {meta.label}
                  </h3>
                  <p className="text-sm text-foreground/80 mt-3 leading-relaxed">{meta.body}</p>

                  <div className="mt-5 grid grid-cols-2 gap-4 border-t border-foreground/20 pt-4">
                    <div>
                      <div className="mono-label text-foreground/50">Current until</div>
                      <div className="text-foreground text-[0.9375rem] mt-1">
                        {result.current_until
                          ? new Date(result.current_until).toLocaleDateString(undefined, {
                              year: "numeric", month: "long", day: "numeric",
                            })
                          : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="mono-label text-foreground/50">Verified at</div>
                      <div className="text-foreground text-[0.9375rem] mt-1">{todayStamp()}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t border-foreground/15 pt-4">
                <p className="mono-label text-[0.65rem] text-foreground/50">
                  {result.notice ?? "Verification returns status only, never content."}
                </p>
              </div>
            </motion.div>
          )}

          <div className="mt-10 border-t border-foreground/20 pt-6">
            <h4 className="display-serif text-lg text-foreground mb-3">What the register can tell you</h4>
            <div className="grid sm:grid-cols-2 gap-4 text-sm text-foreground/75">
              <div className="border-l-2 border-foreground/40 pl-3">
                <div className="mono-label text-foreground/60 mb-1">§ In scope</div>
                Whether a record exists, whether it is current, superseded, withdrawn, expired, or under challenge; the date its evidence-currency period ends.
              </div>
              <div className="border-l-2 border-vermilion pl-3">
                <div className="mono-label ink-vermilion mb-1">§ Out of scope</div>
                Report content, dimension statements, participant identity, recipient identity, or anything that could rank, compare, or predict.
              </div>
            </div>
            <p className="marginalia mt-6">
              An issued record names the person it concerns; anyone relying on it should
              separately confirm the holder is that person. Verification does not attest
              to identity.
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
