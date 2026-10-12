import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { deleteCalendarEventByGoogleId, upsertCalendarEventFromWebhook } from "@/lib/calendar-webhook-inbound";

// Inbound side of the step-2 Google Calendar <-> Make.com sync: Make calls
// this whenever an event is created/changed/removed on the Google side.
// This route only ever writes via the admin (service-role) client and
// never calls the outbound relay itself — so a change that arrived FROM
// Make can never bounce back out to Make as if it were new, avoiding a
// sync loop by construction rather than a flag.
interface CalendarWebhookBody {
  action?: "upsert" | "delete";
  google_event_id?: string;
  title?: string;
  starts_at?: string;
  ends_at?: string;
  notes?: string | null;
  contact_phone?: string | null;
}

// Mirrors the make-lead webhook's convention: Make's HTTP module treats any
// non-2xx as a scenario error, so every outcome except authentication
// returns 200 with a `success` flag Make can branch/log on.
function outcome(body: { success: boolean; reason?: string; id?: string }, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(request: NextRequest) {
  const providedSecret = request.headers.get("x-make-secret");
  const expectedSecret = process.env.MAKE_WEBHOOK_SECRET;
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return outcome({ success: false, reason: "unauthorized" }, 401);
  }

  let body: CalendarWebhookBody;
  try {
    body = (await request.json()) as CalendarWebhookBody;
  } catch {
    return outcome({ success: false, reason: "invalid json" });
  }

  const googleEventId = body.google_event_id?.trim();
  if (!googleEventId) {
    return outcome({ success: false, reason: "google_event_id is required" });
  }

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch (err) {
    console.error("calendar-event webhook: Supabase admin client not configured", err);
    return outcome({ success: false, reason: "server not configured" });
  }

  if (body.action === "delete") {
    try {
      await deleteCalendarEventByGoogleId(supabase, googleEventId);
      return outcome({ success: true });
    } catch (err) {
      console.error("calendar-event webhook: delete failed", err);
      return outcome({ success: false, reason: "delete failed" });
    }
  }

  // Default and explicit "upsert".
  if (!body.starts_at || !body.ends_at) {
    return outcome({ success: false, reason: "starts_at and ends_at are required" });
  }

  try {
    const result = await upsertCalendarEventFromWebhook(supabase, {
      google_event_id: googleEventId,
      title: body.title,
      starts_at: body.starts_at,
      ends_at: body.ends_at,
      notes: body.notes,
      contact_phone: body.contact_phone,
    });
    return outcome({ success: true, id: result.id });
  } catch (err) {
    console.error("calendar-event webhook: upsert failed", err);
    return outcome({ success: false, reason: "upsert failed" });
  }
}
