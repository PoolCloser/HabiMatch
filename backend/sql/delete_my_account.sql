-- Paste into Supabase SQL Editor, then deploy the edge function (see below).

create or replace function public.delete_my_user_data()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_direct_conversation_ids uuid[];
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if to_regclass('public.discovery_decisions') is not null then
    delete from public.discovery_decisions
    where user_id = v_user_id
       or target_user_id = v_user_id;
  end if;

  if to_regclass('public.participants') is not null
     and to_regclass('public.conversations') is not null then
    select array_agg(distinct p.conversation_id)
    into v_direct_conversation_ids
    from public.participants p
    join public.conversations c on c.id = p.conversation_id
    where p.user_id = v_user_id
      and c.is_group = false;

    if to_regclass('public.messages') is not null then
      delete from public.messages
      where sender_id = v_user_id;
    end if;

    delete from public.participants
    where user_id = v_user_id;

    if v_direct_conversation_ids is not null then
      if to_regclass('public.messages') is not null then
        delete from public.messages
        where conversation_id = any (v_direct_conversation_ids);
      end if;

      delete from public.participants
      where conversation_id = any (v_direct_conversation_ids);

      delete from public.conversations
      where id = any (v_direct_conversation_ids);
    end if;
  end if;

  if to_regclass('public.lifestyle_preferences') is not null then
    delete from public.lifestyle_preferences
    where user_id = v_user_id;
  end if;

  if to_regclass('public.profiles') is not null then
    delete from public.profiles
    where id = v_user_id;
  end if;
end;
$$;

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
begin
  perform public.delete_my_user_data();

  delete from auth.users
  where id = v_user_id;

  if exists (select 1 from auth.users where id = v_user_id) then
    raise exception 'auth_user_delete_failed';
  end if;
end;
$$;

alter function public.delete_my_user_data() owner to postgres;
alter function public.delete_my_account() owner to postgres;

revoke all on function public.delete_my_user_data() from public;
revoke all on function public.delete_my_account() from public;

grant execute on function public.delete_my_user_data() to authenticated;
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.delete_my_user_data() to service_role;
grant execute on function public.delete_my_account() to service_role;
