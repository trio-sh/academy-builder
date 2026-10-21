do $$ declare a uuid; o uuid; h1 boolean; h2 boolean; msg text;
begin
  select account_id into a from public.t3a_account limit 1;
  insert into public.t3a_order(account_id, product_code, package_code, package_entitlements, access_starts_at, access_ends_at, price_amount, currency, tax_jurisdiction, founding_member_flag, payment_provider_ref)
    values (a, 'OBS', 'PKG-1', '{observation_engagements}', now() - interval '1 day', now() + interval '1 day', 1.00, 'CAD', 'CA-ON', false, 'probe') returning order_id into o;
  h1 := public.t3a_account_has_paid_access(a);
  insert into public.t3a_refund(order_id) values (o);
  h2 := public.t3a_account_has_paid_access(a);
  begin insert into public.t3a_lsa_snapshot(account_id) values (a); exception when others then msg := sqlerrm; end;
  raise exception 'PROBE access_before_refund=% after_refund=% lsa_write=%', h1, h2, left(msg, 40);
end $$;
