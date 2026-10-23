-- Ed25519 signature verification (RFC 8032, section 5.1.7) in plain SQL, so the database can check a signature made by a key it only knows the public half of.
-- Needed for CR-29 (a seal signed by a key pair): pgcrypto has no public key signatures, and no extension is assumed. Verification only; nothing here can sign.
-- Slow by design (big integer arithmetic in plpgsql); it runs once per seal checked, not per read.

create or replace function public.t3a_ed25519_modpow(b numeric, e numeric, m numeric) returns numeric language plpgsql immutable parallel safe as $fn$
declare r numeric := 1; x numeric := mod(b, m); k numeric := e;
begin
  while k > 0 loop
    if mod(k, 2) = 1 then r := mod(r * x, m); end if;
    x := mod(x * x, m);
    k := div(k, 2);
  end loop;
  return r;
end $fn$;

create or replace function public.t3a_ed25519_le(b bytea) returns numeric language plpgsql immutable parallel safe as $fn$
declare v numeric := 0; i int;
begin
  for i in reverse (length(b) - 1)..0 loop v := v * 256 + get_byte(b, i); end loop;
  return v;
end $fn$;

-- a point is an extended coordinate array [X, Y, Z, T]
create or replace function public.t3a_ed25519_add(a numeric[], b numeric[]) returns numeric[] language plpgsql immutable parallel safe as $fn$
declare p constant numeric := 57896044618658097711785492504343953926634992332820282019728792003956564819949; d2 constant numeric := mod(2 * 37095705934669439343138083508754565189542113879843219016388785533085940283555, 57896044618658097711785492504343953926634992332820282019728792003956564819949);
  aa numeric; bb numeric; cc numeric; dd numeric; e numeric; f numeric; g numeric; h numeric;
begin
  aa := mod((a[2] - a[1]) * (b[2] - b[1]), p); bb := mod((a[2] + a[1]) * (b[2] + b[1]), p);
  cc := mod(a[4] * d2 * b[4], p); dd := mod(2 * a[3] * b[3], p);
  e := bb - aa; f := dd - cc; g := dd + cc; h := bb + aa;
  return array[mod(e * f, p), mod(g * h, p), mod(f * g, p), mod(e * h, p)];
end $fn$;

create or replace function public.t3a_ed25519_mul(s numeric, pt numeric[]) returns numeric[] language plpgsql immutable parallel safe as $fn$
declare q numeric[] := array[0, 1, 1, 0]::numeric[]; n numeric[] := pt; k numeric := s;
begin
  while k > 0 loop
    if mod(k, 2) = 1 then q := public.t3a_ed25519_add(q, n); end if;
    n := public.t3a_ed25519_add(n, n);
    k := div(k, 2);
  end loop;
  return q;
end $fn$;

-- null when the 32 bytes are not a valid point
create or replace function public.t3a_ed25519_decode(b bytea) returns numeric[] language plpgsql immutable parallel safe as $fn$
declare p constant numeric := 57896044618658097711785492504343953926634992332820282019728792003956564819949; d constant numeric := 37095705934669439343138083508754565189542113879843219016388785533085940283555; i constant numeric := 19681161376707505956807079304988542015446066515923890162744021073123829784752;
  y numeric; sign int; x2 numeric; x numeric; u numeric; v numeric; raw bytea;
begin
  if b is null or length(b) <> 32 then return null; end if;
  sign := (get_byte(b, 31) >> 7) & 1;
  raw := set_byte(b, 31, get_byte(b, 31) & 127);
  y := public.t3a_ed25519_le(raw);
  if y >= p then return null; end if;
  u := mod(y * y - 1, p); v := mod(d * y * y + 1, p);
  x2 := mod(u * public.t3a_ed25519_modpow(v, p - 2, p), p);
  x := public.t3a_ed25519_modpow(x2, (p + 3) / 8, p);
  if mod(x * x - x2, p) <> 0 then x := mod(x * i, p); end if;
  if mod(x * x - x2, p) <> 0 then return null; end if;
  if x = 0 and sign = 1 then return null; end if;
  if mod(x, 2) <> sign then x := p - x; end if;
  return array[x, y, 1, mod(x * y, p)];
end $fn$;

create or replace function public.t3a_ed25519_verify(p_pub bytea, p_msg bytea, p_sig bytea) returns boolean
language plpgsql immutable parallel safe set search_path = public, extensions as $fn$
declare p constant numeric := 57896044618658097711785492504343953926634992332820282019728792003956564819949; l constant numeric := 7237005577332262213973186563042994240857116359379907606001950938285454250989;
  bpt constant numeric[] := array[15112221349535400772501151409588531511454012693041857206046113283949847762202, 46316835694926478169428394003475163141307993866256225615783033603165251855960, 1, mod(15112221349535400772501151409588531511454012693041857206046113283949847762202 * 46316835694926478169428394003475163141307993866256225615783033603165251855960, 57896044618658097711785492504343953926634992332820282019728792003956564819949)]::numeric[];
  rb bytea; s numeric; a numeric[]; r numeric[]; h numeric; lhs numeric[]; rhs numeric[];
begin
  if p_pub is null or p_msg is null or p_sig is null or length(p_pub) <> 32 or length(p_sig) <> 64 then return false; end if;
  rb := substring(p_sig from 1 for 32);
  s := public.t3a_ed25519_le(substring(p_sig from 33 for 32));
  if s >= l then return false; end if;
  a := public.t3a_ed25519_decode(p_pub); r := public.t3a_ed25519_decode(rb);
  if a is null or r is null then return false; end if;
  h := mod(public.t3a_ed25519_le(extensions.digest(rb || p_pub || p_msg, 'sha512')), l);
  lhs := public.t3a_ed25519_mul(s, bpt);
  rhs := public.t3a_ed25519_add(r, public.t3a_ed25519_mul(h, a));
  return mod(lhs[1] * rhs[3] - rhs[1] * lhs[3], p) = 0 and mod(lhs[2] * rhs[3] - rhs[2] * lhs[3], p) = 0;
end $fn$;

revoke all on function public.t3a_ed25519_modpow(numeric, numeric, numeric), public.t3a_ed25519_le(bytea), public.t3a_ed25519_add(numeric[], numeric[]),
  public.t3a_ed25519_mul(numeric, numeric[]), public.t3a_ed25519_decode(bytea), public.t3a_ed25519_verify(bytea, bytea, bytea) from public, anon, authenticated;
grant execute on function public.t3a_ed25519_verify(bytea, bytea, bytea) to authenticated, service_role;
