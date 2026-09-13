/**
 * T3X Discovery — T3A-DEV-CN-EMP-001 Item 9A.
 *
 * The route remains and renders a coverage disclosure. Every legacy
 * query endpoint, query parameter and query action behind the former
 * page is retired and refuses server-side. The page survives; the query
 * capability does not.
 *
 * This page takes no employer input and offers no query, filter,
 * segmentation, search or data-manipulation control. It does not
 * redirect to Available Reports: a redirect would present a rejected
 * operating model as a rename.
 *
 * No withdrawal figure is rendered under any condition. On a small pool
 * a single withdrawal reported promptly can identify the participant to
 * an employer who read the pool the day before, and no controlled
 * aggregation period or suppression floor is set. None is chosen here.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  DashboardPageHeader,
  DashSection,
  LedgerLoading,
} from "@/components/dashboard/primitives";
import { Button } from "@/components/ui/button";
import {
  controlledText,
  reportMissingControlledText,
} from "@/lib/employerDeskText";
import { readCoverageDisclosure, type CoverageDisclosure } from "@/lib/employerDesk";

const T3XDiscovery = () => {
  const [coverage, setCoverage] = useState<CoverageDisclosure | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const block1 = controlledText("L-EMP-DISC-001");
  const block2 = controlledText("L-EMP-DISC-002");

  useEffect(() => {
    const load = async () => {
      setCoverage(await readCoverageDisclosure());
      setIsLoading(false);
    };
    void load();
  }, []);

  if (!block1 || !block2) {
    reportMissingControlledText("L-EMP-DISC-001");
    return null;
  }

  if (isLoading) return <LedgerLoading />;

  const gated = coverage && !coverage.available;

  return (
    <div>
      <DashboardPageHeader
        eyebrow="§ Coverage"
        title={block1[0]}
        meta={block1[1]}
      />

      {gated ? (
        <DashSection eyebrow="§ Access" title="Coverage is shown to approved employers">
          <p className="text-foreground/75 max-w-2xl leading-relaxed">
            Coverage figures become readable once The 3rd Academy has recorded an
            approval for your organization.
          </p>
        </DashSection>
      ) : (
        <>
          {/* Block 1 — plain figures. The real numbers, whatever they are. */}
          <DashSection eyebrow="§ I · Currently available" title="What the environment covers">
            {coverage?.figuresAvailable ? (
              <dl className="grid gap-8 md:grid-cols-3 border-t-2 border-foreground pt-7">
                <div>
                  <dt className="mono-label text-foreground/55 mb-2">
                    Reports currently available
                  </dt>
                  <dd className="ledger-num text-4xl text-foreground">
                    {coverage.reportsAvailable}
                  </dd>
                </div>
                <div>
                  <dt className="mono-label text-foreground/55 mb-2">
                    Behavioral areas currently in service
                  </dt>
                  <dd className="text-foreground text-lg leading-snug">
                    {coverage.areasInService.length > 0
                      ? coverage.areasInService.join(", ")
                      : "None in service"}
                  </dd>
                </div>
                <div>
                  <dt className="mono-label text-foreground/55 mb-2">Last updated</dt>
                  <dd className="text-foreground text-lg">
                    {coverage.lastUpdated
                      ? new Date(coverage.lastUpdated).toLocaleDateString()
                      : "Not recorded"}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-foreground/75 max-w-2xl leading-relaxed border-t-2 border-foreground pt-7">
                These figures are not available at the moment. Nothing here is
                estimated.
              </p>
            )}
          </DashSection>

          {/* Block 2 — controlled text, both lines. */}
          <DashSection eyebrow="§ II · How availability works" title="Participants decide">
            <div className="border-l-2 border-foreground pl-8 max-w-3xl space-y-5">
              {block2.map((line) => (
                <p key={line} className="text-foreground/85 text-lg leading-relaxed">
                  {line}
                </p>
              ))}
            </div>
          </DashSection>

          {/* Block 3 — snapshot to snapshot, never visit to visit, and
              carrying no withdrawal figure of any kind. */}
          {coverage?.changeBlockAvailable && (
            <DashSection eyebrow="§ III · Since the previous update" title="What has changed">
              <ul className="border-t-2 border-foreground divide-y divide-foreground/20">
                <li className="py-5 flex justify-between gap-6">
                  <span className="text-foreground/80">Reports that became available</span>
                  <span className="ledger-num text-xl text-foreground">
                    {coverage.reportsBecameAvailable ?? 0}
                  </span>
                </li>
                <li className="py-5 flex justify-between gap-6">
                  <span className="text-foreground/80">
                    A behavioral area entered service
                  </span>
                  <span className="ledger-num text-xl text-foreground">
                    {coverage.areaEnteredService ? "Yes" : "No"}
                  </span>
                </li>
              </ul>
            </DashSection>
          )}

          {/* Item 9A step 5.10 — a single navigation control at the end.
              It is a navigation control, not a data control. */}
          <div className="mt-12 border-t-2 border-foreground pt-8">
            <Link to="/dashboard/employer/reports">
              <Button variant="outline">View Available Reports</Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
};

export default T3XDiscovery;
