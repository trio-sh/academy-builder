import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { resetPassword } from "@/lib/supabase";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const { error } = await resetPassword(email);
      if (error) {
        setError(error.message);
        return;
      }
      setSuccess(true);
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PublicLayout>
      <section className="paper-grain min-h-screen flex items-center justify-center pt-32 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.19, 1, 0.22, 1] }}
          className="w-full max-w-lg px-6"
        >
          <Link
            to="/login"
            className="inline-flex items-center gap-2 mono-label text-foreground/60 hover:text-foreground mb-10"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to sign in
          </Link>

          <div className="border-2 border-foreground p-8 md:p-10 bg-background/40">
            {success ? (
              <>
                <CheckCircle className="w-12 h-12 text-foreground mb-6" />
                <div className="mono-label text-foreground/60 mb-3">§ Message dispatched</div>
                <h2 className="display-serif text-4xl md:text-5xl text-foreground leading-[0.95] mb-6">
                  Check your <span className="italic display-serif-italic">inbox.</span>
                </h2>
                <p className="text-foreground/80 mb-6 leading-relaxed">
                  A password reset link has been sent to{" "}
                  <span className="italic display-serif-italic">{email}</span>. If it does
                  not arrive within a few minutes, check the spam folder or try again.
                </p>
                <div className="space-y-3">
                  <Button
                    onClick={() => { setSuccess(false); setEmail(""); }}
                    variant="outline"
                    className="w-full border-foreground/30 text-foreground hover:bg-foreground/5 rounded-none"
                  >
                    Try another email
                  </Button>
                  <Link to="/login">
                    <Button className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none">
                      Return to sign in →
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="mono-label text-foreground/60 mb-3">§ Password reset · Form 000-004</div>
                <h1 className="display-serif text-4xl md:text-5xl text-foreground leading-[0.95] mb-6">
                  Forgot your <span className="italic display-serif-italic ink-vermilion">password?</span>
                </h1>
                <p className="text-foreground/70 leading-relaxed mb-8">
                  Enter the email you registered with. We will send a reset link
                  immediately.
                </p>

                {error && (
                  <div className="mb-5 p-4 border-l-2 border-foreground bg-foreground/[0.04] flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-foreground flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="email" className="mono-label text-foreground/60 block mb-2">Email</label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="rounded-none border-foreground/40 border-x-0 border-t-0 border-b-2 focus-visible:border-foreground focus-visible:ring-0 bg-transparent px-0 text-lg display-serif"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isLoading || !email}
                    className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none py-6 text-base"
                  >
                    {isLoading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</>
                    ) : (
                      <>Send reset link <span className="ml-3">→</span></>
                    )}
                  </Button>
                </form>

                <p className="text-center mt-8 mono-label text-foreground/60">
                  Remembered your password?{" "}
                  <Link to="/login" className="text-foreground hover:ink-vermilion underline underline-offset-4">
                    Sign in →
                  </Link>
                </p>
              </>
            )}
          </div>
        </motion.div>
      </section>
    </PublicLayout>
  );
};

export default ForgotPassword;
