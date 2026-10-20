import type { SupabaseClient } from "@supabase/supabase-js";

import type { CalendarEventType, Database } from "@/lib/database.types";
import type { CalendarEvent } from "@/lib/types";

type TypedClient = SupabaseClient<Database>;

const EVENT_COLUMNS =
  "id, title, starts_at, ends_at, type, contact_id, opportunity_id, notes, google_event_id, assigned_to";
const EVENT_SELECT = `${EVENT_COLUMNS}, contacts(name, phone, email), profiles(display_name)`;

interface EventRow {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  type: CalendarEventType;
  contact_id: string | null;
  opportunity_id: string | null;
  notes: string | null;
  google_event_id: string | null;
  assigned_to: string | null;
  contacts:
    | { name: string; phone: string | null; email: string | null }
    | { name: string; phone: string | null; email: string | null }[]
    | null;
  profiles: { display_name: string | null } | { display_name: string | null }[] | null;
}

function mapRow(row: EventRow): CalendarEvent {
  const contact = Array.isArray(row.contacts) ? row.contacts[0] : row.contacts;
  const assignee = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
    title: row.title,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    type: row.type,
    contact_id: row.contact_id,
    contact_name: contact?.name ?? null,
    contact_phone: contact?.phone ?? null,
    contact_email: contact?.email ?? null,
    opportunity_id: row.opportunity_id,
    notes: row.notes,
    google_event_id: row.google_event_id,
    assigned_to: row.assigned_to,
    assigned_to_name: assignee?.display_name ?? null,
  };
}

export async function fetchCalendarEvents(supabase: TypedClient): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from("calendar_events")
    .select(EVENT_SELECT)
    .order("starts_at", { ascending: true })
    .returns<EventRow[]>();
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function fetchCalendarEventsForContact(
  supabase: TypedClient,
  contactId: string
): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from("calendar_events")
    .select(EVENT_SELECT)
    .eq("contact_id", contactId)
    .order("starts_at", { ascending: false })
    .returns<EventRow[]>();
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

// Lightweight (no joins): just enough for the kanban card's "next
// appointment" badge — the earliest upcoming event per contact.
export async function fetchNextAppointmentByContact(
  supabase: TypedClient
): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("calendar_events")
    .select("contact_id, starts_at")
    .not("contact_id", "is", null)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });
  if (error) throw error;

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    if (!row.contact_id) continue;
    if (!map.has(row.contact_id)) map.set(row.contact_id, row.starts_at);
  }
  return map;
}

export interface CalendarEventInput {
  title: string;
  starts_at: string;
  ends_at: string;
  type: CalendarEventType;
  contact_id: string | null;
  opportunity_id: string | null;
  notes: string | null;
  assigned_to: string | null;
}

// Selecting back the embedded `contacts(...)` relation doesn't play well
// with `.single()`'s generic inference, so 0-rows-from-RLS is instead
// checked manually here — same guarantee (a blocked write becomes a real
// thrown error, not a silently-ignored no-op), just spelled out by hand.
export async function createCalendarEvent(
  supabase: TypedClient,
  input: CalendarEventInput
): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from("calendar_events")
    .insert(input)
    .select(EVENT_SELECT)
    .returns<EventRow[]>();
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("calendar_events insert returned no row");
  return mapRow(data[0]);
}

export async function updateCalendarEvent(
  supabase: TypedClient,
  id: string,
  input: CalendarEventInput
): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from("calendar_events")
    .update(input)
    .eq("id", id)
    .select(EVENT_SELECT)
    .returns<EventRow[]>();
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("calendar_events update returned no row");
  return mapRow(data[0]);
}

export async function deleteCalendarEvent(supabase: TypedClient, id: string): Promise<void> {
  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", id)
    .select("id")
    .single();
  if (error) throw error;
}
