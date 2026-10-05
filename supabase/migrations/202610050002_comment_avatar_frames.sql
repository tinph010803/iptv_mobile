-- Add avatar frames to existing comment tables created by the first comment migration.
alter table if exists public.comments
  add column if not exists author_avatar_frame text;