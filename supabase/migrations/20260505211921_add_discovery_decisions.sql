create table if not exists public.discovery_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  target_user_id uuid not null references auth.users (id) on delete cascade,
  decision text not null check (decision in ('pass', 'like')),
  created_at timestamptz not null default now(),
  unique (user_id, target_user_id)
);

alter table public.discovery_decisions enable row level security;

drop policy if exists "Users can insert own discovery decisions" on public.discovery_decisions;
drop policy if exists "Users can read own discovery decisions" on public.discovery_decisions;
drop policy if exists "Users can update own discovery decisions" on public.discovery_decisions;

create policy "Users can insert own discovery decisions"
  on public.discovery_decisions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can read own discovery decisions"
  on public.discovery_decisions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can update own discovery decisions"
  on public.discovery_decisions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on table public.discovery_decisions to authenticated;
