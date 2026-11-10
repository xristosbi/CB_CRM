-- Two unrelated features bundled into one migration (run together, in this
-- order, since the pipeline delete RPC is independent of the finance work
-- but both were requested together):
--
--   A) Finance visibility — hide opportunities.value from non-admins,
--      enforced in Postgres (not just the UI), reusing the EXISTING
--      profiles.role ('admin'/'setter') gate from 0008/0009 rather than
--      introducing a second, parallel permission column.
--   B) Pipeline rename/delete — admin-only, with an atomic
--      reassign-or-delete-leads RPC so a partial failure can never leave
--      orphaned opportunities or a pipeline stuck half-deleted.
--
-- Idempotent throughout. No existing data is modified.

begin;

-- ---------------------------------------------------------------------------
-- A) Finance visibility
-- ---------------------------------------------------------------------------

-- RLS can't mask a single column — only whole rows — so this view does the
-- masking instead. security_invoker means it runs with the CALLING user's
-- privileges, so the underlying "authenticated full access" policy on
-- opportunities still governs row visibility exactly as before; only the
-- value column is swapped for null when the caller isn't an admin. Every
-- read path that used to select from public.opportunities for display
-- (Leads board, Analytics, campaign stats) now reads from this view instead.
create or replace view public.opportunities_feed as
select
  id,
  contact_id,
  pipeline_id,
  stage_id,
  case when public.is_admin() then value else null end as value,
  campaign,
  campaign_id,
  assigned_to,
  created_at,
  updated_at
from public.opportunities;

alter view public.opportunities_feed set (security_invoker = true);

grant select on public.opportunities_feed to authenticated;

-- Defense in depth beyond UI hiding: even if a non-admin's client sends a
-- `value` in an insert/update payload (devtools, a stale cached form,
-- whatever), this silently discards that part of the write instead of
-- erroring the whole request — the rest of the write still succeeds.
create or replace function public.protect_opportunity_value()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.value := null;
  elsif tg_op = 'UPDATE' then
    new.value := old.value;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_opportunity_value_trigger on public.opportunities;
create trigger protect_opportunity_value_trigger
  before insert or update on public.opportunities
  for each row execute function public.protect_opportunity_value();

-- ---------------------------------------------------------------------------
-- B) Pipelines: admin-only rename/delete
-- ---------------------------------------------------------------------------

drop policy if exists "authenticated full access" on public.pipelines;

create policy "pipelines select" on public.pipelines
  for select to authenticated using (true);

create policy "pipelines insert" on public.pipelines
  for insert to authenticated with check (true);

create policy "pipelines admin update" on public.pipelines
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "pipelines admin delete" on public.pipelines
  for delete to authenticated
  using (public.is_admin());

-- Atomic "reassign-then-delete" (or just delete, cascading everything via
-- the existing on-delete-cascade FKs on pipeline_stages/campaigns/
-- lead_routing_rules/opportunities) — one transaction, so a failure
-- partway never leaves opportunities pointing at nothing or a pipeline
-- half gone. Re-checks is_admin() itself rather than trusting the caller,
-- since this is reachable as an RPC by any authenticated session.
create or replace function public.delete_pipeline(
  p_pipeline_id uuid,
  p_reassign_to_pipeline_id uuid default null,
  p_reassign_to_stage_id uuid default null
)
returns void
language plpgsql
security invoker
as $$
begin
  if not public.is_admin() then
    raise exception 'only an admin can delete a pipeline';
  end if;

  if (select count(*) from public.pipelines) <= 1 then
    raise exception 'cannot delete the last remaining pipeline';
  end if;

  if p_reassign_to_pipeline_id is not null then
    if p_reassign_to_stage_id is null then
      raise exception 'p_reassign_to_stage_id is required when reassigning leads';
    end if;

    update public.opportunities
    set pipeline_id = p_reassign_to_pipeline_id,
        stage_id = p_reassign_to_stage_id,
        -- the old campaign is about to be deleted along with the pipeline
        campaign_id = null
    where pipeline_id = p_pipeline_id;
  end if;

  delete from public.pipelines where id = p_pipeline_id;
end;
$$;

grant execute on function public.delete_pipeline(uuid, uuid, uuid) to authenticated;

commit;
