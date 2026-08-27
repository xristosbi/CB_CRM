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
supabase/migrations/0005_fix_opportunities_rls.sql
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

## Leads μέσω Make.com (προσωρινό, όσο εκκρεμεί το leads_retrieval permission)

Το Meta App δεν έχει ακόμα εγκεκριμένο το `leads_retrieval` permission, οπότε
το `/api/webhook/facebook-leads` (Meta → CRM απευθείας) δεν μπορεί να τρέξει
ακόμα σε production. Μέχρι να εγκριθεί, τα leads περνάνε μέσα από το ήδη
εγκεκριμένο Facebook Lead Ads connector του Make.com σαν ενδιάμεσο, και το
Make καλεί ένα δεύτερο, απλούστερο route: `/api/webhook/make-lead`.

Η λογική δρομολόγησης/dedup είναι ίδια με το άλλο endpoint (ίδιος πίνακας
`lead_routing_rules`, ίδιο "μην χάσεις το lead" fallback) — η μόνη διαφορά
είναι ότι εδώ δεν καλείται καθόλου το Graph API: το Make στέλνει το lead ήδη
parsed, οπότε το route απλά διαβάζει το JSON body. Αν βρεθεί ήδη contact με
ίδιο τηλέφωνο, ενημερώνονται name/email/website του αντί να μείνουν όπως
ήταν (διαφορά από το `/facebook-leads`, που απλώς τον ξαναχρησιμοποιεί χωρίς
update).

### Env var

```
MAKE_WEBHOOK_SECRET=...
```

Διάλεξε οποιοδήποτε τυχαίο string, βάλ' το στο Vercel, και το ίδιο string
σαν header value στο Make HTTP module (βήματα παρακάτω).

### Στήσιμο στο Make

Σενάριο 2 modules: **Facebook Lead Ads → Watch Leads** (trigger, module 1)
→ **Facebook Lead Ads → Get a Lead** (module 2, παίρνει τα πλήρη στοιχεία
από το `leadgen_id` του module 1) → **HTTP → Make a request** (module 3).

Στο module 3 (HTTP):

- **URL**: `https://<crm-domain>/api/webhook/make-lead`
- **Method**: `POST`
- **Headers**: `x-make-secret` = η ίδια τιμή με το `MAKE_WEBHOOK_SECRET`
- **Body type**: JSON (raw)
- **Request content**:

```json
{
  "name": "{{2.full_name}}",
  "email": "{{2.email}}",
  "phone": "{{2.phone_number}}",
  "website": "{{2.website}}",
  "ad_name": "{{2.ad_name}}",
  "campaign_name": "{{2.campaign_name}}",
  "created_time": "{{2.created_time}}"
}
```

⚠️ Τα ονόματα μεταβλητών (`full_name`, `phone_number`, ...) είναι τα
standard field keys που επιστρέφει το Facebook Lead Ads connector του Make
για τα default πεδία μιας φόρμας — αλλά αν η φόρμα σου έχει custom
ερωτήσεις (π.χ. άλλο key για website, ή διαφορετικά ονόματα), οι πραγματικές
μεταβλητές μπορεί να διαφέρουν. Πριν το ενεργοποιήσεις, τρέξε το σενάριο
μια φορά, άνοιξε το output του module 2 (**Get a Lead**) στο run history,
και δες εκεί τα ακριβή ονόματα των πεδίων ώστε να τα αντιστοιχίσεις σωστά
στο mapping του module 3 — απλώς σύρε το σωστό πεδίο από το output panel
αντί να πληκτρολογήσεις το `{{2....}}` με το χέρι.

Το response είναι πάντα `200` με `{"success": true, "contact_id": "...",
"routed_to": "..."}` σε επιτυχία, ή `{"success": false, "reason": "..."}` αν
κάτι δεν πήγε καλά (εκτός από λάθος `x-make-secret`, που γυρνάει `401`) —
βάλε ένα Router μετά το HTTP module στο Make αν θες να κάνεις κάτι
διαφορετικό (π.χ. Slack alert) όταν `success = false`.

### Μετάβαση στο απευθείας Meta webhook

Μόλις εγκριθεί το `leads_retrieval` permission από τη Meta, ακολούθησε τα
βήματα της ενότητας "Αλλαγή του callback URL στο Meta App" παραπάνω για να
συνδέσεις το `/api/webhook/facebook-leads` απευθείας, και μπορείς τότε να
απενεργοποιήσεις το σενάριο στο Make (το `/api/webhook/make-lead` μπορεί να
μείνει ανενεργό, δεν χρειάζεται να διαγραφεί).

## Notes

- Τα shadcn/ui components στο `src/components/ui` γράφτηκαν χειροκίνητα (χωρίς
  `shadcn` CLI network access σε αυτό το περιβάλλον) — ακολουθούν πιστά το
  επίσημο source, οπότε το `npx shadcn add ...` θα δουλέψει κανονικά σε ένα
  περιβάλλον με πρόσβαση στο `ui.shadcn.com` αν χρειαστεί να προστεθούν κι άλλα.
- `pipeline_stages.is_won` σημαίνει το στάδιο-στόχο (π.χ. "Πληρωμή") που
  μετράει σαν conversion στο Analytics (επόμενη φάση).
