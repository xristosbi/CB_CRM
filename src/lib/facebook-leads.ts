import type { SupabaseClient } from "@supabase/supabase-js";

import type { ActivityType, Database } from "@/lib/database.types";

type TypedClient = SupabaseClient<Database>;

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = "https://graph.facebook.com";

// ---------------------------------------------------------------------------
// Webhook payload parsing
// ---------------------------------------------------------------------------

interface WebhookChangeValue {
  leadgen_id?: string;
}

interface WebhookChange {
  field?: string;
  value?: WebhookChangeValue;
}

interface WebhookEntry {
  changes?: WebhookChange[];
}

interface WebhookBody {
  object?: string;
  entry?: WebhookEntry[];
}

// Meta batches multiple lead events into one POST body (multiple entries,
// each with multiple changes) — pull out every leadgen_id present.
export function extractLeadgenIds(body: unknown): string[] {
  if (!body || typeof body !== "object") return [];
  const parsed = body as WebhookBody;
  const ids: string[] = [];
  for (const entry of parsed.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field === "leadgen" && change.value?.leadgen_id) {
        ids.push(change.value.leadgen_id);
      }
    }
  }
  return ids;
}

// ---------------------------------------------------------------------------
// Graph API — full lead details
// ---------------------------------------------------------------------------

interface GraphFieldDatum {
  name: string;
  values?: string[];
}

interface GraphLeadResponse {
  id: string;
  ad_name?: string;
  form_id?: string;
  campaign_name?: string;
  created_time?: string;
  field_data?: GraphFieldDatum[];
}

export interface LeadDetails {
  leadgenId: string;
  adName: string | null;
  formId: string | null;
  campaignName: string | null;
  fields: Record<string, string>;
}

async function graphGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!token) throw new Error("FB_PAGE_ACCESS_TOKEN is not set");

  const url = new URL(`${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set("access_token", token);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Graph API request to ${path} failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as T;
}

export async function fetchLeadDetails(leadgenId: string): Promise<LeadDetails> {
  const data = await graphGet<GraphLeadResponse>(leadgenId, {
    fields: "ad_name,form_id,campaign_name,created_time,field_data",
  });

  const fields: Record<string, string> = {};
  for (const entry of data.field_data ?? []) {
    if (entry.name && entry.values?.length) {
      fields[entry.name] = entry.values[0];
    }
  }

  return {
    leadgenId,
    adName: data.ad_name ?? null,
    formId: data.form_id ?? null,
    campaignName: data.campaign_name ?? null,
    fields,
  };
}

// form_name isn't a field on the leadgen node itself — Graph API only
// returns form_id there, so the form's display name needs a second lookup.
export async function fetchFormName(formId: string): Promise<string | null> {
  const data = await graphGet<{ name?: string }>(formId, { fields: "name" });
  return data.name ?? null;
}

export function extractContactFields(fields: Record<string, string>): {
  name: string;
  phone: string | null;
  email: string | null;
} {
  const name =
    fields.full_name?.trim() ||
    [fields.first_name, fields.last_name].filter(Boolean).join(" ").trim() ||
    "Facebook Lead";
  const phone = fields.phone_number?.trim() || fields.phone?.trim() || null;
  const email = fields.email?.trim() || null;
  return { name, phone, email };
}

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

export interface RoutingRule {
  id: string;
  match_value: string;
  pipeline_id: string;
}

export async function findRoutingRule(
  supabase: TypedClient,
  candidates: (string | null)[]
): Promise<RoutingRule | null> {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const { data, error } = await supabase
      .from("lead_routing_rules")
      .select("id, match_value, pipeline_id")
      .ilike("match_value", candidate)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
  }
  return null;
}

export async function findDefaultRule(supabase: TypedClient): Promise<RoutingRule | null> {
  const { data, error } = await supabase
    .from("lead_routing_rules")
    .select("id, match_value, pipeline_id")
    .eq("is_default", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function findFirstStage(
  supabase: TypedClient,
  pipelineId: string
): Promise<{ id: string; name: string } | null> {
  const { data, error } = await supabase
    .from("pipeline_stages")
    .select("id, name")
    .eq("pipeline_id", pipelineId)
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function findPipelineName(
  supabase: TypedClient,
  pipelineId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("pipelines")
    .select("name")
    .eq("id", pipelineId)
    .maybeSingle();
  if (error) throw error;
  return data?.name ?? null;
}

// ---------------------------------------------------------------------------
// Routing resolution (shared by every lead source)
// ---------------------------------------------------------------------------

export interface ResolvedRouting {
  pipelineId: string | null;
  pipelineName: string | null;
  stage: { id: string; name: string } | null;
  routedBy: "rule" | "default" | "unrouted";
}

export async function resolveRouting(
  supabase: TypedClient,
  candidates: (string | null)[],
  logContext: string
): Promise<ResolvedRouting> {
  const matchedRule = await findRoutingRule(supabase, candidates);
  const defaultRule = matchedRule ? null : await findDefaultRule(supabase);
  const rule = matchedRule ?? defaultRule;

  let pipelineId: string | null = rule?.pipeline_id ?? null;
  let routedBy: ResolvedRouting["routedBy"] = matchedRule ? "rule" : defaultRule ? "default" : "unrouted";

  let stage: { id: string; name: string } | null = null;
  let pipelineName: string | null = null;
  if (pipelineId) {
    [stage, pipelineName] = await Promise.all([
      findFirstStage(supabase, pipelineId),
      findPipelineName(supabase, pipelineId),
    ]);
    if (!stage) {
      // Pipeline matched but has no stages — treat as unrouted rather than
      // crash, same "don't lose the lead" principle as no default rule.
      console.warn(`facebook-leads: pipeline ${pipelineId} has no stages, leaving ${logContext} unrouted`);
      pipelineId = null;
      routedBy = "unrouted";
    }
  } else {
    console.warn(
      `facebook-leads: no routing rule and no default rule for ${logContext} — creating contact without an opportunity`
    );
  }

  return { pipelineId, pipelineName, stage, routedBy };
}

// ---------------------------------------------------------------------------
// Contact dedup + lead creation
// ---------------------------------------------------------------------------

export async function findContactByPhone(
  supabase: TypedClient,
  phone: string
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from("contacts")
    .select("id")
    .eq("phone", phone)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface ContactInput {
  name: string;
  phone: string | null;
  email: string | null;
  website?: string | null;
  source: string;
}

// Dedupes by phone. When an existing contact matches and updateIfExists is
// true, blank incoming fields never overwrite previously-known good data —
// only non-empty values are patched in.
export async function findOrCreateContact(
  supabase: TypedClient,
  input: ContactInput,
  options: { updateIfExists: boolean }
): Promise<{ contactId: string; contactCreated: boolean }> {
  const existing = input.phone ? await findContactByPhone(supabase, input.phone) : null;

  if (existing) {
    if (options.updateIfExists) {
      const patch: { name?: string; email?: string; website?: string } = {};
      if (input.name) patch.name = input.name;
      if (input.email) patch.email = input.email;
      if (input.website) patch.website = input.website;
      if (Object.keys(patch).length > 0) {
        const { error } = await supabase.from("contacts").update(patch).eq("id", existing.id);
        if (error) throw error;
      }
    }
    return { contactId: existing.id, contactCreated: false };
  }

  const { data: contact, error } = await supabase
    .from("contacts")
    .insert({
      name: input.name,
      phone: input.phone,
      email: input.email,
      website: input.website ?? null,
      source: input.source,
    })
    .select("id")
    .single();
  if (error) throw error;
  return { contactId: contact.id, contactCreated: true };
}

export interface CreateLeadFromFacebookResult {
  contactId: string;
  contactCreated: boolean;
  opportunityId: string | null;
  pipelineName: string | null;
  stageName: string | null;
  routedBy: "rule" | "default" | "unrouted";
  campaignLabel: string | null;
}

// Creates the opportunity (if routed) and the activity_log entry describing
// how the lead arrived. Shared by every lead source — only the note prefix
// differs (e.g. "... (μέσω Make)").
export async function createOpportunityAndLog(
  supabase: TypedClient,
  params: {
    contactId: string;
    routing: ResolvedRouting;
    campaignLabel: string | null;
    activityNotePrefix: string;
  }
): Promise<{ opportunityId: string | null }> {
  let opportunityId: string | null = null;
  if (params.routing.pipelineId && params.routing.stage) {
    const { data: opp, error: oppError } = await supabase
      .from("opportunities")
      .insert({
        contact_id: params.contactId,
        pipeline_id: params.routing.pipelineId,
        stage_id: params.routing.stage.id,
        campaign: params.campaignLabel,
      })
      .select("id")
      .single();
    if (oppError) throw oppError;
    opportunityId = opp.id;
  }

  const logSuffix = params.campaignLabel ? ` — καμπάνια: ${params.campaignLabel}` : "";
  const logContent =
    params.routing.routedBy === "unrouted"
      ? `${params.activityNotePrefix}${logSuffix} (χωρίς pipeline — δεν βρέθηκε κανόνας δρομολόγησης)`
      : `${params.activityNotePrefix}${logSuffix}`;

  const { error: activityError } = await supabase.from("activity_log").insert({
    contact_id: params.contactId,
    opportunity_id: opportunityId,
    type: "note" as ActivityType,
    content: logContent,
  });
  if (activityError) throw activityError;

  return { opportunityId };
}

export async function createLeadFromFacebook(
  supabase: TypedClient,
  lead: LeadDetails,
  formName: string | null
): Promise<CreateLeadFromFacebookResult> {
  const { name, phone, email } = extractContactFields(lead.fields);
  const campaignLabel = lead.adName ?? formName ?? null;

  const routing = await resolveRouting(supabase, [lead.adName, formName], `leadgen ${lead.leadgenId}`);

  const { contactId, contactCreated } = await findOrCreateContact(
    supabase,
    { name, phone, email, source: "Facebook Ads" },
    { updateIfExists: false }
  );

  const { opportunityId } = await createOpportunityAndLog(supabase, {
    contactId,
    routing,
    campaignLabel,
    activityNotePrefix: "Νέο lead από Facebook Ads",
  });

  return {
    contactId,
    contactCreated,
    opportunityId,
    pipelineName: routing.pipelineName,
    stageName: routing.stage?.name ?? null,
    routedBy: routing.routedBy,
    campaignLabel,
  };
}

// ---------------------------------------------------------------------------
// Make.com (Facebook Lead Ads module) — pre-parsed lead, no Graph API call
// ---------------------------------------------------------------------------

export interface MakeLeadInput {
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  adName: string | null;
  campaignName: string | null;
}

export async function createLeadFromMake(
  supabase: TypedClient,
  input: MakeLeadInput
): Promise<CreateLeadFromFacebookResult> {
  const campaignLabel = input.adName ?? input.campaignName ?? null;

  const routing = await resolveRouting(supabase, [input.adName, input.campaignName], "make-lead");

  const { contactId, contactCreated } = await findOrCreateContact(
    supabase,
    { name: input.name, phone: input.phone, email: input.email, website: input.website, source: "Facebook Ads" },
    { updateIfExists: true }
  );

  const { opportunityId } = await createOpportunityAndLog(supabase, {
    contactId,
    routing,
    campaignLabel,
    activityNotePrefix: "Νέο lead από Facebook Ads (μέσω Make)",
  });

  return {
    contactId,
    contactCreated,
    opportunityId,
    pipelineName: routing.pipelineName,
    stageName: routing.stage?.name ?? null,
    routedBy: routing.routedBy,
    campaignLabel,
  };
}

// ---------------------------------------------------------------------------
// Telegram notification
// ---------------------------------------------------------------------------

export function buildTelegramMessage(
  contactName: string,
  phone: string | null,
  email: string | null,
  result: CreateLeadFromFacebookResult
): string {
  const lines = [
    "🆕 Νέο Lead από Facebook Ads",
    `👤 Όνομα: ${contactName}`,
    `📞 Τηλέφωνο: ${phone ?? "—"}`,
    `📧 Email: ${email ?? "—"}`,
    `🎯 Καμπάνια: ${result.campaignLabel ?? "—"}`,
    result.pipelineName
      ? `📋 Pipeline: ${result.pipelineName} (${result.stageName})`
      : "⚠️ Χωρίς pipeline — δεν βρέθηκε κανόνας δρομολόγησης, έλεγξε το lead_routing_rules",
  ];
  if (!result.contactCreated) {
    lines.push("ℹ️ Υπάρχων επαφή (ίδιο τηλέφωνο) — προστέθηκε νέο opportunity.");
  }
  return lines.join("\n");
}

export async function notifyTelegram(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message }),
  });
  if (!res.ok) {
    console.error(`Telegram notify failed (${res.status}): ${await res.text()}`);
  }
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export async function processLeadgenEvent(
  supabase: TypedClient,
  leadgenId: string
): Promise<CreateLeadFromFacebookResult> {
  const lead = await fetchLeadDetails(leadgenId);

  let formName: string | null = null;
  if (lead.formId) {
    try {
      formName = await fetchFormName(lead.formId);
    } catch (err) {
      console.warn(`facebook-leads: failed to resolve form name for ${lead.formId}`, err);
    }
  }

  const result = await createLeadFromFacebook(supabase, lead, formName);

  const { name, phone, email } = extractContactFields(lead.fields);
  await notifyTelegram(buildTelegramMessage(name, phone, email, result));

  return result;
}
