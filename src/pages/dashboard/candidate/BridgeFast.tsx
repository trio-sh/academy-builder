import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Clock, Loader2, Play, ShoppingBag } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { INTERACTIVE_MODULES } from "@/data/interactiveTrainingModules";
import { WORKPLACE_MOMENTS, FOCUSED_PRODUCTS } from "@/data/workplaceMoments";

/**
 * BridgeFast · Post-Launch 04 Notes 3 & 4.
 *
 * The full BridgeFast surface: landing (hero + two entry cards +
 * Continue-where-you-left-off), Free Practice with the ten migrated
 * modules, WorkRehearsal with the twenty Workplace Moments shelf,
 * moment detail, focused-product detail, and Your Rehearsals.
 *
 * Nothing here surfaces a score, a points figure, a difficulty label,
 * a coverage count, a completion meter or any dimension name. Commerce
 * is deferred per Section D — Buy controls acknowledge the click and
 * report that purchasing is not yet configured, without inventing
 * prices or wiring a checkout.
 */

// ---------------------------------------------------------------------------
// Shared frame primitives
// ---------------------------------------------------------------------------

function BridgeFastFrame({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <div>
        <div className="mono-label text-foreground/60 mb-3">§ {eyebrow}</div>
        <h1 className="display-serif text-3xl md:text-4xl text-foreground leading-tight">
          {title}
        </h1>
        {lede && (
          <p className="text-foreground/70 mt-3 max-w-2xl leading-relaxed">
            {lede}
          </p>
        )}
      </div>
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Types + hooks shared across sub-pages
// ---------------------------------------------------------------------------

type StartedItem =
  | {
      kind: "free_practice";
      title: string;
      href: string;
      resumeLabel: string;
      updatedAt: string;
    }
  | {
      kind: "work_rehearsal";
      title: string;
      href: string;
      resumeLabel: string;
      updatedAt: string;
    };

/**
 * Reads whatever the participant has started. Today only Free Practice
 * has real progress in the growth_log_entries table; WorkRehearsal
 * ownership is deferred with Section D commerce. When ownership
 * lands, extend this to read from t3a_wr_entitlement + progress.
 */
function useStartedItems() {
  const { user } = useAuth();
  const [items, setItems] = useState<StartedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.id) {
        if (!cancelled) setLoading(false);
        return;
      }
      const out: StartedItem[] = [];
      const { data: logs } = await supabase
        .from("growth_log_entries")
        .select("*")
        .eq("candidate_id", user.id)
        .eq("event_type", "training")
        .order("created_at", { ascending: false })
        .limit(20);

      const seenSlugs = new Set<string>();
      (logs ?? []).forEach((log) => {
        const m = (log.metadata as { module_slug?: string } | null) ?? {};
        const slug = m.module_slug;
        if (!slug || seenSlugs.has(slug)) return;
        seenSlugs.add(slug);
        const mod = INTERACTIVE_MODULES.find((im) => im.slug === slug);
        if (!mod) return;
        out.push({
          kind: "free_practice",
          title: mod.title,
          href: `/dashboard/candidate/training/module/${mod.slug}`,
          resumeLabel: "Resume practice",
          updatedAt: log.created_at,
        });
      });

      if (!cancelled) {
        setItems(out);
        setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return { items, loading };
}

// ---------------------------------------------------------------------------
// Landing
// ---------------------------------------------------------------------------

export function BridgeFastLanding() {
  const { items, loading } = useStartedItems();
  return (
    <BridgeFastFrame
      eyebrow="Preparation · Self-directed"
      title="BridgeFast"
      lede="Your private preparation space. Practice here is separate from formal observation. Nothing you do in BridgeFast becomes evidence in your Behavioral Evidence Report."
    >
      {/* Two entry cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <EntryCard
          to="/dashboard/candidate/training/free-practice"
          eyebrow="Entry 1"
          title="Free Practice"
          body="Practice workplace situations at no cost."
          cta="Enter Free Practice"
        />
        <EntryCard
          to="/dashboard/candidate/training/workrehearsal"
          eyebrow="Entry 2"
          title="WorkRehearsal"
          body={
            <>
              Private rehearsal for consequential workplace moments. Buy one
              rehearsal when that is what you need, or choose a focused
              product for a larger workplace need.
              <span className="block mt-2 text-xs text-foreground/60">
                Paid · No score · No pass or fail · Private by design
              </span>
            </>
          }
          cta="Enter WorkRehearsal"
        />
      </div>

      {/* Continue where you left off — hidden entirely when empty */}
      {loading ? (
        <div className="text-foreground/60 text-sm flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Checking your desk…
        </div>
      ) : items.length > 0 ? (
        <div className="border-t border-foreground/20 pt-8">
          <h2 className="display-serif text-2xl text-foreground mb-4">
            Continue where you left off
          </h2>
          <ul className="space-y-3">
            {items.map((it) => (
              <li
                key={it.href}
                className="flex items-center justify-between p-4 bg-background border border-foreground/25 rounded-none"
              >
                <div>
                  <div className="mono-label text-foreground/60 mb-1">
                    § {it.kind === "free_practice" ? "Free Practice" : "WorkRehearsal"}
                  </div>
                  <div className="text-foreground font-medium">{it.title}</div>
                </div>
                <Link to={it.href}>
                  <Button className="rounded-none bg-foreground text-background hover:bg-foreground/90">
                    {it.resumeLabel}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </BridgeFastFrame>
  );
}

function EntryCard({
  to,
  eyebrow,
  title,
  body,
  cta,
}: {
  to: string;
  eyebrow: string;
  title: string;
  body: React.ReactNode;
  cta: string;
}) {
  return (
    <Link
      to={to}
      className="block bg-background border-2 border-foreground p-6 hover:shadow-[3px_3px_0_rgba(29,24,21,0.10)] transition-shadow"
    >
      <div className="mono-label text-foreground/60 mb-3">§ {eyebrow}</div>
      <h3 className="display-serif text-2xl text-foreground mb-2">{title}</h3>
      <div className="text-foreground/80 text-sm leading-relaxed">{body}</div>
      <div className="mt-5 mono-label text-foreground">
        {cta} <ArrowRight className="inline w-4 h-4 ml-1" />
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Free Practice — 10 modules migrated, no scores/points/difficulty
// ---------------------------------------------------------------------------

export function FreePractice() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [completedSlugs, setCompletedSlugs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.id) {
        if (!cancelled) setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("growth_log_entries")
        .select("metadata")
        .eq("candidate_id", user.id)
        .eq("event_type", "training");
      const set = new Set<string>();
      (data ?? []).forEach((r) => {
        const m = (r.metadata as { module_slug?: string } | null) ?? {};
        if (m.module_slug) set.add(m.module_slug);
      });
      if (!cancelled) {
        setCompletedSlugs(set);
        setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <BridgeFastFrame
      eyebrow="BridgeFast · Free Practice"
      title="Practice workplace situations at no cost."
      lede="Every free practice below is repeatable. Completed practices remain accessible indefinitely — repetition is the point of rehearsal."
    >
      <div className="mono-label text-foreground/60">
        {loading ? "Loading…" : `${INTERACTIVE_MODULES.length} practices available.`}
      </div>
      <ul className="space-y-4">
        {INTERACTIVE_MODULES.map((m) => {
          const done = completedSlugs.has(m.slug);
          return (
            <li
              key={m.id}
              className="bg-background border border-foreground/25 p-5 hover:border-foreground transition-colors cursor-pointer"
              onClick={() =>
                navigate(`/dashboard/candidate/training/module/${m.slug}`)
              }
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mono-label text-foreground/60 mb-1">
                    § Free
                  </div>
                  <h3 className="display-serif text-xl text-foreground leading-snug">
                    {m.title}
                  </h3>
                  <p className="text-foreground/75 text-sm mt-2 line-clamp-2">
                    {m.description}
                  </p>
                  <div className="mt-3 flex items-center gap-4 text-xs text-foreground/60">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {m.duration}
                    </span>
                  </div>
                </div>
                <div className="shrink-0">
                  <Button className="rounded-none bg-foreground text-background hover:bg-foreground/90">
                    <Play className="w-4 h-4 mr-2" />
                    {done ? "Practice again" : "Start Practice"}
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </BridgeFastFrame>
  );
}

// ---------------------------------------------------------------------------
// WorkRehearsal shelf — 20 Workplace Moments + Focused Rehearsal Products
// ---------------------------------------------------------------------------

type SortKey = "recommended" | "shortest" | "lowest_price" | "recently_added";

export function WorkRehearsalShelf() {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recommended");

  const filteredMoments = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? WORKPLACE_MOMENTS.filter(
          (m) =>
            m.title.toLowerCase().includes(q) ||
            (m.situationDescription ?? "").toLowerCase().includes(q)
        )
      : WORKPLACE_MOMENTS.slice();

    switch (sort) {
      case "shortest":
        return list.sort(
          (a, b) =>
            (a.approximateDurationMinutes ?? Infinity) -
            (b.approximateDurationMinutes ?? Infinity)
        );
      case "recently_added":
        return list.slice().reverse();
      // "recommended" and "lowest_price" fall through to shelf order
      // until T3A supplies the recommendation signal or prices.
      default:
        return list;
    }
  }, [query, sort]);

  return (
    <BridgeFastFrame
      eyebrow="BridgeFast · WorkRehearsal"
      title="Workplace Moments"
      lede="Start with the situation you are facing. Every rehearsal is bought individually and can be worked in any order."
    >
      <div className="flex gap-4 flex-col md:flex-row items-start md:items-center">
        <input
          type="search"
          placeholder="Search workplace moments"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-background border border-foreground/40 focus:border-foreground outline-none px-3 py-2 text-sm text-foreground rounded-none"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="bg-background border border-foreground/40 px-3 py-2 text-sm rounded-none"
        >
          <option value="recommended">Recommended</option>
          <option value="shortest">Shortest</option>
          <option value="lowest_price">Lowest price</option>
          <option value="recently_added">Recently added</option>
        </select>
        <Link to="/dashboard/candidate/training/workrehearsal/your-rehearsals">
          <Button
            variant="outline"
            className="rounded-none border-2 border-foreground text-foreground hover:bg-foreground/[0.05]"
          >
            Your Rehearsals
          </Button>
        </Link>
      </div>

      <ul className="grid md:grid-cols-2 gap-4">
        {filteredMoments.map((m) => (
          <li key={m.slug}>
            <Link
              to={`/dashboard/candidate/training/workrehearsal/moments/${m.slug}`}
              className="block bg-background border border-foreground/25 p-5 hover:border-foreground transition-colors h-full"
            >
              <div className="mono-label text-foreground/60 mb-2">
                § Moment {String(m.index).padStart(2, "0")}
              </div>
              <h3 className="display-serif text-lg text-foreground leading-snug">
                {m.title}
              </h3>
              {m.situationDescription ? (
                <p className="text-foreground/75 text-sm mt-2 line-clamp-2">
                  {m.situationDescription}
                </p>
              ) : (
                <p className="text-foreground/50 text-sm mt-2 italic">
                  Description supplied by The 3rd Academy.
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>

      {/* Focused rehearsal products — a peer entry, not a taxonomy */}
      <div className="border-t border-foreground/20 pt-8">
        <h2 className="display-serif text-2xl text-foreground mb-2">
          Focused Rehearsal Products
        </h2>
        <p className="text-foreground/70 text-sm mb-4 max-w-2xl">
          Prepare for a defined workplace problem, transition or
          responsibility. Only products that exist and can be delivered
          appear here.
        </p>
        <ul className="grid md:grid-cols-2 gap-4">
          {FOCUSED_PRODUCTS.map((p) => (
            <li key={p.slug}>
              <Link
                to={`/dashboard/candidate/training/workrehearsal/products/${p.slug}`}
                className="block bg-background border border-foreground/25 p-5 hover:border-foreground transition-colors h-full"
              >
                <div className="mono-label text-foreground/60 mb-2">
                  § Product
                </div>
                <h3 className="display-serif text-xl text-foreground leading-snug">
                  {p.title}
                </h3>
                <p className="text-foreground/75 text-sm mt-2">{p.purpose}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </BridgeFastFrame>
  );
}

// ---------------------------------------------------------------------------
// Moment detail (pre-purchase)
// ---------------------------------------------------------------------------

export function MomentDetail() {
  const { momentSlug } = useParams<{ momentSlug: string }>();
  const moment = WORKPLACE_MOMENTS.find((m) => m.slug === momentSlug);
  if (!moment) {
    return (
      <BridgeFastFrame
        eyebrow="BridgeFast · WorkRehearsal"
        title="Rehearsal not found"
      >
        <Link
          to="/dashboard/candidate/training/workrehearsal"
          className="mono-label text-foreground underline"
        >
          ← Back to Workplace Moments
        </Link>
      </BridgeFastFrame>
    );
  }

  return (
    <BridgeFastFrame
      eyebrow={`Moment ${String(moment.index).padStart(2, "0")}`}
      title={moment.title}
      lede={
        moment.situationDescription ??
        "Situation description supplied by The 3rd Academy."
      }
    >
      <section className="bg-background border border-foreground/25 p-5 space-y-4">
        <div>
          <div className="mono-label text-foreground/60 mb-1">
            § What you will rehearse
          </div>
          <p className="text-foreground/85 text-sm leading-relaxed">
            A short private rehearsal of the situation described above.
            Plain-language responses — no dimension vocabulary, no coverage
            language, no score.
          </p>
        </div>
        <div>
          <div className="mono-label text-foreground/60 mb-1">§ How it works</div>
          <p className="text-foreground/85 text-sm leading-relaxed">
            Private workplace rehearsal ·{" "}
            {moment.approximateDurationMinutes
              ? `approximately ${moment.approximateDurationMinutes} minutes`
              : "duration to be confirmed"}{" "}
            · repeatable.
          </p>
        </div>
        <div className="border-t border-foreground/20 pt-4">
          <div className="mono-label text-foreground/60 mb-1">
            § Private by design
          </div>
          <ul className="text-foreground/85 text-sm space-y-1 list-disc pl-5">
            <li>No score.</li>
            <li>No pass or fail.</li>
            <li>
              Your responses do not become evidence in your Behavioral
              Evidence Report.
            </li>
          </ul>
        </div>
      </section>

      <section className="bg-background border-2 border-foreground p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="mono-label text-foreground/60">§ Price</div>
            <div className="text-foreground text-xl display-serif">
              Supplied by The 3rd Academy
            </div>
          </div>
          <Button
            className="rounded-none bg-foreground text-background hover:bg-foreground/90"
            onClick={() =>
              alert(
                "Purchasing is not yet configured. Enrollment will open once The 3rd Academy publishes prices and enables the payment flow."
              )
            }
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            Buy this rehearsal
          </Button>
        </div>
      </section>

      <Link
        to="/dashboard/candidate/training/workrehearsal"
        className="mono-label text-foreground/70 hover:text-foreground underline underline-offset-4 inline-block"
      >
        ← Back to Workplace Moments
      </Link>
    </BridgeFastFrame>
  );
}

// ---------------------------------------------------------------------------
// Focused product detail
// ---------------------------------------------------------------------------

export function FocusedProductDetail() {
  const { productSlug } = useParams<{ productSlug: string }>();
  const product = FOCUSED_PRODUCTS.find((p) => p.slug === productSlug);
  if (!product) {
    return (
      <BridgeFastFrame
        eyebrow="BridgeFast · WorkRehearsal"
        title="Product not found"
      >
        <Link
          to="/dashboard/candidate/training/workrehearsal"
          className="mono-label text-foreground underline"
        >
          ← Back to Workplace Moments
        </Link>
      </BridgeFastFrame>
    );
  }

  const includedMoments = product.includedMomentSlugs
    .map((slug) => WORKPLACE_MOMENTS.find((m) => m.slug === slug))
    .filter((x): x is (typeof WORKPLACE_MOMENTS)[number] => Boolean(x));

  return (
    <BridgeFastFrame
      eyebrow="Focused rehearsal product"
      title={product.title}
      lede={product.purpose}
    >
      {product.mappingProvisional && (
        <div className="text-xs text-foreground/60 border-l-2 border-foreground/40 pl-3 italic">
          Provisional mapping — confirmed with The 3rd Academy before shipping
          for sale.
        </div>
      )}

      <section>
        <h2 className="display-serif text-xl text-foreground mb-3">
          Rehearsals included
        </h2>
        {includedMoments.length > 0 ? (
          <ul className="space-y-2">
            {includedMoments.map((m) => (
              <li
                key={m.slug}
                className="flex items-center justify-between bg-background border border-foreground/25 p-3"
              >
                <div>
                  <div className="text-foreground font-medium">{m.title}</div>
                  <div className="mono-label text-foreground/60 text-xs">
                    § Moment {String(m.index).padStart(2, "0")}
                  </div>
                </div>
                <Link
                  to={`/dashboard/candidate/training/workrehearsal/moments/${m.slug}`}
                  className="mono-label text-foreground/70 hover:text-foreground underline underline-offset-4 text-xs"
                >
                  View →
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-foreground/60 text-sm italic">
            Moment-led titles for this product are supplied by The 3rd Academy
            and appear here once they land.
          </p>
        )}
      </section>

      <section className="bg-background border-2 border-foreground p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="mono-label text-foreground/60">§ Bundle price</div>
            <div className="text-foreground text-xl display-serif">
              Supplied by The 3rd Academy
            </div>
            <p className="text-xs text-foreground/60 mt-1 max-w-md">
              The bundle price will always be below the sum of its individual
              rehearsals.
            </p>
          </div>
          <Button
            className="rounded-none bg-foreground text-background hover:bg-foreground/90"
            onClick={() =>
              alert(
                "Purchasing is not yet configured. Bundle enrollment will open once The 3rd Academy publishes prices and enables the payment flow."
              )
            }
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            Buy this bundle
          </Button>
        </div>
      </section>

      <Link
        to="/dashboard/candidate/training/workrehearsal"
        className="mono-label text-foreground/70 hover:text-foreground underline underline-offset-4 inline-block"
      >
        ← Back to WorkRehearsal
      </Link>
    </BridgeFastFrame>
  );
}

// ---------------------------------------------------------------------------
// Your Rehearsals — ownership view (empty until commerce lands)
// ---------------------------------------------------------------------------

export function YourRehearsals() {
  return (
    <BridgeFastFrame
      eyebrow="BridgeFast · WorkRehearsal"
      title="Your Rehearsals"
      lede="What you own — Continue, Ready to Start, and Completed. Nothing here shows a total, a proportion or any coverage figure."
    >
      <div className="bg-background border-2 border-dashed border-foreground/30 p-8 text-center">
        <div className="mono-label text-foreground/60 mb-2">§ Ownership</div>
        <p className="text-foreground/85 text-sm max-w-md mx-auto leading-relaxed">
          Purchasing is not yet configured. Once The 3rd Academy enables
          commerce, the rehearsals you own will appear here — grouped by
          Continue, Ready to Start, and Completed.
        </p>
        <div className="mt-6">
          <Link to="/dashboard/candidate/training/workrehearsal">
            <Button
              variant="outline"
              className="rounded-none border-2 border-foreground text-foreground hover:bg-foreground/[0.05]"
            >
              ← Back to Workplace Moments
            </Button>
          </Link>
        </div>
      </div>
    </BridgeFastFrame>
  );
}
