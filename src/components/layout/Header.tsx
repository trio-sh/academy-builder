import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, LayoutDashboard, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/types/database.types";

type UserRole = Database["public"]["Tables"]["profiles"]["Row"]["role"];

const navigation = [
  { name: "Platform", href: "/platform" },
  { name: "For Employers", href: "/employers" },
  { name: "For Schools", href: "/schools" },
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
      className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <nav className="container flex items-center justify-between h-16 px-4 md:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <motion.div className="flex items-center" whileHover={{ scale: 1.05 }}>
            <img
              src="https://api.a0.dev/assets/image?text=Futuristic AI-powered academy logo with glowing blue circuit patterns and neural networks&aspect=1:1&seed=academy_logo"
              alt="The 3rd Academy Logo"
              className="h-10 w-10 mr-2 rounded-full shadow-lg"
            />
            <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              The 3rd Academy
            </h1>
          </motion.div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "relative px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                location.pathname === item.href
                  ? "text-white"
                  : "text-gray-400 hover:text-white"
              )}
            >
              {location.pathname === item.href && (
                <motion.div
                  className="absolute inset-0 bg-white/10 rounded-lg"
                  layoutId="activeNav"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">{item.name}</span>
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          {isLoading ? (
            <div className="w-20 h-8 bg-white/10 rounded-lg animate-pulse" />
          ) : isAuthenticated && profile ? (
            <>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-600/30"
                  asChild
                >
                  <Link to={userDashboard}>
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Dashboard
                  </Link>
                </Button>
              </motion.div>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white hover:bg-white/10"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white hover:bg-white/10"
                asChild
              >
                <Link to="/login">Sign In</Link>
              </Button>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-600/30"
                  asChild
                >
                  <Link to="/get-started">Get Started</Link>
                </Button>
              </motion.div>
            </>
          )}
        </div>

        {/* Mobile Menu */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full max-w-xs bg-black/95 backdrop-blur-xl border-white/10">
            <div className="flex flex-col gap-6 mt-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "text-lg font-medium transition-colors",
                    location.pathname === item.href
                      ? "text-white"
                      : "text-gray-400 hover:text-white"
                  )}
                >
                  {item.name}
                </Link>
              ))}
              <div className="pt-6 border-t border-white/10 flex flex-col gap-3">
                {isLoading ? (
                  <div className="w-full h-10 bg-white/10 rounded-lg animate-pulse" />
                ) : isAuthenticated && profile ? (
                  <>
                    {/* User info */}
                    <div className="flex items-center gap-3 py-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-medium">
                        {profile.first_name?.[0]}{profile.last_name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {profile.first_name} {profile.last_name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{profile.email}</p>
                      </div>
                    </div>
                    <Button
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                      asChild
                    >
                      <Link to={userDashboard} onClick={() => setMobileMenuOpen(false)}>
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        Go to Dashboard
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full border-white/20 text-white hover:bg-white/10"
                      onClick={handleSignOut}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="w-full border-white/20 text-white hover:bg-white/10"
                      asChild
                    >
                      <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                        Sign In
                      </Link>
                    </Button>
                    <Button
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                      asChild
                    >
                      <Link to="/get-started" onClick={() => setMobileMenuOpen(false)}>
                        Get Started
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
