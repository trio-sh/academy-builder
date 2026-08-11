-- ─────────────────────────────────────────────────────────────
-- Add `last_seen` column to profiles (used by usePresence + online
-- indicators across all dashboards) and set up storage buckets +
-- policies for résumé and avatar uploads.
-- ─────────────────────────────────────────────────────────────

-- 1. `profiles.last_seen`
alter table public.profiles
  add column if not exists last_seen timestamptz;

create index if not exists profiles_last_seen_idx
  on public.profiles (last_seen desc);


-- 2. `resumes` bucket — public read, owner-only writes
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes',
  true,
  10 * 1024 * 1024,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "resumes: public read"     on storage.objects;
drop policy if exists "resumes: owner can insert" on storage.objects;
drop policy if exists "resumes: owner can update" on storage.objects;
drop policy if exists "resumes: owner can delete" on storage.objects;

create policy "resumes: public read"
on storage.objects for select to public
using ( bucket_id = 'resumes' );

create policy "resumes: owner can insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "resumes: owner can update"
on storage.objects for update to authenticated
using (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "resumes: owner can delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
);


-- 3. `avatars` bucket — public read, owner-only writes
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5 * 1024 * 1024,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars: public read"     on storage.objects;
drop policy if exists "avatars: owner can insert" on storage.objects;
drop policy if exists "avatars: owner can update" on storage.objects;
drop policy if exists "avatars: owner can delete" on storage.objects;

create policy "avatars: public read"
on storage.objects for select to public
using ( bucket_id = 'avatars' );

create policy "avatars: owner can insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatars: owner can update"
on storage.objects for update to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatars: owner can delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);


-- 4. Refresh PostgREST schema cache so the new column is visible immediately
notify pgrst, 'reload schema';
