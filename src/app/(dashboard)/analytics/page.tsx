import { AnalyticsView } from "@/components/analytics/analytics-view";
import {
  MOCK_EXPENSES,
  MOCK_OPPORTUNITIES,
  MOCK_PAYMENTS,
  MOCK_PIPELINES,
  MOCK_STAGES,
} from "@/lib/mock-data";
import { fetchExpenses } from "@/lib/queries/expenses";
import { fetchLeadsData } from "@/lib/queries/leads";
import { fetchPayments } from "@/lib/queries/payments";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export default async function AnalyticsPage() {
  const usingMockData = !hasSupabaseEnv();

  const { pipelines, stages, opportunities, payments, expenses } = usingMockData
    ? {
        pipelines: MOCK_PIPELINES,
        stages: MOCK_STAGES,
        opportunities: MOCK_OPPORTUNITIES,
        payments: MOCK_PAYMENTS,
        expenses: MOCK_EXPENSES,
      }
    : await (async () => {
        const supabase = await createClient();
        const [leadsData, payments, expenses] = await Promise.all([
          fetchLeadsData(supabase),
          fetchPayments(supabase),
          fetchExpenses(supabase),
        ]);
        return { ...leadsData, payments, expenses };
      })();

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
      <div className="mt-4">
        <AnalyticsView
          pipelines={pipelines}
          stages={stages}
          opportunities={opportunities}
          payments={payments}
          expenses={expenses}
        />
      </div>
    </div>
  );
}
