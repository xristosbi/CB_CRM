import type { CalendarEventType } from "@/lib/database.types";

export interface CalendarWebhookPayload {
  action: "created" | "updated" | "deleted";
  id: string;
  title: string;
  type: CalendarEventType;
  starts_at: string;
  ends_at: string;
  notes: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  google_event_id: string | null;
}

// Fire-and-forget: a Make outage (or a missing MAKE_CALENDAR_WEBHOOK_URL)
// must never surface as an appointment failure — this never throws.
export function notifyCalendarWebhook(payload: CalendarWebhookPayload): void {
  fetch("/api/internal/calendar-webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch((err) => {
    console.warn("calendar webhook notify failed", err);
  });
}
