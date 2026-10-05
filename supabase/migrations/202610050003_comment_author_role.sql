-- Keep the author role snapshot so admin comments can show their badge in the thread.
alter table if exists public.comments
  add column if not exists author_role text not null default 'user';