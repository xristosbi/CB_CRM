-- Calendar events (step 1: in-CRM calendar only). google_event_id is
-- reserved for step 2 (two-way Google Calendar sync via Make.com) — unique
-- when set, so an inbound upsert from Make can match an existing row
-- without duplicating it, but null for every event created directly in the
-- CRM today.

begin;

create type calendar_event_type as enum ('sales_call', 'setting_call', 'follow_up', 'other');

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  type calendar_event_type not null default 'other',
  contact_id uuid references public.contacts (id) on delete set null,
  opportunity_id uuid references public.opportunities (id) on delete set null,
  notes text,
  google_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index calendar_events_starts_at_idx on public.calendar_events (starts_at);
create index calendar_events_contact_id_idx on public.calendar_events (contact_id);

create unique index calendar_events_google_event_id_idx
  on public.calendar_events (google_event_id)
  where google_event_id is not null;

alter table public.calendar_events enable row level security;

create policy "authenticated full access" on public.calendar_events
  for all to authenticated using (true) with check (true);

alter publication supabase_realtime add table public.calendar_events;

commit;
