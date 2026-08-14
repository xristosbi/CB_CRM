-- Routes incoming Facebook Lead Ads leads to a pipeline based on the ad/form
-- name Meta reports for the lead. Used by /api/webhook/facebook-leads.

create table public.lead_routing_rules (
  id uuid primary key default gen_random_uuid(),
  match_value text not null,
  pipeline_id uuid not null references public.pipelines (id) on delete cascade,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index lead_routing_rules_pipeline_id_idx on public.lead_routing_rules (pipeline_id);

-- At most one default rule at a time: a partial unique index on a constant
-- expression means only one row can have is_default = true.
create unique index lead_routing_rules_one_default_idx
  on public.lead_routing_rules (is_default)
  where is_default;

alter table public.lead_routing_rules enable row level security;

create policy "authenticated full access" on public.lead_routing_rules
  for all to authenticated using (true) with check (true);
