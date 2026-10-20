import { CampaignsListView } from "@/components/campaigns/campaigns-list-view";
import { MOCK_CAMPAIGNS, MOCK_OPPORTUNITIES, MOCK_PIPELINES, MOCK_STAGES } from "@/lib/mock-data";
import { fetchCampaigns } from "@/lib/queries/campaigns";
import { fetchOpportunitiesLight, fetchPipelinesAndStages } from "@/lib/queries/leads";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export default async function CampaignsPage() {
  const usingMockData = !hasSupabaseEnv();

  const { pipelines, stages, campaigns, opportunities } = usingMockData
    ? {
        pipelines: MOCK_PIPELINES,
        stages: MOCK_STAGES,
        campaigns: MOCK_CAMPAIGNS,
        opportunities: MOCK_OPPORTUNITIES,
      }
    : await (async () => {
        const supabase = await createClient();
        // Only campaign_id/stage_id/value are ever read here (per-campaign
        // lead counts + won-amount) — no contact/profile joins needed.
        const [{ pipelines, stages }, campaigns, opportunities] = await Promise.all([
          fetchPipelinesAndStages(supabase),
          fetchCampaigns(supabase),
          fetchOpportunitiesLight(supabase),
        ]);
        return { pipelines, stages, campaigns, opportunities };
      })();

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
      <div className="mt-4">
        <CampaignsListView
          initialPipelines={pipelines}
          initialStages={stages}
          initialCampaigns={campaigns}
          opportunities={opportunities}
          usingMockData={usingMockData}
        />
      </div>
    </div>
  );
}
