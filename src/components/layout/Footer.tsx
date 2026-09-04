import { Link } from "react-router-dom";
import { BrandSeal } from "@/components/BrandSeal";
import { todayStamp } from "@/lib/dateStamp";

const footerLinks = {
  platform: {
    label: "The Platform",
    items: [
      { name: "Platform Overview", href: "/platform" },
      { name: "For Individuals", href: "/get-started" },
      { name: "For Employers", href: "/employers" },
      { name: "For Schools or Institutions", href: "/schools" },
    ],
  },
  company: {
    label: "The Academy",
    items: [
      { name: "About", href: "/about" },
      { name: "Careers", href: "/careers" },
      { name: "Press", href: "/press" },
      { name: "Contact", href: "/contact" },
    ],
  },
  resources: {
    label: "Reading Room",
    items: [
      { name: "Get Started", href: "/get-started" },
      { name: "Journal", href: "/blog" },
      { name: "Help Center", href: "/help" },
    ],
  },
  legal: {
    label: "Record & Rights",
    items: [
      { name: "Privacy", href: "/privacy" },
      { name: "Terms", href: "/terms" },
      { name: "Security", href: "/security" },
    ],
  },
};

export function Footer() {
  return (
    <footer className="relative z-10 bg-background text-foreground border-t border-foreground">
      {/* Colophon strip */}
      <div className="border-b border-foreground/15 py-3">
        <div className="max-w-[1400px] mx-auto px-6 flex flex-wrap items-center justify-between gap-2">
          <span className="mono-label text-foreground/60">
            End of Register · Turn page for colophon
          </span>
          <span className="mono-label text-foreground/60">
            Set in Fraunces &amp; Instrument Sans
          </span>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-16 md:py-24">
        {/* Masthead */}
        <div className="grid md:grid-cols-12 gap-10 mb-16">
          <div className="md:col-span-6">
            <Link to="/" className="inline-flex items-center gap-3 mb-6 group">
              <BrandSeal size={48} withDots className="group-hover:rotate-[-2deg] transition-transform" />
              <span className="display-serif text-2xl tracking-tight">The 3rd Academy</span>
            </Link>
            <p className="display-serif text-xl md:text-2xl leading-[1.35] max-w-lg text-foreground">
              Focused on <span className="italic display-serif-italic">Behavioral Workplace Readiness</span> — how conduct shows up in the environment where work happens, when knowledge and capability alone are no longer enough.
            </p>
            <div className="mt-8 space-y-1">
              <p className="mono-label text-foreground/50">
                143 Saddlecrest Gardens NE · Calgary, AB · T4J 0C3 · Canada
              </p>
              <p className="mono-label text-foreground/50">
                <a href="tel:+15877163135" className="hover:text-foreground transition-colors">
                  +1 (587) 716-3135
                </a>
                {" · "}
                <a href="mailto:hello@the3rdacademy.com" className="hover:text-foreground transition-colors">
                  hello@the3rdacademy.com
                </a>
              </p>
              <p className="mono-label text-foreground/50 pt-2">
                Behavioral Workplace Readiness · {todayStamp()}
              </p>
            </div>
          </div>

          <div className="md:col-span-6 grid grid-cols-2 sm:grid-cols-4 gap-8">
            {Object.entries(footerLinks).map(([key, group]) => (
              <div key={key}>
                <h3 className="mono-label text-foreground/50 pb-2 mb-3 border-b border-foreground/15">
                  {group.label}
                </h3>
                <ul className="space-y-2.5">
                  {group.items.map((link) => (
                    <li key={link.name}>
                      <Link
                        to={link.href}
                        className="text-sm text-foreground/80 hover:text-foreground hover:italic transition-all"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-foreground/20 flex flex-col md:flex-row items-baseline justify-between gap-4">
          <p className="mono-label text-foreground/60">
            © {new Date().getFullYear()} · The 3rd Academy · All rights reserved
          </p>
          <p className="mono-label text-foreground/60">
            Filed under: Behavioral Evidence · Vol. 01
          </p>
        </div>
      </div>
    </footer>
  );
}
