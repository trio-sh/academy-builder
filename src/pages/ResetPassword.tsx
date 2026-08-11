import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { updatePassword, supabase } from "@/lib/supabase";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsValidSession(!!session);
    };
    check();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setIsValidSession(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const validatePassword = () => {
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validatePassword()) return;
    setIsLoading(true);
    try {
      const { error } = await updatePassword(password);
      if (error) { setError(error.message); return; }
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const strength = (() => {
    if (!password) return { s: 0, label: "" };
    let s = 0;
    if (password.length >= 8) s++;
    if (password.length >= 12) s++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^a-zA-Z0-9]/.test(password)) s++;
    if (s <= 2) return { s, label: "Weak" };
    if (s <= 3) return { s, label: "Fair" };
    if (s <= 4) return { s, label: "Good" };
    return { s, label: "Strong" };
  })();

  return (
    <PublicLayout>
      <section className="paper-grain min-h-screen flex items-center justify-center pt-32 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="w-full max-w-lg px-6"
        >
          <div className="border-2 border-foreground p-8 md:p-10 bg-background/40">
            {isValidSession === null ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-foreground mx-auto mb-4" />
                <p className="mono-label text-foreground/60">Verifying reset link…</p>
              </div>
            ) : isValidSession === false ? (
              <>
                <AlertCircle className="w-12 h-12 text-foreground mb-6" />
                <div className="mono-label text-foreground/60 mb-3">§ Invalid link</div>
                <h2 className="display-serif text-4xl md:text-5xl text-foreground leading-[0.95] mb-6">
                  Link is <span className="italic display-serif-italic ink-vermilion">expired.</span>
                </h2>
                <p className="text-foreground/70 mb-8 leading-relaxed">
                  This password reset link is invalid or has expired. Request a new one below.
                </p>
                <div className="space-y-3">
                  <Link to="/forgot-password">
                    <Button className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none">
                      Request new reset link →
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button variant="outline" className="w-full border-foreground/30 text-foreground rounded-none hover:bg-foreground/5">
                      Return to sign in
                    </Button>
                  </Link>
                </div>
              </>
            ) : success ? (
              <>
                <CheckCircle className="w-12 h-12 text-foreground mb-6" />
                <div className="mono-label text-foreground/60 mb-3">§ Password updated</div>
                <h2 className="display-serif text-4xl md:text-5xl text-foreground leading-[0.95] mb-6">
                  Password <span className="italic display-serif-italic">reset.</span>
                </h2>
                <p className="text-foreground/70 mb-6 leading-relaxed">
                  Your password has been successfully updated. You will be redirected to
                  the sign-in page in a moment.
                </p>
                <Link to="/login">
                  <Button className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none">
                    Sign in now →
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <div className="mono-label text-foreground/60 mb-3">§ Password reset · Form 000-005</div>
                <h1 className="display-serif text-4xl md:text-5xl text-foreground leading-[0.95] mb-6">
                  Reset your <span className="italic display-serif-italic ink-vermilion">password.</span>
                </h1>
                <p className="text-foreground/70 mb-8 leading-relaxed">
                  Enter a new password for your account. Store it somewhere safe.
                </p>

                {error && (
                  <div className="mb-5 p-4 border-l-2 border-foreground bg-foreground/[0.04] flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-foreground flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="password" className="mono-label text-foreground/60 block mb-2">New password</label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter new password"
                        required
                        className="rounded-none border-foreground/40 border-x-0 border-t-0 border-b-2 focus-visible:border-foreground focus-visible:ring-0 bg-transparent px-0 text-lg display-serif pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-0 bottom-3 text-foreground/60 hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {password && (
                      <div className="mt-3">
                        <div className="flex gap-1 mb-1">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div
                              key={i}
                              className={cn(
                                "h-[2px] flex-1",
                                i <= strength.s ? "bg-foreground" : "bg-foreground/15"
                              )}
                            />
                          ))}
                        </div>
                        <p className="mono-label text-foreground/60">Strength: {strength.label}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="mono-label text-foreground/60 block mb-2">Confirm</label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        required
                        className="rounded-none border-foreground/40 border-x-0 border-t-0 border-b-2 focus-visible:border-foreground focus-visible:ring-0 bg-transparent px-0 text-lg display-serif pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-0 bottom-3 text-foreground/60 hover:text-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirmPassword && (
                      <p className={cn(
                        "mono-label mt-2",
                        password === confirmPassword ? "ink-vermilion" : "text-foreground/60"
                      )}>
                        {password === confirmPassword ? "✓ Passwords match" : "Passwords do not match"}
                      </p>
                    )}
                  </div>

                  <div className="border border-foreground/20 p-4">
                    <p className="mono-label text-foreground/60 mb-2">Requirements</p>
                    <ul className="space-y-1 text-sm">
                      <li className={cn(password.length >= 8 && "ink-vermilion")}>
                        {password.length >= 8 ? "✓" : "·"} At least 8 characters
                      </li>
                      <li className={cn(/[a-z]/.test(password) && /[A-Z]/.test(password) && "ink-vermilion")}>
                        {/[a-z]/.test(password) && /[A-Z]/.test(password) ? "✓" : "·"} Upper and lowercase letters
                      </li>
                      <li className={cn(/[0-9]/.test(password) && "ink-vermilion")}>
                        {/[0-9]/.test(password) ? "✓" : "·"} At least one number
                      </li>
                    </ul>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || !password || !confirmPassword || password !== confirmPassword}
                    className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none py-6 disabled:opacity-40"
                  >
                    {isLoading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Resetting…</>
                    ) : (
                      <>Reset password <span className="ml-3">→</span></>
                    )}
                  </Button>
                </form>
              </>
            )}
          </div>
        </motion.div>
      </section>
    </PublicLayout>
  );
};

export default ResetPassword;
