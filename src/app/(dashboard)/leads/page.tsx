import { LeadsBoard } from "@/components/leads/leads-board";
import { computeNextAppointmentByContact } from "@/lib/calendar-event-types";
import {
  MOCK_CALENDAR_EVENTS,
  MOCK_CAMPAIGNS,
  MOCK_OPPORTUNITIES,
  MOCK_PIPELINES,
  MOCK_STAGES,
} from "@/lib/mock-data";
import { fetchNextAppointmentByContact } from "@/lib/queries/calendar";
import { fetchLeadsData } from "@/lib/queries/leads";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export default async function LeadsPage() {
  if (!hasSupabaseEnv()) {
    return (
      <LeadsBoard
        initialPipelines={MOCK_PIPELINES}
        initialStages={MOCK_STAGES}
        initialCampaigns={MOCK_CAMPAIGNS}
        initialOpportunities={MOCK_OPPORTUNITIES}
        initialNextAppointmentByContact={computeNextAppointmentByContact(MOCK_CALENDAR_EVENTS)}
        usingMockData
      />
    );
  }

  const supabase = await createClient();
  const [{ pipelines, stages, campaigns, opportunities }, nextAppointmentByContact] = await Promise.all([
    fetchLeadsData(supabase),
    fetchNextAppointmentByContact(supabase),
  ]);

  return (
    <LeadsBoard
      initialPipelines={pipelines}
      initialStages={stages}
      initialCampaigns={campaigns}
      initialOpportunities={opportunities}
      initialNextAppointmentByContact={Object.fromEntries(nextAppointmentByContact)}
      usingMockData={false}
    />
  );
}
