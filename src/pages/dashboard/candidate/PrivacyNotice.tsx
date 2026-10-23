/**
 * The Participant Consent and Privacy Notice (T3A-LEG-001 Part A), shown word for word from the version loaded in the database, with its version.
 * If the notice is not loaded nothing is shown in its place. The notice uses ### headings, numbered paragraphs and **bold**; this page draws exactly those and adds nothing.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Notice { rendered?: boolean; reason?: string; notice_version?: string; text?: string }

function Inline({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>))}</>;
}

export default function PrivacyNotice() {
  const [notice, setNotice] = useState<Notice | null | "error">(null);
  useEffect(() => {
    let live = true;
    void supabase.rpc("t3a_consent_notice").then(({ data, error }) => { if (live) setNotice(error ? "error" : ((data as Notice) ?? {})); });
    return () => { live = false; };
  }, []);

  if (notice === null) return <p role="status">Loading…</p>;
  if (notice === "error") return <p role="alert">The notice could not be loaded. Please try again.</p>;
  if (!notice.rendered || !notice.text) return <p role="status" data-testid="notice-unavailable">The notice is not available right now.</p>;

  const blocks = notice.text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <article className="space-y-4 max-w-2xl" data-testid="privacy-notice">
      <h1 className="text-xl font-semibold">Participant Consent and Privacy Notice</h1>
      <p className="text-sm" data-testid="notice-version">Version {notice.notice_version}</p>
      {blocks.map((b, i) => b.startsWith("### ")
        ? <h2 key={i} className="text-lg font-medium pt-2">{b.slice(4)}</h2>
        : <p key={i} className="leading-relaxed whitespace-pre-line"><Inline text={b} /></p>)}
    </article>
  );
}
