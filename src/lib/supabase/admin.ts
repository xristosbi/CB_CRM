import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

// Service-role client for server-only code that must write without a user
// session (e.g. the Facebook webhook route, called by Meta — not a logged-in
// user). Bypasses RLS, so it must never be imported by client components or
// exposed to the browser. SUPABASE_SERVICE_ROLE_KEY has no NEXT_PUBLIC_
// prefix precisely to keep it server-only.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "createAdminClient: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set."
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
