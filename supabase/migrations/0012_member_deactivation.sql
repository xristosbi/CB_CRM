-- Member deletion fallback: hard-deleting a teammate's auth.users row is
-- the normal path (it cascades to profiles via "on delete cascade", and
-- every table that references profiles.id already uses "on delete set
-- null" — see 0008_users_assignment.sql — so no orphans and no extra
-- cleanup is needed there). This column only backs the fallback for when
-- a hard delete can't go through: the account is blocked from login
-- (banned via the Supabase Admin API) and hidden from profile lists
-- instead of being removed outright.

begin;

alter table public.profiles
  add column if not exists is_active boolean not null default true;

commit;
