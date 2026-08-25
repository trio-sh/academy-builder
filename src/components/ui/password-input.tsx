import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

/**
 * PasswordInput — the platform-wide password field, per Post-Launch
 * Edits 02, Note 4.
 *
 * - Always loads masked. The revealed state is never remembered across
 *   screens, sessions, or storage; every field starts every load
 *   masked.
 * - Clicking or tapping the eye icon reveals the password in plain
 *   text; clicking or tapping again masks it. The typed value never
 *   changes and focus never leaves the field.
 * - The reveal control is a `type="button"` so pressing Enter on it
 *   does not submit the form.
 * - Paste is allowed. Password managers can fill the field. Autofill
 *   hints match spec: `autocomplete="new-password"` on account
 *   creation, `autocomplete="current-password"` on sign-in.
 * - On mobile, autocapitalize, autocorrect and spellcheck are all
 *   disabled — otherwise a phone keyboard capitalizes the first
 *   character silently.
 * - The Edge / IE reveal control is suppressed globally by a rule in
 *   index.css so it cannot appear on top of ours.
 * - The field re-masks before submit and after back-navigation via the
 *   pageshow event (bfcache) — so a page opened from history never
 *   shows a previously revealed password.
 */

export type PasswordAutocomplete = "new-password" | "current-password";

export interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "autoComplete"> {
  autoComplete: PasswordAutocomplete;
  containerClassName?: string;
  toggleLabel?: {
    show?: string;
    hide?: string;
  };
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    {
      className,
      containerClassName,
      autoComplete,
      onBlur,
      toggleLabel,
      ...rest
    },
    forwardedRef
  ) {
    const [revealed, setRevealed] = React.useState(false);
    const innerRef = React.useRef<HTMLInputElement | null>(null);
    const setRefs = React.useCallback(
      (node: HTMLInputElement | null) => {
        innerRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef)
          (forwardedRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
      },
      [forwardedRef]
    );

    // Re-mask before form submit and after back-navigation. The pageshow
    // event fires on bfcache restore, when a browser can otherwise
    // repaint a previously revealed value.
    React.useEffect(() => {
      const el = innerRef.current;
      if (!el) return;
      const form = el.form;
      const onSubmit = () => setRevealed(false);
      const onPageShow = () => setRevealed(false);
      form?.addEventListener("submit", onSubmit);
      window.addEventListener("pageshow", onPageShow);
      return () => {
        form?.removeEventListener("submit", onSubmit);
        window.removeEventListener("pageshow", onPageShow);
      };
    }, []);

    const show = toggleLabel?.show ?? "Show password";
    const hide = toggleLabel?.hide ?? "Hide password";

    return (
      <div className={cn("relative", containerClassName)}>
        <Input
          ref={setRefs}
          {...rest}
          type={revealed ? "text" : "password"}
          autoComplete={autoComplete}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          onBlur={onBlur}
          className={cn("pr-11", className)}
        />
        <button
          type="button"
          onClick={() => setRevealed((r) => !r)}
          aria-pressed={revealed}
          aria-label={revealed ? hide : show}
          title={revealed ? hide : show}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-8 w-8 rounded-md",
            "text-foreground/60 hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60"
          )}
          tabIndex={0}
        >
          {revealed ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </button>
      </div>
    );
  }
);
