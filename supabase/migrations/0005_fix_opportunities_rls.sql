-- Defensive re-assertion of RLS on the tables the kanban drag-and-drop
-- writes to (opportunities, activity_log, pipeline_stages). Written as a
-- fix, not a first-time setup: 0001_init.sql already defines the intended
-- "authenticated full access" policy on all three, but a live project can
-- drift from its migration history (a policy edited by hand in the
-- dashboard, a migration run out of order, etc.) — this makes no
-- assumption about the current state and just re-asserts the correct one.
--
-- Idempotent: safe to run even if nothing has actually drifted.

alter table public.opportunities enable row level security;
alter table public.activity_log enable row level security;
alter table public.pipeline_stages enable row level security;

drop policy if exists "authenticated full access" on public.opportunities;
create policy "authenticated full access" on public.opportunities
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated full access" on public.activity_log;
create policy "authenticated full access" on public.activity_log
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated full access" on public.pipeline_stages;
create policy "authenticated full access" on public.pipeline_stages
  for all to authenticated using (true) with check (true);
