import Link from "next/link";

import { Button } from "@/components/ui/button";
import { CampaignDetailView } from "@/components/campaigns/campaign-detail-view";
import { computeNextAppointmentByContact } from "@/lib/calendar-event-types";
import { MOCK_CALENDAR_EVENTS, MOCK_CAMPAIGNS, MOCK_OPPORTUNITIES, MOCK_PIPELINES, MOCK_STAGES } from "@/lib/mock-data";
import { fetchNextAppointmentByContact } from "@/lib/queries/calendar";
import { fetchLeadsData } from "@/lib/queries/leads";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const usingMockData = !hasSupabaseEnv();

  const { pipelines, stages, campaigns, opportunities, nextAppointmentByContact } = usingMockData
    ? {
        pipelines: MOCK_PIPELINES,
        stages: MOCK_STAGES,
        campaigns: MOCK_CAMPAIGNS,
        opportunities: MOCK_OPPORTUNITIES,
        nextAppointmentByContact: computeNextAppointmentByContact(MOCK_CALENDAR_EVENTS),
      }
    : await (async () => {
        const supabase = await createClient();
        const [leadsData, nextAppointmentMap] = await Promise.all([
          fetchLeadsData(supabase),
          fetchNextAppointmentByContact(supabase),
        ]);
        return { ...leadsData, nextAppointmentByContact: Object.fromEntries(nextAppointmentMap) };
      })();

  const campaign = campaigns.find((c) => c.id === id);

  if (!campaign) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-xl font-semibold">Δεν βρέθηκε το campaign</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Το campaign που ψάχνεις δεν υπάρχει πια, ή μπορεί να έχει διαγραφεί.
        </p>
        <Button asChild size="sm">
          <Link href="/campaigns">Πίσω στα Campaigns</Link>
        </Button>
      </div>
    );
  }

  const pipeline = pipelines.find((p) => p.id === campaign.pipeline_id);

  return (
    <CampaignDetailView
      campaign={campaign}
      pipelineName={pipeline?.name ?? "—"}
      initialPipelines={pipelines}
      initialStages={stages}
      initialCampaigns={campaigns}
      initialOpportunities={opportunities}
      initialNextAppointmentByContact={nextAppointmentByContact}
      usingMockData={usingMockData}
    />
  );
}
