# CB CRM

Custom CRM για μια δίανθρωπη AI automation agency, εμπνευσμένο από GoHighLevel.
Next.js 16 (App Router) + Supabase (Postgres/Auth/Realtime) + Tailwind + shadcn-style
UI primitives + @dnd-kit + Recharts.

## Phase 1 (τρέχουσα φάση)

- Auth: Supabase email/password, 2 χρήστες, χωρίς roles.
- Sidebar: Leads · Πελάτες · Ημερολόγιο · Πληρωμές · Analytics · Ρυθμίσεις.
- Leads: kanban ανά pipeline, drag-and-drop στάδια, δημιουργία νέων pipelines/stages,
  realtime ενημέρωση όταν μπαίνει νέο lead εξωτερικά — π.χ. από το Facebook
  Lead Ads webhook (δες ενότητα "Facebook Lead Ads webhook" παρακάτω).
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

Τρέξε τα migrations στο Supabase project σου, με τη σειρά (SQL editor ή
`supabase db push`):

```
supabase/migrations/0001_init.sql
supabase/migrations/0002_activity_payment_type.sql
supabase/migrations/0003_expenses.sql
supabase/migrations/0004_lead_routing_rules.sql
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

## Facebook Lead Ads webhook

Νέα leads από Facebook Lead Ads μπαίνουν αυτόματα στο σωστό pipeline μέσω
`/api/webhook/facebook-leads` — δεν χρειάζεται πια ξεχωριστό `fb-leads-webhook`
project.

**Πώς δουλεύει:** Meta καλεί το route με το `leadgen_id` του lead, εμείς
φέρνουμε τα πλήρη στοιχεία από το Graph API (`ad_name`, `form_id` → όνομα
φόρμας, και τα υποβληθέντα πεδία), βρίσκουμε σε ποιο pipeline ανήκει μέσω του
πίνακα `lead_routing_rules`, και δημιουργούμε contact + opportunity στο πρώτο
στάδιο του pipeline. Αν υπάρχει ήδη contact με το ίδιο τηλέφωνο, ξαναχρησιμο-
ποιείται αντί να φτιάχνεται duplicate. Στέλνεται και ειδοποίηση στο Telegram.

### Env vars

Πρόσθεσε στο Vercel project του CRM (Settings → Environment Variables) τις
ίδιες τιμές που είχε το παλιό `fb-leads-webhook` project:

```
FB_VERIFY_TOKEN=...
FB_PAGE_ACCESS_TOKEN=...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

Επιπλέον χρειάζεται ένα **νέο** env var που δεν υπήρχε στο παλιό project —
το webhook γράφει contacts/opportunities χωρίς logged-in χρήστη, οπότε πρέπει
να παρακάμψει το Row Level Security με το service-role key αντί για το anon key:

```
SUPABASE_SERVICE_ROLE_KEY=...   (Supabase Dashboard → Project Settings → API → service_role)
```

⚠️ Αυτό το key έχει πλήρη πρόσβαση στη βάση — μόνο ως server-side env var στο
Vercel, ποτέ με πρόθεμα `NEXT_PUBLIC_`, ποτέ σε client-side κώδικα.

### Πώς προσθέτεις κανόνα δρομολόγησης

Κάθε κανόνας αντιστοιχίζει ένα ad name ή form name (όπως το βλέπεις στο Meta
Ads Manager) σε ένα pipeline. Βρες το `pipeline_id` από το Supabase table
editor (πίνακας `pipelines`) και τρέξε στο SQL editor:

```sql
insert into lead_routing_rules (match_value, pipeline_id)
values ('Όνομα καμπάνιας', '<pipeline uuid>');
```

Το matching είναι case-insensitive και πρέπει να ταιριάζει ακριβώς με το ad
name ή form name (όχι μερική συμφωνία).

Για το pipeline που πρέπει να πιάνει ό,τι δεν ταιριάζει με κανέναν κανόνα:

```sql
insert into lead_routing_rules (match_value, pipeline_id, is_default)
values ('Default', '<pipeline uuid>', true);
```

Μόνο ένας κανόνας μπορεί να έχει `is_default = true` — αν προσπαθήσεις να
προσθέσεις δεύτερο, το insert θα αποτύχει (unique index). Άλλαξε πρώτα τον
παλιό σε `false` ή διάγραψέ τον.

Αν ένα lead δεν ταιριάζει με κανέναν κανόνα ΚΑΙ δεν υπάρχει default rule, το
webhook δεν το χάνει: φτιάχνει τον contact χωρίς opportunity, το σημειώνει
στο activity log, και το Telegram μήνυμα το επισημαίνει με ⚠️ ώστε να το
δρομολογήσεις χειροκίνητα.

### Αλλαγή του callback URL στο Meta App

1. [Meta for Developers](https://developers.facebook.com/apps) → το App σου →
   **Webhooks** → **Page** subscription.
2. **Edit Subscription** στο `leadgen` field.
3. Άλλαξε το Callback URL από
   `https://fb-leads-webhook.vercel.app/api/webhook` σε:
   ```
   https://<crm-domain>/api/webhook/facebook-leads
   ```
4. Verify Token: ίδια τιμή με το `FB_VERIFY_TOKEN` env var παραπάνω.
5. **Verify and Save** — η Meta θα καλέσει GET στο νέο URL για να επιβεβαιώσει
   πριν αποθηκεύσει.

### Απόσυρση του παλιού project

Μόλις επιβεβαιωθεί ότι νέα leads φτάνουν σωστά μέσω του νέου callback URL
(δοκίμασε με ένα πραγματικό test lead από το Meta Ads Manager), το παλιό
`fb-leads-webhook` project στο Vercel μπορεί να απενεργοποιηθεί ή να
διαγραφεί — δεν λαμβάνει πια traffic από τη Meta.

## Notes

- Τα shadcn/ui components στο `src/components/ui` γράφτηκαν χειροκίνητα (χωρίς
  `shadcn` CLI network access σε αυτό το περιβάλλον) — ακολουθούν πιστά το
  επίσημο source, οπότε το `npx shadcn add ...` θα δουλέψει κανονικά σε ένα
  περιβάλλον με πρόσβαση στο `ui.shadcn.com` αν χρειαστεί να προστεθούν κι άλλα.
- `pipeline_stages.is_won` σημαίνει το στάδιο-στόχο (π.χ. "Πληρωμή") που
  μετράει σαν conversion στο Analytics (επόμενη φάση).
