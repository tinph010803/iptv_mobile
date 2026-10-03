-- User-owned data for Supabase Auth, favorites, and watch history.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  username text not null unique,
  display_name text,
  avatar text,
  gender text not null default 'other' check (gender in ('male', 'female', 'other')),
  role text not null default 'user' check (role in ('user', 'admin', 'moderator')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_id text not null default '',
  movie_slug text not null,
  movie_name text not null default '',
  origin_name text not null default '',
  poster jsonb not null default '{}'::jsonb,
  thumb jsonb not null default '{}'::jsonb,
  episode_current text,
  created_at timestamptz not null default now(),
  unique (user_id, movie_slug)
);

create table if not exists public.watch_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_id text not null default '',
  movie_slug text not null,
  movie_title text not null default '',
  poster_url text not null default '',
  episode_name text not null default 'Tập 1',
  server_label text not null default '',
  time numeric not null default 0,
  duration numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, movie_slug, episode_name)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, username, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(new.raw_user_meta_data->>'username', ''), 'user_' || left(new.id::text, 8)),
    nullif(new.raw_user_meta_data->>'display_name', '')
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.favorites enable row level security;
alter table public.watch_history enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Users can manage own favorites" on public.favorites;
create policy "Users can manage own favorites" on public.favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can manage own watch history" on public.watch_history;
create policy "Users can manage own watch history" on public.watch_history for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists favorites_user_created_idx on public.favorites (user_id, created_at desc);
create index if not exists watch_history_user_updated_idx on public.watch_history (user_id, updated_at desc);
