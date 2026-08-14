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

export interface CreateLeadFromFacebookResult {
  contactId: string;
  contactCreated: boolean;
  opportunityId: string | null;
  pipelineName: string | null;
  stageName: string | null;
  routedBy: "rule" | "default" | "unrouted";
  campaignLabel: string | null;
}

export async function createLeadFromFacebook(
  supabase: TypedClient,
  lead: LeadDetails,
  formName: string | null
): Promise<CreateLeadFromFacebookResult> {
  const { name, phone, email } = extractContactFields(lead.fields);
  const campaignLabel = lead.adName ?? formName ?? null;

  const matchedRule = await findRoutingRule(supabase, [lead.adName, formName]);
  const defaultRule = matchedRule ? null : await findDefaultRule(supabase);
  const rule = matchedRule ?? defaultRule;

  let pipelineId: string | null = rule?.pipeline_id ?? null;
  let routedBy: CreateLeadFromFacebookResult["routedBy"] = matchedRule
    ? "rule"
    : defaultRule
      ? "default"
      : "unrouted";

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
      console.warn(
        `facebook-leads: pipeline ${pipelineId} has no stages, leaving lead ${lead.leadgenId} unrouted`
      );
      pipelineId = null;
      routedBy = "unrouted";
    }
  } else {
    console.warn(
      `facebook-leads: no routing rule and no default rule for leadgen ${lead.leadgenId} (ad_name=${lead.adName ?? "—"}, form_name=${formName ?? "—"}) — creating contact without an opportunity`
    );
  }

  let contactId: string;
  let contactCreated: boolean;

  const existing = phone ? await findContactByPhone(supabase, phone) : null;
  if (existing) {
    contactId = existing.id;
    contactCreated = false;
  } else {
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .insert({ name, phone, email, source: "Facebook Ads" })
      .select("id")
      .single();
    if (contactError) throw contactError;
    contactId = contact.id;
    contactCreated = true;
  }

  let opportunityId: string | null = null;
  if (pipelineId && stage) {
    const { data: opp, error: oppError } = await supabase
      .from("opportunities")
      .insert({
        contact_id: contactId,
        pipeline_id: pipelineId,
        stage_id: stage.id,
        campaign: campaignLabel,
      })
      .select("id")
      .single();
    if (oppError) throw oppError;
    opportunityId = opp.id;
  }

  const logSuffix = campaignLabel ? ` — καμπάνια: ${campaignLabel}` : "";
  const logContent =
    routedBy === "unrouted"
      ? `Νέο lead από Facebook Ads${logSuffix} (χωρίς pipeline — δεν βρέθηκε κανόνας δρομολόγησης)`
      : `Νέο lead από Facebook Ads${logSuffix}`;

  const { error: activityError } = await supabase.from("activity_log").insert({
    contact_id: contactId,
    opportunity_id: opportunityId,
    type: "note" as ActivityType,
    content: logContent,
  });
  if (activityError) throw activityError;

  return {
    contactId,
    contactCreated,
    opportunityId,
    pipelineName,
    stageName: stage?.name ?? null,
    routedBy,
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
