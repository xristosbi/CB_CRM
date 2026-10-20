import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export type RequireAdminResult =
  | { ok: true; user: User }
  | { ok: false; status: 401 | 403; reason: string };

// Server-side gate for the admin-only API routes below. Reads the role
// from the caller's OWN session (never trusts a client-supplied flag) —
// this is the real authorization check; any UI-side hiding is cosmetic.
export async function requireCallerAdmin(): Promise<RequireAdminResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, status: 401, reason: "unauthorized" };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile || profile.role !== "admin") {
    return { ok: false, status: 403, reason: "forbidden" };
  }

  return { ok: true, user };
}
