import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, LayoutDashboard, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { BrandSeal } from "@/components/BrandSeal";
import type { Database } from "@/types/database.types";

type UserRole = Database["public"]["Tables"]["profiles"]["Row"]["role"];

const navigation = [
  { name: "Platform", href: "/platform" },
  { name: "Job Seekers", href: "/get-started" },
  { name: "Employers", href: "/employers" },
  { name: "Schools", href: "/schools" },
  { name: "About", href: "/about" },
];

const dashboardRoutes: Record<UserRole, string> = {
  candidate: "/dashboard/candidate",
  mentor: "/dashboard/mentor",
  employer: "/dashboard/employer",
  school_admin: "/dashboard/school",
  admin: "/dashboard/admin",
};

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { isAuthenticated, isLoading, profile, signOut } = useAuth();

  const userDashboard = profile?.role ? dashboardRoutes[profile.role] : "/dashboard/candidate";

  const handleSignOut = async () => {
    setMobileMenuOpen(false);
    await signOut();
  };

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 bg-background/85 backdrop-blur-md border-b border-foreground/15"
      initial={{ y: -60 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1] }}
    >
      {/* Ledger meta strip */}
      <div className="hidden md:flex items-center justify-between px-6 py-1.5 border-b border-foreground/10 text-foreground/60">
        <span className="mono-label">The 3rd Academy · Behavioral Readiness Register</span>
        <span className="mono-label">Vol. 01 · Iss. 04 · MMXXVI</span>
      </div>

      <nav className="flex items-center justify-between h-16 px-4 md:px-6 max-w-[1400px] mx-auto">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <BrandSeal size={40} className="group-hover:rotate-[-2deg] transition-transform" />
          <div className="flex flex-col leading-none">
            <span className="display-serif text-[1.05rem] tracking-tight text-foreground">
              The 3rd Academy
            </span>
            <span className="mono-label text-foreground/50 mt-0.5">est. MMXXV</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center">
          {navigation.map((item, i) => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "relative px-4 py-2 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors",
                i > 0 && "border-l border-foreground/15",
                location.pathname === item.href && "text-foreground"
              )}
            >
              <span className="relative">
                {item.name}
                {location.pathname === item.href && (
                  <motion.span
                    layoutId="activeNav"
                    className="absolute -bottom-1 left-0 right-0 h-px bg-foreground"
                  />
                )}
              </span>
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          {isLoading ? (
            <div className="w-24 h-8 bg-foreground/5 animate-pulse" />
          ) : isAuthenticated && profile ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="text-foreground hover:bg-foreground/5 rounded-none font-medium"
                onClick={handleSignOut}
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
                Sign out
              </Button>
              <Button
                size="sm"
                className="bg-foreground text-background hover:bg-foreground/90 rounded-none font-medium shadow-none"
                asChild
              >
                <Link to={userDashboard}>
                  <LayoutDashboard className="w-3.5 h-3.5 mr-1.5" />
                  Dashboard
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-foreground hover:bg-foreground/5 rounded-none font-medium"
                asChild
              >
                <Link to="/login">Sign in</Link>
              </Button>
              <Button
                size="sm"
                className="bg-foreground text-background hover:bg-foreground/90 rounded-none font-medium shadow-none px-5"
                asChild
              >
                <Link to="/get-started">
                  Enter the record
                  <span className="ml-2">→</span>
                </Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="ghost" size="icon" className="text-foreground hover:bg-foreground/5 rounded-none">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full max-w-xs bg-background border-l border-foreground/20 text-foreground">
            <div className="flex flex-col gap-1 mt-10">
              <span className="mono-label text-foreground/50 mb-4">Contents</span>
              {navigation.map((item, i) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-baseline justify-between py-3 border-b border-foreground/10 group"
                >
                  <span className="display-serif text-xl text-foreground group-hover:italic transition-all">
                    {item.name}
                  </span>
                  <span className="mono-label text-foreground/40">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </Link>
              ))}
              <div className="pt-6 flex flex-col gap-3">
                {isLoading ? (
                  <div className="w-full h-10 bg-foreground/5 animate-pulse" />
                ) : isAuthenticated && profile ? (
                  <>
                    <div className="flex items-center gap-3 py-3 border-b border-foreground/10">
                      <div className="w-10 h-10 rounded-full border border-foreground flex items-center justify-center text-foreground font-medium display-serif overflow-hidden">
                        {profile.first_name?.[0]}{profile.last_name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {profile.first_name} {profile.last_name}
                        </p>
                        <p className="mono-label text-foreground/50 truncate normal-case">{profile.email}</p>
                      </div>
                    </div>
                    <Button
                      className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none"
                      asChild
                    >
                      <Link to={userDashboard} onClick={() => setMobileMenuOpen(false)}>
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        Dashboard
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full border-foreground/30 text-foreground rounded-none hover:bg-foreground/5"
                      onClick={handleSignOut}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="w-full border-foreground/30 text-foreground rounded-none hover:bg-foreground/5"
                      asChild
                    >
                      <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                        Sign in
                      </Link>
                    </Button>
                    <Button
                      className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none"
                      asChild
                    >
                      <Link to="/get-started" onClick={() => setMobileMenuOpen(false)}>
                        Enter the record →
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </motion.header>
  );
}
