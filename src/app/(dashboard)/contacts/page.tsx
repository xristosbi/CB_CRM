import { ContactsPageView } from "@/components/contacts/contacts-page-view";
import { MOCK_CONTACTS, MOCK_PIPELINES, MOCK_STAGES } from "@/lib/mock-data";
import { fetchContacts } from "@/lib/queries/contacts";
import { fetchLeadsData } from "@/lib/queries/leads";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export default async function ContactsPage() {
  const usingMockData = !hasSupabaseEnv();

  const { contacts, pipelines, stages } = usingMockData
    ? { contacts: MOCK_CONTACTS, pipelines: MOCK_PIPELINES, stages: MOCK_STAGES }
    : await (async () => {
        const supabase = await createClient();
        const [contacts, leadsData] = await Promise.all([
          fetchContacts(supabase),
          fetchLeadsData(supabase),
        ]);
        return { contacts, pipelines: leadsData.pipelines, stages: leadsData.stages };
      })();

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Πελάτες</h1>
      <div className="mt-4">
        <ContactsPageView
          initialContacts={contacts}
          pipelines={pipelines}
          stages={stages}
          usingMockData={usingMockData}
        />
      </div>
    </div>
  );
}
