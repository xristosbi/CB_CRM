import type { CalendarEventType } from "@/lib/database.types";
import { formatAthensDateLong, formatAthensTime } from "@/lib/calendar-tz";

export const CALENDAR_EVENT_TYPES: CalendarEventType[] = [
  "sales_call",
  "setting_call",
  "follow_up",
  "other",
];

export const CALENDAR_EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  sales_call: "Κλήση πώλησης",
  setting_call: "Κλήση ρύθμισης",
  follow_up: "Follow-up",
  other: "Άλλο",
};

// Flat (non-theme-token) colors: the app's palette only has a handful of
// semantic tokens (primary/success/warning/destructive), not four distinct
// hues to spare, and a small colored dot/chip reads fine unmixed in both
// light and dark mode.
export const CALENDAR_EVENT_TYPE_COLORS: Record<
  CalendarEventType,
  { bg: string; border: string; text: string; dot: string }
> = {
  sales_call: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-300 dark:border-blue-800",
    text: "text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  setting_call: {
    bg: "bg-violet-50 dark:bg-violet-950/40",
    border: "border-violet-300 dark:border-violet-800",
    text: "text-violet-700 dark:text-violet-300",
    dot: "bg-violet-500",
  },
  follow_up: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-300 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  other: {
    bg: "bg-slate-50 dark:bg-slate-900/40",
    border: "border-slate-300 dark:border-slate-700",
    text: "text-slate-700 dark:text-slate-300",
    dot: "bg-slate-500",
  },
};

// Used for the kanban card's "next appointment" badge in mock mode (real
// mode uses the lighter fetchNextAppointmentByContact DB query instead).
export function computeNextAppointmentByContact(
  events: { contact_id: string | null; starts_at: string }[]
): Record<string, string> {
  const nowIso = new Date().toISOString();
  const upcoming = events
    .filter((e) => e.contact_id && e.starts_at >= nowIso)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  const result: Record<string, string> = {};
  for (const e of upcoming) {
    if (!e.contact_id || result[e.contact_id]) continue;
    result[e.contact_id] = e.starts_at;
  }
  return result;
}

export function buildAppointmentLogContent(type: CalendarEventType, startsAtIso: string): string {
  const date = new Date(startsAtIso);
  return `Κλείστηκε ${CALENDAR_EVENT_TYPE_LABELS[type]} στις ${formatAthensDateLong(date)} ${formatAthensTime(date)}`;
}
