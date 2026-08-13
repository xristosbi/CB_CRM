import type { SupabaseClient } from "@supabase/supabase-js";

import type { ActivityType, Database } from "@/lib/database.types";
import type { OpportunityCard, Pipeline, Stage } from "@/lib/types";

type TypedClient = SupabaseClient<Database>;

interface OpportunityRow {
  id: string;
  contact_id: string;
  pipeline_id: string;
  stage_id: string;
  value: number | null;
  campaign: string | null;
  created_at: string;
  contacts: { name: string; source: string | null } | { name: string; source: string | null }[] | null;
}

export async function fetchLeadsData(supabase: TypedClient): Promise<{
  pipelines: Pipeline[];
  stages: Stage[];
  opportunities: OpportunityCard[];
}> {
  const [{ data: pipelines, error: pipelinesError }, { data: stages, error: stagesError }, { data: opportunities, error: opportunitiesError }] =
    await Promise.all([
      supabase.from("pipelines").select("id, name").order("created_at", { ascending: true }),
      supabase
        .from("pipeline_stages")
        .select("id, pipeline_id, name, position, is_won")
        .order("position", { ascending: true }),
      supabase
        .from("opportunities")
        .select("id, contact_id, pipeline_id, stage_id, value, campaign, created_at, contacts(name, source)")
        .order("created_at", { ascending: false })
        .returns<OpportunityRow[]>(),
    ]);

  if (pipelinesError) throw pipelinesError;
  if (stagesError) throw stagesError;
  if (opportunitiesError) throw opportunitiesError;

  return {
    pipelines: pipelines ?? [],
    stages: stages ?? [],
    opportunities: (opportunities ?? []).map((row) => {
      const contact = Array.isArray(row.contacts) ? row.contacts[0] : row.contacts;
      return {
        id: row.id,
        contact_id: row.contact_id,
        contact_name: contact?.name ?? "—",
        source: contact?.source ?? null,
        value: row.value,
        campaign: row.campaign,
        pipeline_id: row.pipeline_id,
        stage_id: row.stage_id,
        created_at: row.created_at,
      };
    }),
  };
}

export async function fetchContactSummary(supabase: TypedClient, contactId: string) {
  const { data, error } = await supabase
    .from("contacts")
    .select("name, source")
    .eq("id", contactId)
    .single();
  if (error) throw error;
  return data;
}

export async function createPipelineWithStages(
  supabase: TypedClient,
  name: string,
  stageNames: string[]
): Promise<{ pipeline: Pipeline; stages: Stage[] }> {
  const { data: pipeline, error: pipelineError } = await supabase
    .from("pipelines")
    .insert({ name })
    .select("id, name")
    .single();
  if (pipelineError) throw pipelineError;

  const { data: stages, error: stagesError } = await supabase
    .from("pipeline_stages")
    .insert(
      stageNames.map((stageName, index) => ({
        pipeline_id: pipeline.id,
        name: stageName,
        position: index,
        is_won: false,
      }))
    )
    .select("id, pipeline_id, name, position, is_won");
  if (stagesError) throw stagesError;

  return { pipeline, stages: stages ?? [] };
}

export async function updateOpportunityStage(
  supabase: TypedClient,
  opportunityId: string,
  stageId: string
) {
  const { error } = await supabase
    .from("opportunities")
    .update({ stage_id: stageId })
    .eq("id", opportunityId);
  if (error) throw error;
}

export async function renameStage(supabase: TypedClient, stageId: string, name: string) {
  const { error } = await supabase.from("pipeline_stages").update({ name }).eq("id", stageId);
  if (error) throw error;
}

export async function addStage(
  supabase: TypedClient,
  pipelineId: string,
  name: string,
  position: number
): Promise<Stage> {
  const { data, error } = await supabase
    .from("pipeline_stages")
    .insert({ pipeline_id: pipelineId, name, position, is_won: false })
    .select("id, pipeline_id, name, position, is_won")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteStage(
  supabase: TypedClient,
  stageId: string,
  moveOpportunitiesTo: string | null
) {
  if (moveOpportunitiesTo) {
    const { error: moveError } = await supabase
      .from("opportunities")
      .update({ stage_id: moveOpportunitiesTo })
      .eq("stage_id", stageId);
    if (moveError) throw moveError;
  }
  const { error } = await supabase.from("pipeline_stages").delete().eq("id", stageId);
  if (error) throw error;
}

export async function insertActivity(
  supabase: TypedClient,
  params: {
    contact_id: string;
    opportunity_id?: string | null;
    type: ActivityType;
    content: string;
  }
) {
  const { error } = await supabase.from("activity_log").insert(params);
  if (error) throw error;
}
