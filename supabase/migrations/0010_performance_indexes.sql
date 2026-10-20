-- Performance pass: indexes for query patterns that had none yet. Found by
-- cross-referencing every .eq()/.order()/.in() filter column used in
-- src/lib/queries/*.ts against the indexes created by 0001-0009.
--
-- Idempotent (if not exists everywhere) and RLS/data are untouched.

begin;

-- fetchLeadsData (the Leads board's main query) orders the WHOLE
-- opportunities table by created_at desc with no supporting index today —
-- the existing (pipeline_id, stage_id) composite doesn't help a plain
-- "order by created_at" sort.
create index if not exists opportunities_created_at_idx
  on public.opportunities (created_at desc);

-- findContactByPhone runs on every single inbound lead webhook call
-- (Facebook Ads + Make) to dedupe by phone — currently a full table scan
-- on public.contacts with no index on phone at all.
create index if not exists contacts_phone_idx
  on public.contacts (phone);

-- fetchContacts sorts alphabetically by name; the existing contacts_name_idx
-- is a GIN tsvector index for full-text search and doesn't help a plain
-- ORDER BY name.
create index if not exists contacts_name_btree_idx
  on public.contacts (name);

-- fetchLastContactByContact (the Leads board's "last contact" indicator,
-- now run on every /leads page view) filters activity_log by a list of
-- contact_ids and orders by created_at desc per contact — a composite
-- index serves this (and the single-contact activity feed on the contact
-- detail page) far better than the existing single-column indexes alone.
create index if not exists activity_log_contact_id_created_at_idx
  on public.activity_log (contact_id, created_at desc);

-- Πληρωμές orders the whole payments table by created_at desc with no
-- supporting index.
create index if not exists payments_created_at_idx
  on public.payments (created_at desc);

commit;
