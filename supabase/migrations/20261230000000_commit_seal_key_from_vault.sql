-- D-06 commit seal key custody. Supabase does not allow a custom setting to be stored persistently, so the key is held in Supabase Vault
-- (encrypted at rest, decrypted only by this routine) as the secret `t3a_commit_seal_key`. The key is generated INSIDE the database and is
-- never written to a table of ours, a migration or a log. Vault is authoritative; the session setting `t3a.commit_seal_key` is read only when
-- Vault holds nothing (the throwaway test database, which has no Vault). Rotation: add a new Vault secret under the same name; seals made
-- under an older key then read as `commit_seal_invalid`, so a rotation is a decision, not a routine (CR-170).
create or replace function public.t3a_commit_seal_key() returns text language plpgsql stable security definer set search_path = public as $fn$
declare k text;
begin
  if to_regclass('vault.decrypted_secrets') is not null then
    execute $q$ select decrypted_secret from vault.decrypted_secrets where name = 't3a_commit_seal_key' order by created_at desc limit 1 $q$ into k;
    if nullif(k, '') is not null then return k; end if;
  end if;
  return nullif(current_setting('t3a.commit_seal_key', true), '');
end $fn$;
revoke all on function public.t3a_commit_seal_key() from public, anon, authenticated;
