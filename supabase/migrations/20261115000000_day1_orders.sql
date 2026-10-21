-- Day 1 Domain L: orders, entitlements and refunds (T3A-DEV-DAY1-001 v1.3). GENERATED from tools/day1/plans/domain_l.py
-- and tools/day1/plans/domain_l_logic.sql. Do not edit by hand; regenerate with
--   python3 tools/day1/generate_domain_migration.py L      (verify with --check)
-- Dictionary sha256: 2595989efe30ac69a0b90f774a767e9d1d6ea4555a3b8f8a65d658c0a1f5e513
-- Maps 17 fields into t3a_field_physical_map.

-- shared helpers for Day 1 domain tables (idempotent)
create or replace function public.t3a_deny_mutation() returns trigger language plpgsql as $$
begin raise exception 'T3A_APPEND_ONLY: updates and deletes are refused; write a superseding record'; end $$;

create or replace function public.t3a_refuse_column_change() returns trigger language plpgsql as $$
declare c text;
begin
  foreach c in array tg_argv loop
    if to_jsonb(new)->c is distinct from to_jsonb(old)->c then
      raise exception 'T3A_IMMUTABLE_COLUMN: % cannot change after it is written', c;
    end if;
  end loop;
  return new;
end $$;

create or replace function public.t3a_capture_state_fill() returns trigger language plpgsql as $$
declare pair text; col text; cs text;
begin
  foreach pair in array tg_argv loop
    col := split_part(pair, ':', 1); cs := split_part(pair, ':', 2);
    if to_jsonb(new)->>col is not null then
      new := jsonb_populate_record(new, jsonb_build_object(cs, 'captured'));
    elsif to_jsonb(new)->>cs = 'captured' then
      new := jsonb_populate_record(new, jsonb_build_object(cs, 'not_captured'));
    end if;
  end loop;
  return new;
end $$;

create or replace function public.t3a_socket_closed() returns trigger language plpgsql as $$
begin raise exception 'T3A_SOCKET_ROUTE_CLOSED: % is a SOCKET structure; capture is not enabled', tg_table_name; end $$;

create table if not exists public.t3a_order (
  order_id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  product_code text not null,
  package_code text not null,
  package_entitlements text[] not null,
  purchased_at timestamptz not null default now(),
  access_starts_at timestamptz not null,
  access_ends_at timestamptz not null,
  price_amount numeric(12,2) not null,
  currency text not null,
  tax_jurisdiction text not null,
  founding_member_flag boolean not null,
  payment_provider_ref text not null,
  foreign key (account_id) references public.t3a_account(account_id),
  check (product_code ~ '^[A-Za-z0-9_.:-]{1,64}$'),
  check (package_code ~ '^[A-Za-z0-9_.:-]{1,64}$'),
  check (package_entitlements <@ array['observation_engagements', 'mentor_hour_allocation', 'access_duration']),
  check (price_amount >= 0),
  check (currency ~ '^[A-Z]{3}$'),
  check (tax_jurisdiction ~ '^[A-Z]{2}(-[A-Z0-9]{1,3})?$'),
  check (payment_provider_ref ~ '^[A-Za-z0-9_.:-]{1,128}$'),
  check (access_ends_at > access_starts_at)
);

comment on table public.t3a_order is 'Domain L orders. Insert only; a refund is a row in t3a_refund. An order never creates, changes or weighs evidence.';

drop trigger if exists t3a_append_only on public.t3a_order;
create trigger t3a_append_only before update or delete on public.t3a_order for each row execute function public.t3a_deny_mutation();

alter table public.t3a_order enable row level security;
revoke all on public.t3a_order from anon, authenticated;

grant select (order_id, account_id, product_code, package_code, package_entitlements, purchased_at, access_starts_at, access_ends_at, price_amount, currency, tax_jurisdiction, founding_member_flag, payment_provider_ref) on public.t3a_order to authenticated;

drop policy if exists t3a_order_own_read on public.t3a_order;
create policy t3a_order_own_read on public.t3a_order for select to authenticated using (account_id = auth.uid());

create table if not exists public.t3a_refund (
  order_id uuid not null references public.t3a_order(order_id),
  refund_id uuid primary key default gen_random_uuid(),
  refunded_at timestamptz not null default now()
);

comment on table public.t3a_refund is 'Domain L refunds: one row per refund, pointing at its order.';

drop trigger if exists t3a_append_only on public.t3a_refund;
create trigger t3a_append_only before update or delete on public.t3a_refund for each row execute function public.t3a_deny_mutation();

alter table public.t3a_refund enable row level security;
revoke all on public.t3a_refund from anon, authenticated;

create table if not exists public.t3a_subscription_socket (
  order_id uuid,
  subscription_plan text,
  renewal_at timestamptz,
  cancellation_reason_code text
);

comment on table public.t3a_subscription_socket is 'Domain L SOCKET: subscription plan, renewal and cancellation. Structure only; every write is refused.';

drop trigger if exists t3a_append_only on public.t3a_subscription_socket;
create trigger t3a_append_only before update or delete on public.t3a_subscription_socket for each row execute function public.t3a_deny_mutation();

drop trigger if exists t3a_socket_closed on public.t3a_subscription_socket;
create trigger t3a_socket_closed before insert or update on public.t3a_subscription_socket for each row execute function public.t3a_socket_closed();

alter table public.t3a_subscription_socket enable row level security;
revoke all on public.t3a_subscription_socket from anon, authenticated;

insert into public.t3a_field_physical_map (dictionary_version, qualified_name, mapping_class, physical_table, physical_column, capture_state_column, confirmed_by, confirmed_at, note)
values
  ('1.3', 'L.order_id', 'M5', 't3a_order', 'order_id', null, 'day1-domain-L-generator', now(), null),
  ('1.3', 'L.account_id', 'M5', 't3a_order', 'account_id', null, 'day1-domain-L-generator', now(), null),
  ('1.3', 'L.product_code', 'M5', 't3a_order', 'product_code', null, 'day1-domain-L-generator', now(), null),
  ('1.3', 'L.package_code', 'M5', 't3a_order', 'package_code', null, 'day1-domain-L-generator', now(), null),
  ('1.3', 'L.package_entitlements', 'M5', 't3a_order', 'package_entitlements', null, 'day1-domain-L-generator', now(), null),
  ('1.3', 'L.purchased_at', 'M5', 't3a_order', 'purchased_at', null, 'day1-domain-L-generator', now(), null),
  ('1.3', 'L.access_starts_at', 'M5', 't3a_order', 'access_starts_at', null, 'day1-domain-L-generator', now(), null),
  ('1.3', 'L.access_ends_at', 'M5', 't3a_order', 'access_ends_at', null, 'day1-domain-L-generator', now(), null),
  ('1.3', 'L.price_amount', 'M5', 't3a_order', 'price_amount', null, 'day1-domain-L-generator', now(), null),
  ('1.3', 'L.currency', 'M5', 't3a_order', 'currency', null, 'day1-domain-L-generator', now(), null),
  ('1.3', 'L.tax_jurisdiction', 'M5', 't3a_order', 'tax_jurisdiction', null, 'day1-domain-L-generator', now(), null),
  ('1.3', 'L.founding_member_flag', 'M5', 't3a_order', 'founding_member_flag', null, 'day1-domain-L-generator', now(), null),
  ('1.3', 'L.payment_provider_ref', 'M5', 't3a_order', 'payment_provider_ref', null, 'day1-domain-L-generator', now(), null),
  ('1.3', 'L.refund_id', 'M5', 't3a_refund', 'refund_id', null, 'day1-domain-L-generator', now(), null),
  ('1.3', 'L.subscription_plan', 'M5', 't3a_subscription_socket', 'subscription_plan', null, 'day1-domain-L-generator', now(), null),
  ('1.3', 'L.renewal_at', 'M5', 't3a_subscription_socket', 'renewal_at', null, 'day1-domain-L-generator', now(), null),
  ('1.3', 'L.cancellation_reason_code', 'M5', 't3a_subscription_socket', 'cancellation_reason_code', null, 'day1-domain-L-generator', now(), null)
on conflict (dictionary_version, qualified_name) do nothing;

-- ---------------------------------------------------------------------------------------------
-- Domain L behaviour (hand written; tables above are generated)
-- ---------------------------------------------------------------------------------------------

-- Is this account inside a paid access window now? An order grants access and nothing else: it never touches a report, a measure or a Stage.
create or replace function public.t3a_account_has_paid_access(p_account uuid, p_at timestamptz default now()) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.t3a_order o where o.account_id = p_account and o.access_starts_at <= p_at and o.access_ends_at > p_at
                   and not exists (select 1 from public.t3a_refund r where r.order_id = o.order_id))
$$;
revoke all on function public.t3a_account_has_paid_access(uuid, timestamptz) from public, anon;
grant execute on function public.t3a_account_has_paid_access(uuid, timestamptz) to authenticated, service_role;
