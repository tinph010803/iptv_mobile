-- Comments, nested replies, votes, and admin pinning for movie detail pages.
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  movie_slug text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 1000),
  is_spoiler boolean not null default false,
  is_pinned boolean not null default false,
  author_name text not null default 'Người dùng',
  author_role text not null default 'user',
  author_avatar text,
  author_avatar_frame text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.comments
  add column if not exists author_avatar_frame text;

create table if not exists public.comment_votes (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  vote smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index if not exists comments_movie_idx on public.comments (movie_slug, is_pinned desc, created_at desc);
create index if not exists comments_parent_idx on public.comments (parent_id);
create index if not exists comment_votes_comment_idx on public.comment_votes (comment_id);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.validate_comment_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id <> old.user_id or new.movie_slug <> old.movie_slug or new.parent_id is distinct from old.parent_id then
    raise exception 'Comment ownership and location cannot be changed';
  end if;

  if not public.is_admin() and new.is_pinned is distinct from old.is_pinned then
    raise exception 'Only admins can pin comments';
  end if;

  if new.parent_id is not null and not exists (
    select 1 from public.comments parent
    where parent.id = new.parent_id and parent.movie_slug = new.movie_slug
  ) then
    raise exception 'Reply must belong to the same movie';
  end if;

  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists comments_validate_change on public.comments;
create trigger comments_validate_change
before update on public.comments
for each row execute procedure public.validate_comment_change();

create or replace function public.validate_comment_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id <> auth.uid() then
    raise exception 'Cannot create a comment for another user';
  end if;
  if new.is_pinned then
    raise exception 'New comments cannot be pinned';
  end if;
  if new.parent_id is not null and not exists (
    select 1 from public.comments parent
    where parent.id = new.parent_id and parent.movie_slug = new.movie_slug
  ) then
    raise exception 'Reply must belong to the same movie';
  end if;
  return new;
end;
$$;

drop trigger if exists comments_validate_insert on public.comments;
create trigger comments_validate_insert
before insert on public.comments
for each row execute procedure public.validate_comment_insert();

alter table public.comments enable row level security;
alter table public.comment_votes enable row level security;

drop policy if exists "Anyone can read comments" on public.comments;
create policy "Anyone can read comments" on public.comments for select using (true);
drop policy if exists "Users can create own comments" on public.comments;
create policy "Users can create own comments" on public.comments for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "Users and admins can update comments" on public.comments;
create policy "Users and admins can update comments" on public.comments for update to authenticated
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());
drop policy if exists "Users and admins can delete comments" on public.comments;
create policy "Users and admins can delete comments" on public.comments for delete to authenticated
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Anyone can read comment votes" on public.comment_votes;
create policy "Anyone can read comment votes" on public.comment_votes for select using (true);
drop policy if exists "Users can create own comment votes" on public.comment_votes;
create policy "Users can create own comment votes" on public.comment_votes for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "Users can update own comment votes" on public.comment_votes;
create policy "Users can update own comment votes" on public.comment_votes for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own comment votes" on public.comment_votes;
create policy "Users can delete own comment votes" on public.comment_votes for delete to authenticated
  using (auth.uid() = user_id);

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;
