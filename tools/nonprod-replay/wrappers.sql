create or replace function public.digest(text, text) returns bytea language sql immutable parallel safe as 'select extensions.digest($1,$2)';
create or replace function public.digest(bytea, text) returns bytea language sql immutable parallel safe as 'select extensions.digest($1,$2)';
create or replace function public.gen_random_bytes(integer) returns bytea language sql volatile as 'select extensions.gen_random_bytes($1)';
create or replace function public.uuid_generate_v4() returns uuid language sql volatile as 'select gen_random_uuid()';
