import { AnalyticsView } from "@/components/analytics/analytics-view";
import {
  MOCK_CAMPAIGNS,
  MOCK_EXPENSES,
  MOCK_OPPORTUNITIES,
  MOCK_PAYMENTS,
  MOCK_PIPELINES,
  MOCK_STAGES,
} from "@/lib/mock-data";
import { fetchCampaigns } from "@/lib/queries/campaigns";
import { fetchExpenses } from "@/lib/queries/expenses";
import { fetchOpportunitiesForAnalytics, fetchPipelinesAndStages } from "@/lib/queries/leads";
import { fetchPayments } from "@/lib/queries/payments";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export default async function AnalyticsPage() {
  const usingMockData = !hasSupabaseEnv();

  const { pipelines, stages, campaigns, opportunities, payments, expenses } = usingMockData
    ? {
        pipelines: MOCK_PIPELINES,
        stages: MOCK_STAGES,
        campaigns: MOCK_CAMPAIGNS,
        opportunities: MOCK_OPPORTUNITIES,
        payments: MOCK_PAYMENTS,
        expenses: MOCK_EXPENSES,
      }
    : await (async () => {
        const supabase = await createClient();
        // Charts only ever read pipeline/stage/campaign ids, value,
        // created_at and source — fetchOpportunitiesForAnalytics skips the
        // profiles() join that the full fetchLeadsData carries for nothing.
        const [{ pipelines, stages }, campaigns, opportunities, payments, expenses] = await Promise.all([
          fetchPipelinesAndStages(supabase),
          fetchCampaigns(supabase),
          fetchOpportunitiesForAnalytics(supabase),
          fetchPayments(supabase),
          fetchExpenses(supabase),
        ]);
        return { pipelines, stages, campaigns, opportunities, payments, expenses };
      })();

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
      <div className="mt-4">
        <AnalyticsView
          pipelines={pipelines}
          stages={stages}
          campaigns={campaigns}
          opportunities={opportunities}
          payments={payments}
          expenses={expenses}
        />
      </div>
    </div>
  );
}
