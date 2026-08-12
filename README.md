# CB CRM

Custom CRM για μια δίανθρωπη AI automation agency, εμπνευσμένο από GoHighLevel.
Next.js 16 (App Router) + Supabase (Postgres/Auth/Realtime) + Tailwind + shadcn-style
UI primitives + @dnd-kit + Recharts.

## Phase 1 (τρέχουσα φάση)

- Auth: Supabase email/password, 2 χρήστες, χωρίς roles.
- Sidebar: Leads · Πελάτες · Ημερολόγιο · Πληρωμές · Analytics · Ρυθμίσεις.
- Leads: kanban ανά pipeline, drag-and-drop στάδια, δημιουργία νέων pipelines/stages,
  realtime ενημέρωση όταν μπαίνει νέο lead εξωτερικά (webhook).
- Πελάτες / Πληρωμές / Ημερολόγιο / Analytics / Ρυθμίσεις: βασικά stubs, θα χτιστούν
  σε επόμενα βήματα.

## Local setup

```bash
npm install
cp .env.example .env.local
```

Συμπλήρωσε στο `.env.local` τα credentials του Supabase project σου
(Project Settings → API):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Χωρίς αυτά τα δύο env vars, η εφαρμογή τρέχει σε **demo mode**: το auth
παρακάμπτεται και η σελίδα Leads δείχνει mock δεδομένα, ώστε το UI να είναι
δοκιμάσιμο χωρίς Supabase project. Μόλις προστεθούν, ενεργοποιείται κανονικά το
auth-protected flow με πραγματικά δεδομένα.

Τρέξε το migration στο Supabase project σου (SQL editor ή `supabase db push`):

```
supabase/migrations/0001_init.sql
```

Προαιρετικά, seed δεδομένα για local dev (`supabase db reset` τα τρέχει αυτόματα,
ή τρέξε το χειροκίνητα στο SQL editor):

```
supabase/seed.sql
```

Δημιούργησε τους 2 χρήστες (owner + partner) από το Supabase Dashboard →
Authentication → Users.

```bash
npm run dev
```

## Notes

- Τα shadcn/ui components στο `src/components/ui` γράφτηκαν χειροκίνητα (χωρίς
  `shadcn` CLI network access σε αυτό το περιβάλλον) — ακολουθούν πιστά το
  επίσημο source, οπότε το `npx shadcn add ...` θα δουλέψει κανονικά σε ένα
  περιβάλλον με πρόσβαση στο `ui.shadcn.com` αν χρειαστεί να προστεθούν κι άλλα.
- `pipeline_stages.is_won` σημαίνει το στάδιο-στόχο (π.χ. "Πληρωμή") που
  μετράει σαν conversion στο Analytics (επόμενη φάση).
