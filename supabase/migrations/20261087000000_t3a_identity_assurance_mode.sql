-- Identity assurance mode: replace the hardcoded UNAVAILABLE stub with a
-- configurable policy anchored in t3a_env_capability. Three modes:
--
--   UNAVAILABLE       — no identity assurance (default; preserves prior
--                       behaviour). Stage entry is blocked under pilot_active
--                       and production_active by the existing guard in
--                       t3a_open_stage_entry.
--
--   ATTESTATION_ONLY  — participant self-attests to identity + jurisdiction
--                       (a row in t3a_identity_assurance), mentor confirms
--                       in-session. Stage entry is permitted, but the audit
--                       trail says attestation-only so that when a real IDV
--                       provider is wired later, stricter mode replaces this
--                       one and every attestation-grade participant can be
--                       identified from the audit.
--
--   IDV_VERIFIED      — placeholder for a real IDV provider (Stripe
--                       Identity / Persona / Veriff). Not implemented in
--                       application code yet; policy returns AVAILABLE if
--                       set, so switching to this mode without the provider
--                       plumbing would be a silent weakening — don't.
--
-- The policy function returns 'AVAILABLE' for ATTESTATION_ONLY and
-- IDV_VERIFIED, 'IDENTITY_ASSURANCE_UNAVAILABLE' otherwise. The function
-- signature is unchanged so no caller needs to be rewritten.
--
-- Default is UNAVAILABLE, so this migration alone does not weaken the
-- stage-entry guard — advancing the mode requires a separate operational
-- decision, audited through t3a_env_capability.set_by / set_at / note.

ALTER TABLE public.t3a_env_capability
  ADD COLUMN IF NOT EXISTS identity_assurance_mode text NOT NULL DEFAULT 'UNAVAILABLE'
    CHECK (identity_assurance_mode IN ('UNAVAILABLE','ATTESTATION_ONLY','IDV_VERIFIED'));

CREATE OR REPLACE FUNCTION public.t3a_registration_identity_policy()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN (SELECT identity_assurance_mode FROM public.t3a_env_capability WHERE singleton = 1)
         IN ('ATTESTATION_ONLY','IDV_VERIFIED')
      THEN 'AVAILABLE'
    ELSE 'IDENTITY_ASSURANCE_UNAVAILABLE'
  END;
$function$;
