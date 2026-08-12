import { PaymentsView } from "@/components/payments/payments-view";
import { MOCK_CONTACTS, MOCK_PAYMENTS } from "@/lib/mock-data";
import { fetchContacts } from "@/lib/queries/contacts";
import { fetchPayments } from "@/lib/queries/payments";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export default async function PaymentsPage() {
  const usingMockData = !hasSupabaseEnv();

  const { payments, contacts } = usingMockData
    ? { payments: MOCK_PAYMENTS, contacts: MOCK_CONTACTS }
    : await (async () => {
        const supabase = await createClient();
        const [payments, contacts] = await Promise.all([
          fetchPayments(supabase),
          fetchContacts(supabase),
        ]);
        return { payments, contacts };
      })();

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Πληρωμές</h1>
      <div className="mt-4">
        <PaymentsView
          initialPayments={payments}
          contacts={contacts}
          usingMockData={usingMockData}
        />
      </div>
    </div>
  );
}
