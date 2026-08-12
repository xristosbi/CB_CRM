-- Business expenses (not tied to a contact) for the Πληρωμές / Έξοδα page.

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric not null,
  category text,
  date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create index expenses_date_idx on public.expenses (date);

alter table public.expenses enable row level security;

create policy "authenticated full access" on public.expenses
  for all to authenticated using (true) with check (true);
