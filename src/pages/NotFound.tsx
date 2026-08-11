import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404: attempted route:", location.pathname);
  }, [location.pathname]);

  return (
    <PublicLayout>
      <section className="paper-grain min-h-screen flex items-center justify-center pt-32 pb-24 overflow-hidden">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
          >
            <div className="mono-label text-foreground/50 mb-6">
              § 404 · Page not in the register
            </div>

            <div className="ledger-num text-[10rem] md:text-[16rem] text-foreground leading-none tracking-tighter">
              404
            </div>

            <div className="my-10 max-w-md mx-auto">
              <div className="rule-h border-foreground my-8" />
              <p className="display-serif text-3xl md:text-4xl text-foreground leading-tight">
                This <span className="italic display-serif-italic">page</span> was not{" "}
                <span className="ink-vermilion">filed.</span>
              </p>
              <p className="mt-6 text-foreground/70 leading-relaxed">
                The page you were looking for is not in this volume. It may have been
                moved, retired, or never registered at all.
              </p>
              <div className="mono-label text-foreground/50 mt-6 text-left inline-block">
                Attempted route:{" "}
                <span className="text-foreground normal-case">{location.pathname}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                asChild
                className="bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none px-8 py-6 text-base font-medium"
              >
                <Link to="/">
                  Return to the front page
                  <span className="ml-3">→</span>
                </Link>
              </Button>
              <Button
                onClick={() => window.history.back()}
                variant="ghost"
                className="text-foreground hover:bg-foreground/5 rounded-none px-4 py-6 text-base font-medium underline underline-offset-8 decoration-1"
              >
                ← Go back one page
              </Button>
            </div>

            <div className="mt-12 mono-label text-foreground/50">
              Or try:{" "}
              {[
                { label: "Platform", href: "/platform" },
                { label: "About", href: "/about" },
                { label: "Get Started", href: "/get-started" },
              ].map((l, i) => (
                <span key={l.href}>
                  {i > 0 && " · "}
                  <Link to={l.href} className="text-foreground hover:ink-vermilion normal-case underline underline-offset-4">
                    {l.label}
                  </Link>
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default NotFound;
