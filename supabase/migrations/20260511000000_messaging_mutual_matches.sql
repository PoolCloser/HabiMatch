-- Mutual-match gated 1:1 messaging helpers

create or replace function public.is_mutual_match(other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.discovery_decisions d1
    join public.discovery_decisions d2
      on d1.user_id = d2.target_user_id
     and d1.target_user_id = d2.user_id
    where d1.user_id = auth.uid()
      and d1.target_user_id = other_user_id
      and d1.decision = 'like'
      and d2.decision = 'like'
  );
$$;

create or replace function public.list_my_mutual_matches()
returns table (
  matched_user_id uuid,
  full_name text,
  avatar_url text,
  matched_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    d1.target_user_id,
    p.full_name,
    p.avatar_url,
    greatest(d1.created_at, d2.created_at)
  from public.discovery_decisions d1
  join public.discovery_decisions d2
    on d1.user_id = d2.target_user_id
   and d1.target_user_id = d2.user_id
  join public.profiles p on p.id = d1.target_user_id
  where d1.user_id = auth.uid()
    and d1.decision = 'like'
    and d2.decision = 'like'
  order by greatest(d1.created_at, d2.created_at) desc;
$$;

create or replace function public.get_or_create_direct_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  conv_id uuid;
begin
  if other_user_id is null or other_user_id = auth.uid() then
    raise exception 'invalid_other_user';
  end if;

  if not public.is_mutual_match(other_user_id) then
    raise exception 'not_mutual_match';
  end if;

  select c.id into conv_id
  from public.conversations c
  where c.is_group = false
    and exists (
      select 1 from public.participants p
      where p.conversation_id = c.id and p.user_id = auth.uid()
    )
    and exists (
      select 1 from public.participants p
      where p.conversation_id = c.id and p.user_id = other_user_id
    )
  limit 1;

  if conv_id is not null then
    return conv_id;
  end if;

  insert into public.conversations (is_group) values (false) returning id into conv_id;
  insert into public.participants (conversation_id, user_id) values (conv_id, auth.uid());
  insert into public.participants (conversation_id, user_id) values (conv_id, other_user_id);
  return conv_id;
end;
$$;

create or replace function public.list_my_conversations()
returns table (
  conversation_id uuid,
  other_user_id uuid,
  other_full_name text,
  other_avatar_url text,
  last_message_body text,
  last_message_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    other_p.user_id,
    prof.full_name,
    prof.avatar_url,
    lm.body,
    lm.created_at
  from public.participants my_p
  join public.conversations c on c.id = my_p.conversation_id and c.is_group = false
  join public.participants other_p
    on other_p.conversation_id = c.id and other_p.user_id <> my_p.user_id
  join public.profiles prof on prof.id = other_p.user_id
  left join lateral (
    select m.body, m.created_at
    from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) lm on true
  where my_p.user_id = auth.uid()
  order by coalesce(lm.created_at, c.updated_at) desc;
$$;

create or replace function public.touch_conversation_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation
  after insert on public.messages
  for each row
  execute function public.touch_conversation_on_message();

grant execute on function public.is_mutual_match(uuid) to authenticated;
grant execute on function public.list_my_mutual_matches() to authenticated;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;
grant execute on function public.list_my_conversations() to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end $$;
