import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation, useSearchParams, Link } from "react-router-dom";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const Login = () => {
  const [userType, setUserType] = useState<"candidate" | "mentor" | "employer">("candidate");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { signIn, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogle = async () => {
    setError("");
    setIsGoogleLoading(true);
    const { error: googleError } = await signInWithGoogle();
    if (googleError) {
      setError(googleError.message || "Could not sign in with Google");
      setIsGoogleLoading(false);
    }
    // On success the browser is redirected — no cleanup here.
  };
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Surface any error passed via ?error= (e.g. from AuthCallback / OAuth)
  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError) {
      setError(urlError);
      toast({
        title: "Sign in failed",
        description: urlError,
        variant: "destructive",
      });
      // Clean the URL so refresh doesn't repeat the toast
      searchParams.delete("error");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            className="border-2 border-foreground p-8 md:p-10 pt-14 md:pt-16 bg-background/40 relative"
          >
            {/* Post-Launch 04 Note 1: stamp sits with clear breathing room
                beneath the top border rather than straddling it. Panel top
                padding is bumped so the eyebrow beneath the stamp is not
                crowded by the move. */}
            <div className="absolute top-4 right-4 sm:right-6 max-w-[calc(100%-2rem)] stamp normal-case bg-background">Members' entrance</div>

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
                    {role === "candidate" ? "Individual" : role}
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
                <PasswordInput
                  id="password"
                  autoComplete="current-password"
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
                disabled={isLoading || isGoogleLoading}
                className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none py-6 text-base font-medium"
              >
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…</>
                ) : (
                  <>Sign in <span className="ml-3">→</span></>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-4">
              <div className="flex-1 border-t border-foreground/20" />
              <span className="mono-label text-foreground/40">or</span>
              <div className="flex-1 border-t border-foreground/20" />
            </div>

            {/* Google */}
            <Button
              type="button"
              onClick={handleGoogle}
              disabled={isLoading || isGoogleLoading}
              variant="outline"
              className="w-full border-2 border-foreground bg-background hover:bg-foreground/5 text-foreground rounded-none shadow-none py-6 text-base font-medium flex items-center justify-center gap-3"
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Opening Google…
                </>
              ) : (
                <>
                  <GoogleGlyph className="w-5 h-5" />
                  Sign in with Google
                </>
              )}
            </Button>

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

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

export default Login;
