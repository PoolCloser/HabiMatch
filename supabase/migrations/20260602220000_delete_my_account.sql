-- Removes the signed-in user's app data and auth record (security definer; no dashboard toggle).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, storage, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_direct_conversation_ids uuid[];
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select array_agg(distinct p.conversation_id)
  into v_direct_conversation_ids
  from public.participants p
  join public.conversations c on c.id = p.conversation_id
  where p.user_id = v_user_id
    and c.is_group = false;

  delete from public.messages
  where sender_id = v_user_id;

  delete from public.participants
  where user_id = v_user_id;

  if v_direct_conversation_ids is not null then
    delete from public.messages
    where conversation_id = any (v_direct_conversation_ids);

    delete from public.participants
    where conversation_id = any (v_direct_conversation_ids);

    delete from public.conversations
    where id = any (v_direct_conversation_ids);
  end if;

  delete from public.lifestyle_preferences
  where user_id = v_user_id;

  delete from public.profiles
  where id = v_user_id;

  delete from storage.objects
  where bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = v_user_id::text;

  delete from auth.users
  where id = v_user_id;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
