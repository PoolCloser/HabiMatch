-- Profile photo bucket + storage RLS for mobile uploads (path: {user_id}/...).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read profile photos" on storage.objects;
drop policy if exists "Authenticated users can read profile photos" on storage.objects;
drop policy if exists "Users can read own profile photos" on storage.objects;
drop policy if exists "Anyone can read profile photos" on storage.objects;
drop policy if exists "Users can upload own profile photos" on storage.objects;
drop policy if exists "Users can update own profile photos" on storage.objects;
drop policy if exists "Users can delete own profile photos" on storage.objects;

create policy "Anyone can read profile photos"
on storage.objects
for select
to public
using (bucket_id = 'profile-photos');

create policy "Users can upload own profile photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update own profile photos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete own profile photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
