-- Users / Team: per-user profiles, lead assignment, and activity
-- attribution. Written to be safe to re-run (every statement is
-- if-not-exists / create-or-replace / drop-if-exists-then-create), since a
-- migration this size is more likely to be re-applied after a partial run.
--
-- Role ('admin' | 'setter') is an internal authorization primitive only —
-- it must never be rendered as text anywhere in the UI. The UI only ever
-- shows display_name (e.g. "CB", "ΓΠ").
--
-- This migration intentionally does NOT touch RLS on payments/expenses or
-- any other existing table — that lockdown is a separate, later migration
-- (0009), done only after the admin/setter split here is verified to work.

begin;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  display_name text,
  email text,
  role text not null default 'setter' check (role in ('admin', 'setter')),
  color text,
  created_at timestamptz not null default now()
);

alter table public.profiles replica identity full;

-- ---------------------------------------------------------------------------
-- Auto-create a profile for every new auth user.
--
-- security definer + a pinned search_path so the function can't be tricked
-- by a malicious search_path into writing somewhere other than
-- public.profiles (standard Supabase hardening for trigger functions).
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
  v_display_name text;
  v_role text;
  v_parts text[];
  v_initials text;
begin
  v_full_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    split_part(new.email, '@', 1)
  );

  v_role := coalesce(new.raw_user_meta_data ->> 'role', 'setter');
  if v_role not in ('admin', 'setter') then
    v_role := 'setter';
  end if;

  v_display_name := new.raw_user_meta_data ->> 'display_name';
  if v_display_name is null or trim(v_display_name) = '' then
    v_parts := regexp_split_to_array(trim(v_full_name), '\s+');
    if array_length(v_parts, 1) >= 2 then
      v_initials := upper(substr(v_parts[1], 1, 1) || substr(v_parts[array_length(v_parts, 1)], 1, 1));
    else
      v_initials := upper(substr(v_parts[1], 1, 2));
    end if;
    v_display_name := v_initials;
  end if;

  insert into public.profiles (id, full_name, display_name, email, role)
  values (new.id, v_full_name, v_display_name, new.email, v_role)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: every auth user that predates this migration gets a profile.
-- All of them are the existing owner account(s) today, so they all become
-- admin with display_name "CB" — a real second account (the partner) only
-- ever gets created AFTER this migration, via the trigger above, and
-- defaults to 'setter'.
insert into public.profiles (id, full_name, display_name, email, role)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1)),
  'CB',
  u.email,
  'admin'
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- is_admin() — lets an RLS policy check the caller's role without the
-- policy subquerying profiles directly (which would recurse into itself).
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- RLS on profiles
--
-- Every authenticated user can read every profile (names/avatars need to
-- show up everywhere in the UI). A user can only update their own row,
-- unless they're an admin. No insert/delete policy for `authenticated` at
-- all — new rows only ever come from the trigger above (security definer)
-- or the admin API route (service-role client, which bypasses RLS).
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

drop policy if exists "profiles select all authenticated" on public.profiles;
create policy "profiles select all authenticated" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles update own or admin" on public.profiles;
create policy "profiles update own or admin" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- Assignment + attribution columns on existing tables
-- ---------------------------------------------------------------------------

alter table public.opportunities
  add column if not exists assigned_to uuid references public.profiles (id) on delete set null;
create index if not exists opportunities_assigned_to_idx on public.opportunities (assigned_to);

alter table public.activity_log
  add column if not exists user_id uuid references public.profiles (id) on delete set null;
create index if not exists activity_log_user_id_idx on public.activity_log (user_id);

alter table public.calendar_events
  add column if not exists assigned_to uuid references public.profiles (id) on delete set null;
create index if not exists calendar_events_assigned_to_idx on public.calendar_events (assigned_to);

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;

commit;
