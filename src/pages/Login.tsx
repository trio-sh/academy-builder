import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const Login = () => {
  const [userType, setUserType] = useState<"candidate" | "mentor" | "employer">("candidate");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const getDashboardRoute = (role: string) => {
    const routes: Record<string, string> = {
      candidate: "/dashboard/candidate",
      mentor: "/dashboard/mentor",
      employer: "/dashboard/employer",
    };
    return routes[role] || "/dashboard/candidate";
  };

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || getDashboardRoute(userType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        setError(signInError.message || "Invalid email or password");
        return;
      }
      toast({ title: "Welcome back.", description: "You have signed in to the register." });
      navigate(from, { replace: true });
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PublicLayout>
      <section className="paper-grain min-h-screen flex items-center pt-32 pb-16">
        <div className="max-w-6xl mx-auto px-6 w-full grid md:grid-cols-2 gap-16 items-center">
          {/* Left — editorial welcome */}
          <div>
            <div className="mono-label text-foreground/60 mb-4">§ Sign in · Register access</div>
            <h1 className="display-serif text-[3rem] md:text-[5.5rem] text-foreground leading-[0.95]">
              <span className="block">Welcome</span>
              <span className="block italic display-serif-italic">back to the</span>
              <span className="block ink-vermilion">register.</span>
            </h1>
            <p className="mt-8 text-foreground/80 text-lg leading-relaxed border-l-2 border-foreground pl-6 max-w-md">
              Continue where the observation left off. Every entry in your record is
              still yours — the register kept it while you were away.
            </p>
          </div>

          {/* Right — form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.19, 1, 0.22, 1] }}
            className="border-2 border-foreground p-8 md:p-10 bg-background/40 relative"
          >
            <div className="absolute -top-4 right-8 stamp normal-case">Members' entrance</div>

            <div className="mono-label text-foreground/60 pb-3 mb-6 border-b border-foreground/25">
              Form No. 000-003 · Sign in
            </div>

            {error && (
              <div className="mb-5 p-4 border-l-2 border-foreground bg-foreground/[0.04] flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-foreground flex-shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">{error}</p>
              </div>
            )}

            {/* Role tabs */}
            <div className="mb-6">
              <div className="mono-label text-foreground/60 mb-3">I am signing in as</div>
              <div className="grid grid-cols-3 border border-foreground">
                {(["candidate", "mentor", "employer"] as const).map((role, i) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setUserType(role)}
                    className={cn(
                      "py-3 text-sm font-medium capitalize transition-colors",
                      userType === role
                        ? "bg-foreground text-background"
                        : "text-foreground hover:bg-foreground/5",
                      i > 0 && "border-l border-foreground"
                    )}
                  >
                    {role === "candidate" ? "Job seeker" : role}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="mono-label text-foreground/60 block mb-2">Email</label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="rounded-none border-foreground/40 border-x-0 border-t-0 border-b-2 focus-visible:border-foreground focus-visible:ring-0 bg-transparent px-0 text-lg display-serif"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="mono-label text-foreground/60">Password</label>
                  <Link to="/forgot-password" className="mono-label text-foreground hover:ink-vermilion underline underline-offset-4">
                    Forgot?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="•••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="rounded-none border-foreground/40 border-x-0 border-t-0 border-b-2 focus-visible:border-foreground focus-visible:ring-0 bg-transparent px-0 text-lg display-serif"
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none py-6 text-base font-medium"
              >
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…</>
                ) : (
                  <>Sign in <span className="ml-3">→</span></>
                )}
              </Button>
            </form>

            <p className="mt-8 text-center mono-label text-foreground/60">
              Not yet in the register?{" "}
              <Link to="/get-started" className="text-foreground hover:ink-vermilion underline underline-offset-4">
                Enter →
              </Link>
            </p>
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Login;
