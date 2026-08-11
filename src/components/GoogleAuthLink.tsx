import { useCallback, useEffect, useState } from "react";
import { Loader2, Link as LinkIcon, Unlink, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

/**
 * GoogleAuthLink
 *
 * Lets a signed-in user link a Google identity to their existing
 * account so they can sign in with Google going forward, and lets
 * them unlink it later.
 *
 * Manual linking (`supabase.auth.linkIdentity`) requires the
 * project setting "Manual linking" to be enabled. When it is not,
 * Supabase returns `manual_linking_disabled` / 404. To stay working
 * in that mode we fall back to the reauth-style flow:
 *
 *   supabase.auth.signInWithOAuth({ provider: 'google',
 *     options: { queryParams: { prompt: 'select_account' } } })
 *
 * When the returning Google account's email matches the currently
 * signed-in user's email, Supabase adds Google to that user's
 * identities and keeps them signed in on the same auth.users row.
 * If the picked Google account uses a different email, Supabase
 * signs the user out of the current session and into the Google one
 * (creating that user if needed) — we warn about this before opening
 * the flow so the user knows to pick the matching Google account.
 */
export function GoogleAuthLink({ className }: { className?: string }) {
  const { user } = useAuth();
  const [isLinked, setIsLinked] = useState<boolean | null>(null);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [justLinked, setJustLinked] = useState(false);

  const refreshIdentities = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getUserIdentities();
      if (error) throw error;
      const google = data?.identities?.find((i) => i.provider === "google");
      setIsLinked(!!google);
      setGoogleEmail(
        google?.identity_data?.email ??
          google?.identity_data?.email_address ??
          null
      );
    } catch (err) {
      console.error("[GoogleAuthLink] getUserIdentities failed:", err);
      setIsLinked(false);
      setGoogleEmail(null);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setIsLinked(null);
      return;
    }
    void refreshIdentities();
  }, [user, refreshIdentities]);

  // If the user just came back from the OAuth flow, surface it.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("google_linked") === "1") {
      setJustLinked(true);
      toast({
        title: "Google linked",
        description: "You can now sign in with Google.",
      });
      url.searchParams.delete("google_linked");
      window.history.replaceState({}, "", url.toString());
      void refreshIdentities();
    }
  }, [refreshIdentities]);

  const handleLink = async () => {
    setBusy(true);
    try {
      const currentEmail = user?.email ?? "";
      const redirectTo = `${window.location.origin}${window.location.pathname}?google_linked=1`;

      // 1. Try manual linking first (works when the setting is enabled).
      const linkResult = await supabase.auth.linkIdentity({
        provider: "google",
        options: { redirectTo },
      });

      // On success the browser has already been redirected — nothing more to do.
      if (!linkResult.error) return;

      // 2. Fall back to reauth-style OAuth when manual linking is off.
      //    Supabase returns `manual_linking_disabled` (403/404) in that case.
      const err = linkResult.error as { message?: string; code?: string; status?: number };
      const isManualLinkingDisabled =
        err?.code === "manual_linking_disabled" ||
        err?.status === 404 ||
        /manual linking is disabled/i.test(err?.message ?? "");

      if (!isManualLinkingDisabled) {
        toast({
          title: "Could not link Google",
          description: err?.message ?? "Unknown error",
          variant: "destructive",
        });
        return;
      }

      // Warn: reauth flow will match by email; picking a different Google
      // account signs the user out of this account and into that one.
      const proceed = window.confirm(
        `On the next screen, pick the Google account that uses ${currentEmail || "your account email"}. ` +
          `Google will then be added as a way to sign in to your account.\n\n` +
          `Picking a different Google account will sign you into that account instead.\n\nContinue?`
      );
      if (!proceed) return;

      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            prompt: "select_account",
            // hint the picker toward the current account's email
            login_hint: currentEmail,
          },
        },
      });
      if (oauthErr) {
        toast({
          title: "Could not open Google",
          description: oauthErr.message,
          variant: "destructive",
        });
      }
      // On success the browser is redirected.
    } catch (err) {
      toast({
        title: "Could not link Google",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleUnlink = async () => {
    setBusy(true);
    try {
      const { data, error: listErr } = await supabase.auth.getUserIdentities();
      if (listErr) throw listErr;
      const google = data?.identities?.find((i) => i.provider === "google");
      if (!google) {
        toast({ title: "Google is not linked", description: "Nothing to unlink." });
        setIsLinked(false);
        return;
      }
      const passwordOrOther = data?.identities?.find((i) => i.provider !== "google");
      if (!passwordOrOther) {
        toast({
          title: "Cannot unlink your only sign-in method",
          description:
            "Set an email + password (or link another provider) before unlinking Google, otherwise you would be locked out.",
          variant: "destructive",
        });
        return;
      }
      const { error } = await supabase.auth.unlinkIdentity(google);
      if (error) {
        toast({
          title: "Could not unlink Google",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Google unlinked",
        description: "Google will no longer sign you in to this account.",
      });
      await refreshIdentities();
    } catch (err) {
      toast({
        title: "Could not unlink Google",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        "border-2 border-foreground p-6 bg-background/60 relative",
        className
      )}
    >
      {justLinked && (
        <div className="absolute -top-3 right-4 stamp normal-case">Just linked</div>
      )}

      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="mono-label text-foreground/60 mb-1">§ Sign-in methods</div>
          <h3 className="display-serif text-2xl md:text-3xl leading-tight text-foreground">
            Google account
          </h3>
        </div>
        <GoogleGlyph className="w-10 h-10 flex-shrink-0" />
      </div>

      <p className="text-foreground/75 text-[0.9375rem] leading-relaxed mb-6">
        Link a Google account to sign in without a password. Your existing entry
        in the register stays the same — Google is only added as a way in.
      </p>

      <div className="border-t border-foreground/25 pt-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          {isLinked === null ? (
            <div className="mono-label text-foreground/60 flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Checking…
            </div>
          ) : isLinked ? (
            <div>
              <div className="mono-label text-foreground flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 ink-vermilion" />
                Linked
              </div>
              {googleEmail && (
                <div className="text-sm text-foreground/70 mt-1 truncate">
                  <span className="italic display-serif-italic">{googleEmail}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="mono-label text-foreground/60">Not linked</div>
          )}
        </div>

        {isLinked ? (
          <Button
            variant="outline"
            disabled={busy}
            onClick={handleUnlink}
            className="border-foreground/30 text-foreground rounded-none hover:bg-foreground/5 shadow-none"
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Unlinking…
              </>
            ) : (
              <>
                <Unlink className="w-4 h-4 mr-2" /> Unlink Google
              </>
            )}
          </Button>
        ) : (
          <Button
            disabled={busy}
            onClick={handleLink}
            className="bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none"
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Opening…
              </>
            ) : (
              <>
                <LinkIcon className="w-4 h-4 mr-2" /> Link Google
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
