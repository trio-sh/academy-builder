-- Rename t3a_rce_validate_render → t3a_rce_render_check to comply with
-- T3A-DEV-SPEC-002 §1.4 and AC-61: no identifier in platform code may
-- contain `validate`. The function body is unchanged; this is a pure
-- rename against the applied migration 20261092 (whose file text has
-- been updated to the new name so the CI vocabulary check passes).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 't3a_rce_validate_render'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.t3a_rce_validate_render(uuid, text, uuid, text, text) RENAME TO t3a_rce_render_check';
  END IF;
END $$;
