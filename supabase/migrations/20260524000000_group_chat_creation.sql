-- Apply group chat support to databases that already ran the original messaging migration.

drop function if exists public.list_my_conversations();

create or replace function public.list_my_conversations()
returns table (
  conversation_id uuid,
  is_group boolean,
  target_user_id uuid,
  title text,
  avatar_url text,
  participant_count integer,
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
    c.is_group,
    direct_profile.user_id,
    case
      when c.is_group then coalesce(
        nullif(c.name, ''),
        nullif(group_profiles.names, ''),
        'Group chat'
      )
      else coalesce(direct_profile.full_name, 'Matched user')
    end,
    case when c.is_group then null else direct_profile.avatar_url end,
    participant_counts.count::integer,
    lm.body,
    lm.created_at
  from public.participants my_p
  join public.conversations c on c.id = my_p.conversation_id
  join lateral (
    select count(*) as count
    from public.participants p
    where p.conversation_id = c.id
  ) participant_counts on true
  left join lateral (
    select p.user_id, prof.full_name, prof.avatar_url
    from public.participants p
    join public.profiles prof on prof.id = p.user_id
    where p.conversation_id = c.id
      and p.user_id <> my_p.user_id
      and c.is_group = false
    limit 1
  ) direct_profile on true
  left join lateral (
    select string_agg(coalesce(nullif(prof.full_name, ''), 'Matched user'), ', ' order by prof.full_name) as names
    from public.participants p
    join public.profiles prof on prof.id = p.user_id
    where p.conversation_id = c.id
      and p.user_id <> my_p.user_id
      and c.is_group = true
  ) group_profiles on true
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

drop function if exists public.create_group_conversation(uuid[], text);

create or replace function public.create_group_conversation(
  participant_user_ids uuid[],
  group_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  conv_id uuid;
  distinct_user_ids uuid[];
  invalid_count integer;
begin
  select array_agg(distinct user_id)
  into distinct_user_ids
  from unnest(participant_user_ids) as selected(user_id)
  where user_id is not null
    and user_id <> auth.uid();

  if distinct_user_ids is null or array_length(distinct_user_ids, 1) < 2 then
    raise exception 'invalid_participants';
  end if;

  select count(*)
  into invalid_count
  from unnest(distinct_user_ids) as selected(user_id)
  where not public.is_mutual_match(selected.user_id);

  if invalid_count > 0 then
    raise exception 'not_mutual_match';
  end if;

  insert into public.conversations (is_group, name)
  values (true, nullif(trim(group_name), ''))
  returning id into conv_id;

  insert into public.participants (conversation_id, user_id)
  values (conv_id, auth.uid());

  insert into public.participants (conversation_id, user_id)
  select conv_id, selected.user_id
  from unnest(distinct_user_ids) as selected(user_id);

  return conv_id;
end;
$$;

grant execute on function public.list_my_conversations() to authenticated;
grant execute on function public.create_group_conversation(uuid[], text) to authenticated;
