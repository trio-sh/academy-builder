-- Rollback of 20261230000000_commit_seal_key_from_vault.sql: the routine reads only the session setting again. The Vault secret is removed separately (delete from vault.secrets where name = 't3a_commit_seal_key'); seals already written under it would then read as commit_seal_invalid.
create or replace function public.t3a_commit_seal_key() returns text language sql stable as $fn$
  select nullif(current_setting('t3a.commit_seal_key', true), '')
$fn$;
revoke all on function public.t3a_commit_seal_key() from public, anon, authenticated;
