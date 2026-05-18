-- Returns true if the calling user and the given target user have both liked each other.
create or replace function public.check_mutual_match(target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.discovery_decisions outgoing
    join public.discovery_decisions incoming
      on incoming.user_id = outgoing.target_user_id
      and incoming.target_user_id = outgoing.user_id
    where outgoing.user_id = auth.uid()
      and outgoing.target_user_id = check_mutual_match.target_user_id
      and outgoing.decision = 'like'
      and incoming.decision = 'like'
  );
$$;

grant execute on function public.check_mutual_match(uuid) to authenticated;
