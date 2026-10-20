-- Setter permission lockdown (section 6 of the Users/Team feature) — the
-- LAST step, done only after profiles/roles (0008) are confirmed working.
--
-- Replaces the "authenticated full access" policy on payments and
-- expenses ONLY with an admin-only policy (via the is_admin() function
-- from 0008). No other table's RLS is touched by this migration.
--
-- *** MANDATORY MANUAL VERIFICATION AFTER RUNNING THIS ***
-- 1. Log in as the admin account -> /payments and /analytics must still
--    show real data, and creating/editing a payment or expense must still
--    work normally.
-- 2. Log in as the setter account -> /payments and /analytics must show
--    EMPTY (not an error) or be blocked, and the sidebar must not even
--    offer those links.
-- If step 1 fails (admin loses access to their own data), STOP: do not
-- leave this applied. Run the ROLLBACK block below immediately, and get
-- the admin/setter split in profiles/is_admin() working first.
--
-- ---------------------------------------------------------------------
-- ROLLBACK (restore the pre-lockdown policy on both tables):
--
--   drop policy if exists "admin full access" on public.payments;
--   create policy "authenticated full access" on public.payments
--     for all to authenticated using (true) with check (true);
--
--   drop policy if exists "admin full access" on public.expenses;
--   create policy "authenticated full access" on public.expenses
--     for all to authenticated using (true) with check (true);
-- ---------------------------------------------------------------------

begin;

drop policy if exists "authenticated full access" on public.payments;
create policy "admin full access" on public.payments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "authenticated full access" on public.expenses;
create policy "admin full access" on public.expenses
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

commit;
