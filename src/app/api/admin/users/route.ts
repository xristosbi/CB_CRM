import { NextResponse, type NextRequest } from "next/server";

import { requireCallerAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

interface CreateUserBody {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  displayName?: string;
  fullAccess?: boolean;
}

function outcome(body: { success: boolean; reason?: string; userId?: string }, status = 200) {
  return NextResponse.json(body, { status });
}

// Creates a teammate's auth account. The caller's admin status is verified
// from their own session server-side (requireCallerAdmin) — a UI-side
// check alone would let anyone with devtools call this route directly.
// The temp password is supplied by the admin and is never echoed back;
// the service-role key never leaves this server-only module.
export async function POST(request: NextRequest) {
  const auth = await requireCallerAdmin();
  if (!auth.ok) {
    return outcome({ success: false, reason: auth.reason }, auth.status);
  }

  let body: CreateUserBody;
  try {
    body = (await request.json()) as CreateUserBody;
  } catch {
    return outcome({ success: false, reason: "invalid json" }, 400);
  }

  const firstName = body.firstName?.trim() ?? "";
  const lastName = body.lastName?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const fullAccess = body.fullAccess === true;

  if (!firstName || !email || password.length < 8) {
    return outcome(
      { success: false, reason: "firstName, email and a password of at least 8 characters are required" },
      400
    );
  }

  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const displayName = body.displayName?.trim() || undefined;

  let adminClient: ReturnType<typeof createAdminClient>;
  try {
    adminClient = createAdminClient();
  } catch (err) {
    console.error("admin/users: admin client not configured", err);
    return outcome({ success: false, reason: "server not configured" }, 500);
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      display_name: displayName,
      role: fullAccess ? "admin" : "setter",
    },
  });

  if (error || !data.user) {
    console.error("admin/users: createUser failed", error);
    return outcome({ success: false, reason: error?.message ?? "createUser failed" }, 400);
  }

  return outcome({ success: true, userId: data.user.id });
}
