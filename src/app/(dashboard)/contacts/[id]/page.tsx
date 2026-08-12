import { notFound } from "next/navigation";

import { ContactDetailView } from "@/components/contacts/contact-detail-view";
import { MOCK_ACTIVITY, MOCK_CONTACTS, MOCK_OPPORTUNITIES, MOCK_STAGES, MOCK_TASKS, MOCK_PIPELINES } from "@/lib/mock-data";
import { fetchContactDetail } from "@/lib/queries/contacts";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!hasSupabaseEnv()) {
    const contact = MOCK_CONTACTS.find((c) => c.id === id);
    if (!contact) notFound();

    const opportunities = MOCK_OPPORTUNITIES.filter((o) => o.contact_id === id).map((o) => {
      const pipeline = MOCK_PIPELINES.find((p) => p.id === o.pipeline_id);
      const stage = MOCK_STAGES.find((s) => s.id === o.stage_id);
      return {
        id: o.id,
        pipeline_id: o.pipeline_id,
        pipeline_name: pipeline?.name ?? "—",
        stage_id: o.stage_id,
        stage_name: stage?.name ?? "—",
        value: o.value,
        campaign: o.campaign,
      };
    });
    const activity = MOCK_ACTIVITY.filter((a) => a.contact_id === id);
    const tasks = MOCK_TASKS.filter((t) => t.contact_id === id);

    return (
      <ContactDetailView
        contact={contact}
        initialOpportunities={opportunities}
        initialActivity={activity}
        initialTasks={tasks}
        usingMockData
      />
    );
  }

  const supabase = await createClient();
  const detail = await fetchContactDetail(supabase, id);
  if (!detail) notFound();

  return (
    <ContactDetailView
      contact={detail.contact}
      initialOpportunities={detail.opportunities}
      initialActivity={detail.activity}
      initialTasks={detail.tasks}
      usingMockData={false}
    />
  );
}
