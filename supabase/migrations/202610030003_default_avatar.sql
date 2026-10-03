-- Give every newly created profile the app's default avatar.
alter table public.profiles
  alter column avatar set default 'https://i.ibb.co/27XctfvC/02.jpg';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, username, display_name, avatar)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(new.raw_user_meta_data->>'username', ''), 'user_' || left(new.id::text, 8)),
    nullif(new.raw_user_meta_data->>'display_name', ''),
    coalesce(nullif(new.raw_user_meta_data->>'avatar', ''), 'https://i.ibb.co/27XctfvC/02.jpg')
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;
