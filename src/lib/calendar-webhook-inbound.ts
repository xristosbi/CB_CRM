import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { findContactByPhone } from "@/lib/facebook-leads";

type TypedClient = SupabaseClient<Database>;

export interface CalendarUpsertInput {
  google_event_id: string;
  title?: string;
  starts_at: string;
  ends_at: string;
  notes?: string | null;
  contact_phone?: string | null;
}

export interface CalendarUpsertResult {
  id: string;
  created: boolean;
}

// Upserts a calendar_events row by google_event_id — called by the inbound
// Make.com webhook (step 2: Google Calendar sync), extracted out of the
// route handler so it can be exercised directly against a mock Supabase
// client in tests, the same pattern facebook-leads.ts uses for its webhook
// helpers.
export async function upsertCalendarEventFromWebhook(
  supabase: TypedClient,
  input: CalendarUpsertInput
): Promise<CalendarUpsertResult> {
  const title = input.title?.trim() || "Ραντεβού (Google Calendar)";
  const phone = input.contact_phone?.trim() || null;

  let matchedContactId: string | null = null;
  if (phone) {
    const contact = await findContactByPhone(supabase, phone);
    matchedContactId = contact?.id ?? null;
  }

  const { data: existing, error: findError } = await supabase
    .from("calendar_events")
    .select("id")
    .eq("google_event_id", input.google_event_id)
    .maybeSingle();
  if (findError) throw findError;

  if (existing) {
    // Only touch contact_id when this call actually carried a phone —
    // otherwise a later update with no phone would silently unlink an
    // already-matched contact.
    const updatePayload: {
      title: string;
      starts_at: string;
      ends_at: string;
      notes: string | null;
      contact_id?: string | null;
    } = {
      title,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      notes: input.notes ?? null,
    };
    if (phone) updatePayload.contact_id = matchedContactId;

    const { error } = await supabase
      .from("calendar_events")
      .update(updatePayload)
      .eq("id", existing.id)
      .select("id")
      .single();
    if (error) throw error;
    return { id: existing.id, created: false };
  }

  const { data: created, error } = await supabase
    .from("calendar_events")
    .insert({
      title,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      notes: input.notes ?? null,
      contact_id: matchedContactId,
      google_event_id: input.google_event_id,
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: created.id, created: true };
}

export async function deleteCalendarEventByGoogleId(
  supabase: TypedClient,
  googleEventId: string
): Promise<void> {
  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("google_event_id", googleEventId);
  if (error) throw error;
}
