-- CB CRM — Phase 1 schema
-- Contacts, pipelines/stages, opportunities, activity log, payments, tasks.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type activity_type as enum ('call', 'note', 'stage_change', 'fathom_summary');
create type payment_status as enum ('pending', 'paid', 'cancelled');

-- ---------------------------------------------------------------------------
-- contacts
-- ---------------------------------------------------------------------------

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  website text,
  source text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index contacts_name_idx on public.contacts using gin (to_tsvector('simple', name));
create index contacts_tags_idx on public.contacts using gin (tags);

-- ---------------------------------------------------------------------------
-- pipelines
-- ---------------------------------------------------------------------------

create table public.pipelines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- pipeline_stages
-- ---------------------------------------------------------------------------

create table public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references public.pipelines (id) on delete cascade,
  name text not null,
  position int not null,
  -- Marks the stage that counts as "won" (e.g. paid) for conversion-rate analytics.
  is_won boolean not null default false,
  created_at timestamptz not null default now()
);

create index pipeline_stages_pipeline_id_position_idx
  on public.pipeline_stages (pipeline_id, position);

-- ---------------------------------------------------------------------------
-- opportunities
-- ---------------------------------------------------------------------------

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  pipeline_id uuid not null references public.pipelines (id) on delete cascade,
  stage_id uuid not null references public.pipeline_stages (id) on delete restrict,
  value numeric,
  campaign text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index opportunities_contact_id_idx on public.opportunities (contact_id);
create index opportunities_pipeline_id_stage_id_idx on public.opportunities (pipeline_id, stage_id);

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger opportunities_set_updated_at
  before update on public.opportunities
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- activity_log
-- ---------------------------------------------------------------------------

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  opportunity_id uuid references public.opportunities (id) on delete set null,
  type activity_type not null,
  content text,
  created_at timestamptz not null default now()
);

create index activity_log_contact_id_idx on public.activity_log (contact_id);
create index activity_log_opportunity_id_idx on public.activity_log (opportunity_id);
create index activity_log_created_at_idx on public.activity_log (created_at desc);

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  amount numeric not null,
  status payment_status not null default 'pending',
  invoice_ref text,
  notes text,
  created_at timestamptz not null default now()
);

create index payments_contact_id_idx on public.payments (contact_id);
create index payments_status_idx on public.payments (status);

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  title text not null,
  due_at timestamptz,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index tasks_contact_id_idx on public.tasks (contact_id);
create index tasks_due_at_idx on public.tasks (due_at);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Two trusted internal users (owner + partner), both with full access to
-- everything. No per-row ownership model in phase 1 — any authenticated
-- user can read/write any row.
-- ---------------------------------------------------------------------------

alter table public.contacts enable row level security;
alter table public.pipelines enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.opportunities enable row level security;
alter table public.activity_log enable row level security;
alter table public.payments enable row level security;
alter table public.tasks enable row level security;

create policy "authenticated full access" on public.contacts
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on public.pipelines
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on public.pipeline_stages
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on public.opportunities
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on public.activity_log
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on public.payments
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on public.tasks
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

alter table public.opportunities replica identity full;
alter table public.activity_log replica identity full;

alter publication supabase_realtime add table public.opportunities;
alter publication supabase_realtime add table public.activity_log;
