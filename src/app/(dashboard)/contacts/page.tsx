import { ContactsTable } from "@/components/contacts/contacts-table";
import { MOCK_CONTACTS } from "@/lib/mock-data";
import { fetchContacts } from "@/lib/queries/contacts";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export default async function ContactsPage() {
  const contacts = hasSupabaseEnv()
    ? await fetchContacts(await createClient())
    : MOCK_CONTACTS;

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Πελάτες</h1>
      <p className="mt-1 text-sm text-muted-foreground">{contacts.length} επαφές</p>
      <div className="mt-4">
        <ContactsTable contacts={contacts} />
      </div>
    </div>
  );
}
