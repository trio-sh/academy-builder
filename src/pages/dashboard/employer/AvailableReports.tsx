/**
 * Available Reports (CORR-007 CR-09, BOSD Book 2 Section 2.17).
 *
 * The reports a participant has made available to approved employers, listed by the name the participant stated. The surface takes a page and
 * nothing else: there is no search, sort, filter, rank or count by dimension, Stage, evidence state or observed conduct, and the database
 * refuses any other parameter. The order is the order the participants turned it on; it carries no meaning. Reading is a separate step and
 * is recorded for the participant.
 */
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { DashboardPageHeader, DashSection, LedgerLoading } from "@/components/dashboard/primitives";
import { Button } from "@/components/ui/button";

interface Item { ber_report_id: string; stated_name: string | null }
interface Listing { outcome?: string; reason?: string; refusal_code?: string; page?: number; page_size?: number; items?: Item[] }

const PAGE_SIZE = 25;

const AvailableReports = () => {
  const [page, setPage] = useState(1);
  const [listing, setListing] = useState<Listing | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setListing(null);
    const { data, error } = await supabase.rpc("t3a_available_reports_list", { p_params: { page, page_size: PAGE_SIZE } });
    if (error) { setFailed(true); return; }
    setFailed(false);
    setListing((data as Listing) ?? {});
  }, [page]);

  useEffect(() => { void load(); }, [load]);

  const items = listing?.items ?? [];
  const refused = listing && listing.outcome !== "listed";

  return (
    <div>
      <DashboardPageHeader eyebrow="Employer Desk" title="Available Reports" />
      <DashSection title="Reports made available to approved employers">
        <p className="text-sm text-foreground/70 mb-4 max-w-2xl" data-testid="ar-note">
          Each participant chose to make the full report available. The list has no search, sort or filter. It does not rank anyone, and the order carries no meaning.
        </p>
        {failed ? <p role="alert">The list could not be loaded. Please try again.</p>
          : !listing ? <LedgerLoading />
          : refused ? <p role="status" data-testid="ar-refused">The list is not available to this organization yet. It opens when The 3rd Academy has approved the organization.</p>
          : items.length === 0 ? <p role="status" data-testid="ar-empty">No reports are available yet.</p>
          : (
            <ul className="space-y-3" data-testid="ar-list">
              {items.map((it) => (
                <li key={it.ber_report_id} className="flex items-center gap-4 border-b border-foreground/15 py-3" data-testid="ar-item">
                  <span className="flex-1">{it.stated_name ?? "Name not stated"}</span>
                  <Link to={`/dashboard/employer/report/${it.ber_report_id}`}><Button variant="outline">Read report</Button></Link>
                </li>
              ))}
            </ul>
          )}
        <div className="flex gap-3 mt-6">
          <Button variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
          <Button variant="ghost" disabled={items.length < PAGE_SIZE} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </DashSection>
    </div>
  );
};

export default AvailableReports;
