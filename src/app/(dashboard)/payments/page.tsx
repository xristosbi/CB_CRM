import { FinanceView } from "@/components/payments/finance-view";
import { MOCK_CONTACTS, MOCK_EXPENSES, MOCK_PAYMENTS } from "@/lib/mock-data";
import { fetchContacts } from "@/lib/queries/contacts";
import { fetchExpenses } from "@/lib/queries/expenses";
import { fetchPayments } from "@/lib/queries/payments";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export default async function PaymentsPage() {
  const usingMockData = !hasSupabaseEnv();

  const { payments, expenses, contacts } = usingMockData
    ? { payments: MOCK_PAYMENTS, expenses: MOCK_EXPENSES, contacts: MOCK_CONTACTS }
    : await (async () => {
        const supabase = await createClient();
        const [payments, expenses, contacts] = await Promise.all([
          fetchPayments(supabase),
          fetchExpenses(supabase),
          fetchContacts(supabase),
        ]);
        return { payments, expenses, contacts };
      })();

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Πληρωμές</h1>
      <div className="mt-4">
        <FinanceView
          initialPayments={payments}
          initialExpenses={expenses}
          contacts={contacts}
          usingMockData={usingMockData}
        />
      </div>
    </div>
  );
}
