alter table public.discovery_decisions enable row level security;

alter table public.discovery_decisions
drop constraint if exists discovery_decisions_decision_check;

alter table public.discovery_decisions
add constraint discovery_decisions_decision_check
check (decision in ('like', 'dislike'));

delete from public.discovery_decisions current_decision
using public.discovery_decisions newer_decision
where current_decision.user_id = newer_decision.user_id
  and current_decision.target_user_id = newer_decision.target_user_id
  and (
    current_decision.created_at < newer_decision.created_at
    or (
      current_decision.created_at = newer_decision.created_at
      and current_decision.id::text < newer_decision.id::text
    )
  );

alter table public.discovery_decisions
drop constraint if exists discovery_decisions_user_target_unique;

alter table public.discovery_decisions
add constraint discovery_decisions_user_target_unique
unique (user_id, target_user_id);

drop policy if exists "Users can read own discovery decisions" on public.discovery_decisions;
drop policy if exists "Users can insert own discovery decisions" on public.discovery_decisions;
drop policy if exists "Users can update own discovery decisions" on public.discovery_decisions;
drop policy if exists "Users can delete own discovery decisions" on public.discovery_decisions;

create policy "Users can read own discovery decisions"
on public.discovery_decisions
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can insert own discovery decisions"
on public.discovery_decisions
for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update own discovery decisions"
on public.discovery_decisions
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete own discovery decisions"
on public.discovery_decisions
for delete
to authenticated
using (user_id = auth.uid());
