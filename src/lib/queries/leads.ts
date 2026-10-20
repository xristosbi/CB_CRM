import type { SupabaseClient } from "@supabase/supabase-js";

import type { ActivityType, Database } from "@/lib/database.types";
import type { Campaign, OpportunityCard, Pipeline, Stage } from "@/lib/types";

type TypedClient = SupabaseClient<Database>;

interface OpportunityRow {
  id: string;
  contact_id: string;
  pipeline_id: string;
  stage_id: string;
  value: number | null;
  campaign: string | null;
  campaign_id: string | null;
  assigned_to: string | null;
  created_at: string;
  contacts: { name: string; source: string | null } | { name: string; source: string | null }[] | null;
  profiles: { display_name: string | null } | { display_name: string | null }[] | null;
}

export async function fetchLeadsData(supabase: TypedClient): Promise<{
  pipelines: Pipeline[];
  stages: Stage[];
  campaigns: Campaign[];
  opportunities: OpportunityCard[];
}> {
  const [
    { data: pipelines, error: pipelinesError },
    { data: stages, error: stagesError },
    { data: campaigns, error: campaignsError },
    { data: opportunities, error: opportunitiesError },
  ] = await Promise.all([
    supabase.from("pipelines").select("id, name").order("created_at", { ascending: true }),
    supabase
      .from("pipeline_stages")
      .select("id, pipeline_id, name, position, is_won")
      .order("position", { ascending: true }),
    supabase
      .from("campaigns")
      .select("id, pipeline_id, name, is_active, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("opportunities")
      .select(
        "id, contact_id, pipeline_id, stage_id, value, campaign, campaign_id, assigned_to, created_at, contacts(name, source), profiles(display_name)"
      )
      .order("created_at", { ascending: false })
      .returns<OpportunityRow[]>(),
  ]);

  if (pipelinesError) throw pipelinesError;
  if (stagesError) throw stagesError;
  if (campaignsError) throw campaignsError;
  if (opportunitiesError) throw opportunitiesError;

  return {
    pipelines: pipelines ?? [],
    stages: stages ?? [],
    campaigns: campaigns ?? [],
    opportunities: (opportunities ?? []).map((row) => {
      const contact = Array.isArray(row.contacts) ? row.contacts[0] : row.contacts;
      const assignee = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return {
        id: row.id,
        contact_id: row.contact_id,
        contact_name: contact?.name ?? "—",
        source: contact?.source ?? null,
        value: row.value,
        campaign: row.campaign,
        campaign_id: row.campaign_id,
        pipeline_id: row.pipeline_id,
        stage_id: row.stage_id,
        assigned_to: row.assigned_to,
        assigned_to_name: assignee?.display_name ?? null,
        created_at: row.created_at,
      };
    }),
  };
}

// Pipelines + stages only, no opportunities — for pages that need the
// pipeline/stage picker (Πελάτες' "new lead" dialog) but never render a
// single opportunity. Both tables are tiny, so this is just two small
// parallel queries instead of a full opportunities scan with joins.
export async function fetchPipelinesAndStages(supabase: TypedClient): Promise<{
  pipelines: Pipeline[];
  stages: Stage[];
}> {
  const [
    { data: pipelines, error: pipelinesError },
    { data: stages, error: stagesError },
  ] = await Promise.all([
    supabase.from("pipelines").select("id, name").order("created_at", { ascending: true }),
    supabase
      .from("pipeline_stages")
      .select("id, pipeline_id, name, position, is_won")
      .order("position", { ascending: true }),
  ]);
  if (pipelinesError) throw pipelinesError;
  if (stagesError) throw stagesError;
  return { pipelines: pipelines ?? [], stages: stages ?? [] };
}

export interface LightOpportunity {
  id: string;
  contact_id: string;
  pipeline_id: string;
  stage_id: string;
  campaign_id: string | null;
  value: number | null;
}

// No joins, no text/attribution columns — for callers that only need the
// id/foreign-key shape, not the full kanban-card rendering: the calendar's
// "pick an opportunity" picker and the campaigns list's per-campaign stats.
export async function fetchOpportunitiesLight(supabase: TypedClient): Promise<LightOpportunity[]> {
  const { data, error } = await supabase
    .from("opportunities")
    .select("id, contact_id, pipeline_id, stage_id, campaign_id, value")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

interface AnalyticsOpportunityRow {
  id: string;
  pipeline_id: string;
  stage_id: string;
  value: number | null;
  campaign_id: string | null;
  created_at: string;
  contacts: { source: string | null } | { source: string | null }[] | null;
}

// Analytics' charts only ever read pipeline_id/campaign_id/stage_id/value/
// created_at/source — never contact_name or assignment — so this skips the
// profiles() join entirely and only pulls `source` from contacts().
export async function fetchOpportunitiesForAnalytics(supabase: TypedClient): Promise<OpportunityCard[]> {
  const { data, error } = await supabase
    .from("opportunities")
    .select("id, pipeline_id, stage_id, value, campaign_id, created_at, contacts(source)")
    .order("created_at", { ascending: false })
    .returns<AnalyticsOpportunityRow[]>();
  if (error) throw error;
  return (data ?? []).map((row) => {
    const contact = Array.isArray(row.contacts) ? row.contacts[0] : row.contacts;
    return {
      id: row.id,
      contact_id: "",
      contact_name: "",
      source: contact?.source ?? null,
      value: row.value,
      campaign: null,
      campaign_id: row.campaign_id,
      pipeline_id: row.pipeline_id,
      stage_id: row.stage_id,
      assigned_to: null,
      assigned_to_name: null,
      created_at: row.created_at,
    };
  });
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
  // .select().single() is deliberate: a plain .update().eq() with no
  // matching row (e.g. blocked by RLS) succeeds with 0 rows affected and no
  // error, so a caller-side rollback would never fire — .single() forces a
  // real error when the update didn't actually touch the row.
  const { error } = await supabase
    .from("opportunities")
    .update({ stage_id: stageId })
    .eq("id", opportunityId)
    .select("id")
    .single();
  if (error) throw error;
}

export async function renameStage(supabase: TypedClient, stageId: string, name: string) {
  const { error } = await supabase.from("pipeline_stages").update({ name }).eq("id", stageId);
  if (error) throw error;
}

export async function reorderStages(
  supabase: TypedClient,
  updates: { id: string; position: number }[]
) {
  const results = await Promise.all(
    updates.map(({ id, position }) =>
      supabase.from("pipeline_stages").update({ position }).eq("id", id).select("id").single()
    )
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
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

export async function updateOpportunity(
  supabase: TypedClient,
  opportunityId: string,
  input: { value: number | null; campaign: string | null }
) {
  const { error } = await supabase.from("opportunities").update(input).eq("id", opportunityId);
  if (error) throw error;
}

// .select().single() so an RLS-blocked 0-row update becomes a real thrown
// error instead of a silent no-op, same convention as updateOpportunityStage.
export async function updateOpportunityAssignment(
  supabase: TypedClient,
  opportunityId: string,
  assignedTo: string | null
) {
  const { error } = await supabase
    .from("opportunities")
    .update({ assigned_to: assignedTo })
    .eq("id", opportunityId)
    .select("id")
    .single();
  if (error) throw error;
}

export async function bulkAssignOpportunities(
  supabase: TypedClient,
  opportunityIds: string[],
  assignedTo: string | null
) {
  const { data, error } = await supabase
    .from("opportunities")
    .update({ assigned_to: assignedTo })
    .in("id", opportunityIds)
    .select("id");
  if (error) throw error;
  if (!data || data.length !== opportunityIds.length) {
    throw new Error("bulkAssignOpportunities: not all rows were updated (RLS?)");
  }
}

export async function deleteOpportunity(
  supabase: TypedClient,
  opportunity: { id: string; contact_id: string; pipeline_id: string; stage_id: string },
  pipelineName: string,
  stageName: string,
  userId?: string | null
) {
  const { error } = await supabase.from("opportunities").delete().eq("id", opportunity.id);
  if (error) throw error;

  const { error: activityError } = await supabase.from("activity_log").insert({
    contact_id: opportunity.contact_id,
    type: "note" as ActivityType,
    content: `Διαγράφηκε opportunity: ${pipelineName} / ${stageName}`,
    user_id: userId ?? null,
  });
  if (activityError) throw activityError;
}

export interface LastContactInfo {
  type: Extract<ActivityType, "call" | "note">;
  user_id: string | null;
  user_name: string | null;
  created_at: string;
}

interface LastContactRow {
  contact_id: string;
  type: ActivityType;
  user_id: string | null;
  created_at: string;
  profiles: { display_name: string | null } | { display_name: string | null }[] | null;
}

// One grouped query for every visible contact's most recent call/note,
// instead of a per-card query — the newest row per contact_id wins since
// results come back ordered newest-first.
export async function fetchLastContactByContact(
  supabase: TypedClient,
  contactIds: string[]
): Promise<Map<string, LastContactInfo>> {
  const map = new Map<string, LastContactInfo>();
  if (contactIds.length === 0) return map;

  const { data, error } = await supabase
    .from("activity_log")
    .select("contact_id, type, user_id, created_at, profiles(display_name)")
    .in("contact_id", contactIds)
    .in("type", ["call", "note"])
    .order("created_at", { ascending: false })
    .returns<LastContactRow[]>();
  if (error) throw error;

  for (const row of data ?? []) {
    if (map.has(row.contact_id)) continue;
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    map.set(row.contact_id, {
      type: row.type as "call" | "note",
      user_id: row.user_id,
      user_name: profile?.display_name ?? null,
      created_at: row.created_at,
    });
  }
  return map;
}

export async function insertActivity(
  supabase: TypedClient,
  params: {
    contact_id: string;
    opportunity_id?: string | null;
    type: ActivityType;
    content: string;
    user_id?: string | null;
  }
) {
  const { error } = await supabase.from("activity_log").insert(params);
  if (error) throw error;
}
