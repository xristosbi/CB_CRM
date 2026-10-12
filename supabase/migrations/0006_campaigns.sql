-- Campaigns: cyclable "batches" of leads within a pipeline. Switching to a
-- new campaign gives a clean board (new leads land in the new campaign)
-- without touching old leads at all — they stay exactly where they are,
-- viewable by selecting their campaign again. No archiving, no bulk
-- updates to existing rows beyond the one-time backfill below.

begin;

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references public.pipelines (id) on delete cascade,
  name text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create index campaigns_pipeline_id_idx on public.campaigns (pipeline_id);

-- At most one active campaign per pipeline: a partial unique index on
-- pipeline_id, scoped to is_active rows only.
create unique index campaigns_one_active_per_pipeline_idx
  on public.campaigns (pipeline_id)
  where is_active;

alter table public.campaigns enable row level security;

create policy "authenticated full access" on public.campaigns
  for all to authenticated using (true) with check (true);

alter table public.opportunities
  add column campaign_id uuid references public.campaigns (id) on delete set null;

create index opportunities_campaign_id_idx on public.opportunities (campaign_id);

-- Backfill: every pipeline gets one active "Αρχικό" campaign (including
-- pipelines with no opportunities yet), and every existing opportunity is
-- pointed at its pipeline's new campaign.
insert into public.campaigns (pipeline_id, name, is_active)
select id, 'Αρχικό', true from public.pipelines;

update public.opportunities o
set campaign_id = c.id
from public.campaigns c
where c.pipeline_id = o.pipeline_id
  and c.name = 'Αρχικό';

-- ---------------------------------------------------------------------------
-- Atomic campaign switching
--
-- Both the UI's "+ Νέο campaign" and "Κάνε ενεργό" actions need "deactivate
-- the old active campaign, activate another" to happen as one atomic step —
-- if either half fails, neither should apply. A single function call is a
-- single transaction in Postgres, so a mid-function error rolls back
-- everything it did, with no manual two-step rollback needed on the client.
-- ---------------------------------------------------------------------------

create or replace function public.create_campaign_and_activate(p_pipeline_id uuid, p_name text)
returns public.campaigns
language plpgsql
security invoker
as $$
declare
  v_campaign public.campaigns;
begin
  update public.campaigns
  set is_active = false
  where pipeline_id = p_pipeline_id and is_active = true;

  insert into public.campaigns (pipeline_id, name, is_active)
  values (p_pipeline_id, p_name, true)
  returning * into v_campaign;

  return v_campaign;
end;
$$;

create or replace function public.activate_campaign(p_campaign_id uuid)
returns public.campaigns
language plpgsql
security invoker
as $$
declare
  v_pipeline_id uuid;
  v_campaign public.campaigns;
begin
  select pipeline_id into v_pipeline_id from public.campaigns where id = p_campaign_id;
  if v_pipeline_id is null then
    raise exception 'campaign % not found', p_campaign_id;
  end if;

  update public.campaigns
  set is_active = false
  where pipeline_id = v_pipeline_id and is_active = true and id <> p_campaign_id;

  update public.campaigns
  set is_active = true
  where id = p_campaign_id
  returning * into v_campaign;

  return v_campaign;
end;
$$;

grant execute on function public.create_campaign_and_activate(uuid, text) to authenticated;
grant execute on function public.activate_campaign(uuid) to authenticated;

commit;
