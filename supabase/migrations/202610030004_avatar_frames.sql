-- Persist the selected avatar frame for each profile.
alter table public.profiles
  add column if not exists avatar_frame text;
