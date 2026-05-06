drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Authenticated users can read completed profiles" on public.profiles;

create policy "Authenticated users can read completed profiles"
on public.profiles
for select
to authenticated
using (
  questionnaire_complete = true
  or id = auth.uid()
);
