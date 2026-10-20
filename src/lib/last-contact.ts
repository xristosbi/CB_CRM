import type { ActivityEntry } from "@/lib/types";

export interface LastContactInfo {
  type: "call" | "note";
  user_id: string | null;
  user_name: string | null;
  created_at: string;
}

// Shared by the demo-data branches (leads board, contact detail) — the
// real/live branches get the same shape from fetchLastContactByContact's
// one grouped Supabase query instead.
export function computeLastContactByContact(
  activities: (ActivityEntry & { contact_id: string })[]
): Record<string, LastContactInfo> {
  const sorted = [...activities].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const map: Record<string, LastContactInfo> = {};
  for (const a of sorted) {
    if (a.type !== "call" && a.type !== "note") continue;
    if (map[a.contact_id]) continue;
    map[a.contact_id] = {
      type: a.type,
      user_id: a.user_id,
      user_name: a.user_name,
      created_at: a.created_at,
    };
  }
  return map;
}
