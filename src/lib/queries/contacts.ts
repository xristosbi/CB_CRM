import type { SupabaseClient } from "@supabase/supabase-js";

import type { ActivityType, Database } from "@/lib/database.types";
import type { ActivityEntry, Contact, ContactOpportunity, FollowUpTask } from "@/lib/types";

type TypedClient = SupabaseClient<Database>;

interface OpportunityWithRelationsRow {
  id: string;
  pipeline_id: string;
  stage_id: string;
  value: number | null;
  campaign: string | null;
  pipelines: { name: string } | { name: string }[] | null;
  pipeline_stages: { name: string } | { name: string }[] | null;
}

export async function fetchContacts(supabase: TypedClient): Promise<Contact[]> {
  const { data, error } = await supabase
    .from("contacts")
    .select("id, name, phone, email, website, source, tags, created_at")
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchContactDetail(
  supabase: TypedClient,
  contactId: string
): Promise<{
  contact: Contact;
  opportunities: ContactOpportunity[];
  activity: ActivityEntry[];
  tasks: FollowUpTask[];
} | null> {
  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .select("id, name, phone, email, website, source, tags, created_at")
    .eq("id", contactId)
    .maybeSingle();
  if (contactError) throw contactError;
  if (!contact) return null;

  const [{ data: opportunities, error: oppError }, { data: activity, error: activityError }, { data: tasks, error: tasksError }] =
    await Promise.all([
      supabase
        .from("opportunities")
        .select("id, pipeline_id, stage_id, value, campaign, pipelines(name), pipeline_stages(name)")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false })
        .returns<OpportunityWithRelationsRow[]>(),
      supabase
        .from("activity_log")
        .select("id, opportunity_id, type, content, created_at")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false }),
      supabase
        .from("tasks")
        .select("id, title, due_at, done, created_at")
        .eq("contact_id", contactId)
        .order("due_at", { ascending: true, nullsFirst: false }),
    ]);

  if (oppError) throw oppError;
  if (activityError) throw activityError;
  if (tasksError) throw tasksError;

  return {
    contact,
    opportunities: (opportunities ?? []).map((row) => {
      const pipeline = Array.isArray(row.pipelines) ? row.pipelines[0] : row.pipelines;
      const stage = Array.isArray(row.pipeline_stages) ? row.pipeline_stages[0] : row.pipeline_stages;
      return {
        id: row.id,
        pipeline_id: row.pipeline_id,
        pipeline_name: pipeline?.name ?? "—",
        stage_id: row.stage_id,
        stage_name: stage?.name ?? "—",
        value: row.value,
        campaign: row.campaign,
      };
    }),
    activity: activity ?? [],
    tasks: tasks ?? [],
  };
}

export async function addNote(supabase: TypedClient, contactId: string, content: string) {
  const { data, error } = await supabase
    .from("activity_log")
    .insert({ contact_id: contactId, type: "note" as ActivityType, content })
    .select("id, opportunity_id, type, content, created_at")
    .single();
  if (error) throw error;
  return data;
}

export async function addTask(
  supabase: TypedClient,
  contactId: string,
  title: string,
  dueAt: string | null
) {
  const { data, error } = await supabase
    .from("tasks")
    .insert({ contact_id: contactId, title, due_at: dueAt })
    .select("id, title, due_at, done, created_at")
    .single();
  if (error) throw error;
  return data;
}

export async function setTaskDone(supabase: TypedClient, taskId: string, done: boolean) {
  const { error } = await supabase.from("tasks").update({ done }).eq("id", taskId);
  if (error) throw error;
}

export interface ContactInput {
  name: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  source: string | null;
  tags: string[];
}

const CONTACT_COLUMNS = "id, name, phone, email, website, source, tags, created_at";

export async function createContact(
  supabase: TypedClient,
  input: ContactInput
): Promise<Contact> {
  const { data, error } = await supabase
    .from("contacts")
    .insert(input)
    .select(CONTACT_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

export async function updateContact(
  supabase: TypedClient,
  contactId: string,
  input: ContactInput
): Promise<Contact> {
  const { data, error } = await supabase
    .from("contacts")
    .update(input)
    .eq("id", contactId)
    .select(CONTACT_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

export async function createLead(
  supabase: TypedClient,
  contactInput: ContactInput,
  opportunity: { pipeline_id: string; stage_id: string } | null
): Promise<{ contact: Contact; opportunityId: string | null }> {
  const contact = await createContact(supabase, contactInput);

  let opportunityId: string | null = null;
  if (opportunity) {
    const { data: opp, error: oppError } = await supabase
      .from("opportunities")
      .insert({
        contact_id: contact.id,
        pipeline_id: opportunity.pipeline_id,
        stage_id: opportunity.stage_id,
      })
      .select("id")
      .single();
    if (oppError) throw oppError;
    opportunityId = opp.id;
  }

  const { error: activityError } = await supabase.from("activity_log").insert({
    contact_id: contact.id,
    opportunity_id: opportunityId,
    type: "note" as ActivityType,
    content: "Δημιουργήθηκε νέο lead",
  });
  if (activityError) throw activityError;

  return { contact, opportunityId };
}

export async function updateContactWithLog(
  supabase: TypedClient,
  contactId: string,
  input: ContactInput,
  logChange: boolean
): Promise<Contact> {
  const contact = await updateContact(supabase, contactId, input);
  if (logChange) {
    const { error } = await supabase.from("activity_log").insert({
      contact_id: contactId,
      type: "note" as ActivityType,
      content: "Ενημερώθηκαν στοιχεία επικοινωνίας",
    });
    if (error) throw error;
  }
  return contact;
}

export async function deleteContact(supabase: TypedClient, contactId: string): Promise<void> {
  // FK cascades (opportunities, activity_log, tasks, payments) handle the rest.
  const { error } = await supabase.from("contacts").delete().eq("id", contactId);
  if (error) throw error;
}

export async function updateActivityContent(
  supabase: TypedClient,
  activityId: string,
  content: string
): Promise<void> {
  const { error } = await supabase
    .from("activity_log")
    .update({ content })
    .eq("id", activityId);
  if (error) throw error;
}

export async function deleteActivityEntry(supabase: TypedClient, activityId: string): Promise<void> {
  const { error } = await supabase.from("activity_log").delete().eq("id", activityId);
  if (error) throw error;
}
