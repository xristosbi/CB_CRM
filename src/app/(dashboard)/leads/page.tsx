import { LeadsBoard } from "@/components/leads/leads-board";
import { MOCK_OPPORTUNITIES, MOCK_PIPELINES, MOCK_STAGES } from "@/lib/mock-data";
import { fetchLeadsData } from "@/lib/queries/leads";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export default async function LeadsPage() {
  if (!hasSupabaseEnv()) {
    return (
      <LeadsBoard
        initialPipelines={MOCK_PIPELINES}
        initialStages={MOCK_STAGES}
        initialOpportunities={MOCK_OPPORTUNITIES}
        usingMockData
      />
    );
  }

  const supabase = await createClient();
  const { pipelines, stages, opportunities } = await fetchLeadsData(supabase);

  return (
    <LeadsBoard
      initialPipelines={pipelines}
      initialStages={stages}
      initialOpportunities={opportunities}
      usingMockData={false}
    />
  );
}
