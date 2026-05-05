alter table public.lifestyle_preferences
  add column if not exists cooking_tolerance_score integer,
  add column if not exists cohabitation_behavior_score integer;

do $$
declare
  column_name text;
  existing_constraint record;
  constraint_name text;
begin
  foreach column_name in array array[
    'sleep_behavior_score',
    'sleep_tolerance_score',
    'clean_behavior_score',
    'clean_tolerance_score',
    'cooking_behavior_score',
    'cooking_tolerance_score',
    'noise_behavior_score',
    'noise_tolerance_score',
    'guest_behavior_score',
    'guest_tolerance_score',
    'conflict_behavior_score',
    'conflict_tolerance_score',
    'cohabitation_behavior_score',
    'cohabitation_tolerance_score'
  ]
  loop
    for existing_constraint in
      select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace nsp on nsp.oid = rel.relnamespace
      where con.contype = 'c'
        and nsp.nspname = 'public'
        and rel.relname = 'lifestyle_preferences'
        and pg_get_constraintdef(con.oid) ilike '%' || column_name || '%'
    loop
      execute format(
        'alter table public.lifestyle_preferences drop constraint if exists %I',
        existing_constraint.conname
      );
    end loop;

    constraint_name := format('lifestyle_preferences_%s_check', column_name);

    execute format(
      'alter table public.lifestyle_preferences add constraint %I check (%I is null or %I between 0 and 4) not valid',
      constraint_name,
      column_name,
      column_name
    );
  end loop;
end $$;

comment on column public.lifestyle_preferences.cooking_tolerance_score is
  'Questionnaire score 0-4 for tolerance of a roommate who cooks frequently.';

comment on column public.lifestyle_preferences.cohabitation_behavior_score is
  'Questionnaire score 0-4 for current roommate interaction behavior.';
