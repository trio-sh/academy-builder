import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  Bell,
  LogOut,
  PanelLeft,
  PanelLeftClose,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { BrandSeal } from "@/components/BrandSeal";
import type { Database } from "@/types/database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

export interface DashboardNavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  section: string;
  badge?: number;
}

export interface DashboardSection {
  id: string;
  /** Short mono label shown above the section's items, e.g. "§ I · Observation" */
  label: string;
  /** Optional secondary chip: e.g. { text: "Self-directed" } */
  chip?: { text: string };
}

// ─── Header slot context ────────────────────────────────────────────────────
// A dashboard route can push a custom node into the topbar, replacing the
// default "§ Page" breadcrumb. Used by the Praxis agent to host its session
// picker there instead of in its own body.

interface HeaderSlotCtx {
  slot: ReactNode | null;
  setSlot: (node: ReactNode | null) => void;
}

const DashboardHeaderContext = createContext<HeaderSlotCtx | null>(null);

export function useDashboardHeader() {
  const ctx = useContext(DashboardHeaderContext);
  const setSlot = useCallback(
    (node: ReactNode | null) => ctx?.setSlot(node),
    [ctx]
  );
  useEffect(() => {
    // Clean up whatever this consumer registered when it unmounts.
    return () => ctx?.setSlot(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { setHeaderSlot: setSlot };
}

interface DashboardLayoutProps {
  role: string;
  /** Deprecated — no longer rendered. Kept to avoid breaking callers. */
  roleTagline?: string;
  nav: DashboardNavItem[];
  sections: DashboardSection[];
  children: ReactNode;
  notifications?: NotificationRow[];
  onMarkNotificationRead?: (id: string) => void;
  onMarkAllRead?: () => void;
  notificationsHref?: string;
}

export function DashboardLayout({
  role,
  nav,
  sections,
  children,
  notifications = [],
  onMarkNotificationRead,
  onMarkAllRead,
  notificationsHref,
}: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [headerSlot, setHeaderSlot] = useState<ReactNode | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const unreadCount = notifications.length;
  const isFullBleedRoute = location.pathname.endsWith("/agent");

  return (
    <DashboardHeaderContext.Provider value={{ slot: headerSlot, setSlot: setHeaderSlot }}>
    <div
     
      className={cn(
        "min-h-screen bg-background text-foreground antialiased selection:bg-foreground selection:text-background",
        isFullBleedRoute && "h-screen overflow-hidden"
      )}
    >
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-foreground/40 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ─── Sidebar ─────────────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full paper-grain bg-background border-r-2 border-foreground transform transition-all duration-300 lg:translate-x-0",
          collapsed ? "w-16" : "w-72",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Masthead */}
          <div
            className={cn(
              "flex items-center border-b border-foreground",
              collapsed ? "justify-center py-4" : "justify-between px-5 py-4"
            )}
          >
            {collapsed ? (
              <Link to="/" className="flex items-center justify-center">
                <BrandSeal size={36} />
              </Link>
            ) : (
              <Link to="/" className="flex items-center gap-3 group">
                <BrandSeal size={40} className="group-hover:rotate-[-2deg] transition-transform" />
                <div className="flex flex-col leading-none">
                  <span className="display-serif text-base tracking-tight text-foreground">
                    The 3rd Academy
                  </span>
                  <span className="mono-label text-foreground/50 mt-0.5">
                    {role} Desk
                  </span>
                </div>
              </Link>
            )}
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden text-foreground/60 hover:text-foreground"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav */}
          <nav
            className={cn(
              "flex-1 overflow-y-auto",
              collapsed ? "py-3 px-2" : "py-4 px-3"
            )}
          >
            {sections.map((section, sIdx) => {
              const itemsInSection = nav.filter((n) => n.section === section.id);
              if (itemsInSection.length === 0) return null;
              return (
                <div key={section.id} className={cn(sIdx > 0 && "mt-6 pt-4 border-t border-foreground/20")}>
                  {!collapsed && (
                    <div className="flex items-baseline gap-2 px-2 mb-2">
                      <span className="mono-label text-foreground/60">
                        {section.label}
                      </span>
                      {section.chip && (
                        <span className="ink-vermilion mono-label text-[0.6rem]">
                          · {section.chip.text}
                        </span>
                      )}
                    </div>
                  )}
                  {itemsInSection.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setMobileOpen(false)}
                        title={collapsed ? item.name : undefined}
                        className={cn(
                          "group relative flex items-center transition-all",
                          collapsed
                            ? "justify-center py-3 px-2"
                            : "gap-3 px-3 py-2.5",
                          isActive
                            ? "bg-foreground text-background"
                            : "text-foreground/70 hover:text-foreground hover:bg-foreground/[0.04]"
                        )}
                      >
                        {/* Active accent bar */}
                        {isActive && !collapsed && (
                          <span className="absolute left-0 top-0 bottom-0 w-1 bg-vermilion" />
                        )}
                        <span className="relative flex-shrink-0">
                          <item.icon className="w-4 h-4" strokeWidth={1.5} />
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center px-1 text-[10px] font-medium leading-none bg-vermilion text-background">
                              {item.badge > 99 ? "99+" : item.badge}
                            </span>
                          )}
                        </span>
                        {!collapsed && (
                          <span
                            className={cn(
                              "text-[0.9375rem] tracking-tight",
                              isActive && "font-medium"
                            )}
                            style={{ fontFamily: 'Fraunces, Georgia, serif' }}
                          >
                            {item.name}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </nav>

          {/* Collapse toggle — desktop only */}
          <div className="hidden lg:flex justify-center py-2 border-t border-foreground/20">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-colors"
              title={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          </div>

          {/* User footer */}
          <div className={cn("border-t border-foreground", collapsed ? "p-2" : "p-4")}>
            <div className={cn("flex items-center", collapsed ? "justify-center mb-3" : "gap-3 mb-3")}>
              <UserAvatar profile={profile} collapsed={collapsed} />
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="display-serif text-[0.9375rem] leading-tight text-foreground truncate">
                    {profile?.first_name} {profile?.last_name}
                  </p>
                  <p className="mono-label text-foreground/50 mt-1 truncate normal-case">
                    {profile?.email}
                  </p>
                </div>
              )}
            </div>
            {collapsed ? (
              <button
                onClick={() => signOut()}
                className="flex items-center justify-center w-full p-2 text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <Button
                variant="outline"
                className="w-full border-foreground/30 text-foreground hover:bg-foreground hover:text-background rounded-none shadow-none justify-start px-3"
                onClick={() => signOut()}
              >
                <LogOut className="w-3.5 h-3.5 mr-2" />
                <span className="text-sm">Sign out</span>
              </Button>
            )}
          </div>
        </div>
      </aside>

      {/* ─── Main column ─────────────────────────────────────────── */}
      <div
        className={cn(
          "transition-all duration-300",
          collapsed ? "lg:pl-16" : "lg:pl-72",
          isFullBleedRoute && "h-screen flex flex-col overflow-hidden"
        )}
      >
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-8 py-4 bg-background/85 backdrop-blur-md border-b border-foreground/40 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-foreground hover:text-vermilion"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            {headerSlot ? (
              <div className="min-w-0 flex-1">{headerSlot}</div>
            ) : (
              <div className="mono-label text-foreground/60 hidden md:block">
                {breadcrumb(location.pathname, nav)}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="mono-label text-foreground/50 hidden sm:block">
              {new Date().toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </div>

            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative w-9 h-9 flex items-center justify-center text-foreground border border-foreground/25 hover:border-foreground hover:bg-foreground/5 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" strokeWidth={1.5} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center px-1 text-[10px] font-medium leading-none bg-vermilion text-background">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-96 bg-background border-2 border-foreground shadow-[4px_4px_0_rgba(29,24,21,0.15)] overflow-hidden"
                  >
                    <div className="p-4 border-b border-foreground/25 flex items-center justify-between">
                      <div className="mono-label text-foreground/60">§ Notices</div>
                      {notifications.length > 0 && onMarkAllRead && (
                        <button
                          onClick={onMarkAllRead}
                          className="mono-label text-foreground hover:ink-vermilion underline underline-offset-4"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    {notifications.length > 0 ? (
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.map((n) => (
                          <div
                            key={n.id}
                            className="p-4 border-b border-foreground/15 hover:bg-foreground/[0.03] flex items-start gap-3"
                          >
                            <span className="ink-vermilion display-serif text-xl leading-none">§</span>
                            <div className="flex-1 min-w-0">
                              <p className="display-serif text-base leading-tight text-foreground">
                                {n.title}
                              </p>
                              <p className="text-[0.8125rem] text-foreground/75 mt-1 leading-relaxed">
                                {n.message}
                              </p>
                              <p className="mono-label text-foreground/40 mt-2">
                                {new Date(n.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            {onMarkNotificationRead && (
                              <button
                                onClick={() => onMarkNotificationRead(n.id)}
                                className="text-foreground/40 hover:text-foreground p-1"
                                title="Mark read"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <div className="mono-label text-foreground/50">
                          No notices in the register
                        </div>
                      </div>
                    )}
                    {notificationsHref && (
                      <div className="p-3 border-t border-foreground/25">
                        <button
                          onClick={() => {
                            setNotifOpen(false);
                            navigate(notificationsHref);
                          }}
                          className="w-full text-center mono-label text-foreground hover:ink-vermilion py-2"
                        >
                          Read all notices →
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page content — the paper background fills the viewport so no
            dashboard background shows through beneath short pages. This is
            the Post-Launch 04 Note 11 fix, applied at the shared wrapper
            rather than page-by-page. */}
        <main
          className={cn(
            "paper-grain",
            isFullBleedRoute
              ? "flex-1 overflow-hidden"
              : "min-h-[calc(100vh-4.5rem)] p-4 md:p-10"
          )}
        >
          {children}
        </main>
      </div>
    </div>
    </DashboardHeaderContext.Provider>
  );
}

function UserAvatar({ profile, collapsed }: { profile: ProfileRow | null; collapsed: boolean }) {
  const size = collapsed ? "w-8 h-8" : "w-10 h-10";
  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt=""
        className={cn(size, "rounded-full object-cover ring-1 ring-foreground/25")}
      />
    );
  }
  return (
    <div
      className={cn(
        size,
        "rounded-full border border-foreground flex items-center justify-center display-serif text-foreground bg-background"
      )}
    >
      {profile?.first_name?.[0]}
      {profile?.last_name?.[0]}
    </div>
  );
}

function breadcrumb(pathname: string, nav: DashboardNavItem[]): string {
  const active = nav.find((n) => n.href === pathname);
  if (active) return `§ ${active.name}`;
  // Try to derive from route segments
  const parts = pathname.split("/").filter(Boolean);
  return "§ " + (parts[parts.length - 1] || "Overview").replace(/-/g, " ");
}
