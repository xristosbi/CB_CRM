import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import type { Campaign } from "@/lib/types";

type TypedClient = SupabaseClient<Database>;

const CAMPAIGN_COLUMNS = "id, pipeline_id, name, is_active, created_at";

export async function fetchCampaigns(supabase: TypedClient): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from("campaigns")
    .select(CAMPAIGN_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Deactivates the pipeline's current active campaign (if any) and creates
// the new one as active, atomically — a single Postgres function call is a
// single transaction, so a failure partway rolls back everything instead of
// leaving the pipeline with zero (or two) active campaigns.
export async function createCampaignAndActivate(
  supabase: TypedClient,
  pipelineId: string,
  name: string
): Promise<Campaign> {
  const { data, error } = await supabase.rpc("create_campaign_and_activate", {
    p_pipeline_id: pipelineId,
    p_name: name,
  });
  if (error) throw error;
  if (!data) throw new Error("create_campaign_and_activate returned no row");
  return data;
}

// Same atomicity guarantee as above, for switching back to an existing
// (already-created) campaign via "Κάνε ενεργό".
export async function activateCampaign(
  supabase: TypedClient,
  campaignId: string
): Promise<Campaign> {
  const { data, error } = await supabase.rpc("activate_campaign", {
    p_campaign_id: campaignId,
  });
  if (error) throw error;
  if (!data) throw new Error("activate_campaign returned no row");
  return data;
}

export async function renameCampaign(
  supabase: TypedClient,
  campaignId: string,
  name: string
): Promise<void> {
  const { error } = await supabase
    .from("campaigns")
    .update({ name })
    .eq("id", campaignId)
    .select("id")
    .single();
  if (error) throw error;
}

export async function deleteCampaignIfEmpty(
  supabase: TypedClient,
  campaignId: string
): Promise<void> {
  const { count, error: countError } = await supabase
    .from("opportunities")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId);
  if (countError) throw countError;
  if ((count ?? 0) > 0) {
    throw new Error("Το campaign δεν είναι άδειο — δεν μπορεί να διαγραφεί.");
  }

  const { error } = await supabase.from("campaigns").delete().eq("id", campaignId);
  if (error) throw error;
}

// Used by the webhooks: a pipeline should always have an active campaign to
// route new leads into, but self-heals (creates "Αρχικό") instead of
// failing the lead if one is somehow missing.
export async function ensureActiveCampaign(
  supabase: TypedClient,
  pipelineId: string
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("campaigns")
    .select("id")
    .eq("pipeline_id", pipelineId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  if (data) return data;

  const created = await createCampaignAndActivate(supabase, pipelineId, "Αρχικό");
  return { id: created.id };
}
