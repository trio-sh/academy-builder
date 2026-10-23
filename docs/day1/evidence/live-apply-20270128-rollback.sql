-- Generated rollback. Run in one transaction.
begin;
set local search_path to public, extensions;
CREATE OR REPLACE FUNCTION public.t3a_consent_stamp_notice()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare n jsonb;
begin
  n := public.t3a_consent_notice();
  if (n->>'rendered')::boolean then
    new.consent_copy_version := n->>'notice_version';
    new.consent_copy_hash := n->>'notice_hash';
  end if;
  return new;
end $function$;
revoke all on function t3a_consent_stamp_notice() from public, anon, authenticated, service_role;
drop function if exists t3a_cr30_answer(uuid,text) cascade;
commit;
