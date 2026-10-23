/**
 * CORR-007 CR-09: the participant's two release controls for an issued report, side by side.
 *
 *  - General availability (approved employers can read it): turning it on shows the employer warning of the consent notice (paragraph 2.11) and
 *    sends the notice version that was shown. Nothing is turned on without it.
 *  - Direct release (one named person, one report version, time limited): the link is shown once.
 *
 * The two are independent and the page says so. Every rule is enforced in the database; this page only asks and reports.
 */
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";

interface DirectRelease { direct_release_id: string; recipient_name: string; recipient_org: string | null; expires_at: string; revoked: boolean }
interface ReleaseState { outcome: string; general_availability_on?: boolean; direct_releases?: DirectRelease[]; independence_statement?: string; reason?: string }
interface AccessRow { route: string; read_at: string; report_version: number; reader: string | null }
interface Notice { rendered?: boolean; text?: string; notice_version?: string }

/** The paragraph of the notice that carries the employer warning: 2.11, up to the next numbered paragraph or heading. */
export function employerWarning(text: string | undefined): string | null {
  if (!text) return null;
  const m = text.match(/2\.11\.[\s\S]*?(?=\n\n2\.1[2-9]\.|\n###|$)/);
  return m ? m[0].trim() : null;
}

export default function ReleaseControls() {
  const { berReportId } = useParams<{ berReportId: string }>();
  const [state, setState] = useState<ReleaseState | null>(null);
  const [access, setAccess] = useState<AccessRow[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [warningOpen, setWarningOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", org: "", address: "", expires: "" });

  const load = useCallback(async () => {
    if (!berReportId) return;
    const [s, a, n] = await Promise.all([
      supabase.rpc("t3a_release_state", { p_ber_report_id: berReportId }),
      supabase.rpc("t3a_release_access_record", { p_ber_report_id: berReportId }),
      supabase.rpc("t3a_consent_notice"),
    ]);
    setState((s.data as ReleaseState) ?? null);
    setAccess(((a.data as AccessRow[]) ?? []));
    setNotice((n.data as Notice) ?? null);
  }, [berReportId]);

  useEffect(() => { void load(); }, [load]);

  if (!berReportId) return null;
  if (!state) return <p role="status">Loading…</p>;
  if (state.outcome !== "state") return <p role="alert">This report's release controls are not available to you.</p>;

  const warning = notice?.rendered ? employerWarning(notice.text) : null;
  const refused = (d: unknown) => (d as { outcome?: string; reason?: string; refusal_code?: string } | null);

  const gaOff = async () => {
    setBusy(true);
    const { data } = await supabase.rpc("t3a_ga_set", { p_ber_report_id: berReportId, p_on: false });
    setBusy(false);
    setMessage(refused(data)?.outcome === "refused" ? "Could not turn it off. Please try again." : "General availability is off. Direct releases are not affected.");
    await load();
  };
  const gaOn = async () => {
    if (!notice?.notice_version) return;
    setBusy(true);
    const { data } = await supabase.rpc("t3a_ga_set", { p_ber_report_id: berReportId, p_on: true, p_warning_version: notice.notice_version });
    setBusy(false);
    setWarningOpen(false);
    setMessage(refused(data)?.outcome === "refused" ? "General availability was not turned on." : "General availability is on. Direct releases are not affected.");
    await load();
  };
  const createDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data } = await supabase.rpc("t3a_direct_release_create", {
      p_ber_report_id: berReportId, p_recipient_name: form.name, p_recipient_org: form.org || null, p_recipient_address: form.address,
      p_expires_at: new Date(form.expires).toISOString(),
    });
    setBusy(false);
    const d = data as { outcome?: string; token?: string } | null;
    if (d?.outcome === "released" && d.token) {
      setLink(`${window.location.origin}/report?code=${d.token}`);
      setMessage("Sent. The link is shown once below.");
      setForm({ name: "", org: "", address: "", expires: "" });
    } else setMessage("The release was not created. Check the name, address and date.");
    await load();
  };
  const revoke = async (id: string) => {
    setBusy(true);
    await supabase.rpc("t3a_direct_release_revoke", { p_direct_release_id: id });
    setBusy(false);
    setMessage("That release is ended. General availability is not affected.");
    await load();
  };

  return (
    <div className="space-y-6 max-w-2xl" data-testid="release-controls">
      <h1 className="text-xl font-semibold">Who can read your report</h1>
      {state.independence_statement ? <p className="text-sm" data-testid="independence">{state.independence_statement}</p> : null}
      {message ? <p role="status" className="text-sm">{message}</p> : null}

      <section className="rounded-md border p-4 space-y-3" data-testid="ga-control">
        <h2 className="font-medium">Make it available to approved employers</h2>
        <p className="text-sm" data-testid="ga-state">{state.general_availability_on ? "On" : "Off"}</p>
        {state.general_availability_on ? (
          <button type="button" className="rounded border px-4 py-2 text-sm" disabled={busy} onClick={gaOff}>Turn off</button>
        ) : warningOpen ? (
          <div className="space-y-3" data-testid="ga-warning">
            {(warning ?? "").split("\n").filter(Boolean).map((l, i) => (<p key={i} className="text-sm">{l.replace(/\*\*/g, "")}</p>))}
            <div className="flex gap-2">
              <button type="button" className="rounded border px-4 py-2 text-sm" disabled={busy} onClick={gaOn}>I understand, turn on</button>
              <button type="button" className="rounded border px-4 py-2 text-sm" onClick={() => setWarningOpen(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button type="button" className="rounded border px-4 py-2 text-sm" disabled={busy || !warning} onClick={() => setWarningOpen(true)}>Turn on</button>
        )}
      </section>

      <section className="rounded-md border p-4 space-y-3" data-testid="direct-control">
        <h2 className="font-medium">Send it to a particular person</h2>
        <form onSubmit={createDirect} className="space-y-2">
          <label className="block text-sm">Name<input required className="block w-full border rounded px-2 py-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label className="block text-sm">Organisation (optional)<input className="block w-full border rounded px-2 py-1" value={form.org} onChange={(e) => setForm({ ...form, org: e.target.value })} /></label>
          <label className="block text-sm">Email address<input required type="email" className="block w-full border rounded px-2 py-1" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
          <label className="block text-sm">Link works until<input required type="date" className="block w-full border rounded px-2 py-1" value={form.expires} onChange={(e) => setForm({ ...form, expires: e.target.value })} /></label>
          <button type="submit" className="rounded border px-4 py-2 text-sm" disabled={busy}>Send</button>
        </form>
        {link ? <p className="text-sm break-all" data-testid="release-link">{link}</p> : null}
        <ul className="space-y-1" data-testid="direct-list">
          {(state.direct_releases ?? []).map((d) => (
            <li key={d.direct_release_id} className="text-sm flex items-center gap-2">
              <span>{d.recipient_name}{d.recipient_org ? `, ${d.recipient_org}` : ""} until {d.expires_at.slice(0, 10)}{d.revoked ? " (ended)" : ""}</span>
              {d.revoked ? null : <button type="button" className="rounded border px-2 py-1 text-xs" disabled={busy} onClick={() => revoke(d.direct_release_id)}>End</button>}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-md border p-4 space-y-2" data-testid="access-record">
        <h2 className="font-medium">Who has read it</h2>
        {access.length === 0 ? <p className="text-sm">Nobody has read it yet.</p> : (
          <ul className="space-y-1">{access.map((a, i) => (<li key={i} className="text-sm">{a.reader ?? "A reader"}, version {a.report_version}, {a.read_at.slice(0, 10)}</li>))}</ul>
        )}
      </section>
    </div>
  );
}
