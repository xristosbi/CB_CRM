import { NextResponse, type NextRequest } from "next/server";

import { requireCallerAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

interface ResetPasswordBody {
  newPassword?: string;
}

function outcome(body: { success: boolean; reason?: string }, status = 200) {
  return NextResponse.json(body, { status });
}

// The admin types the new temp password themselves (same form shape as
// creating a user), so this route never generates or returns a password —
// it only ever applies the one the admin already knows.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCallerAdmin();
  if (!auth.ok) {
    return outcome({ success: false, reason: auth.reason }, auth.status);
  }

  const { id } = await params;

  let body: ResetPasswordBody;
  try {
    body = (await request.json()) as ResetPasswordBody;
  } catch {
    return outcome({ success: false, reason: "invalid json" }, 400);
  }

  const newPassword = body.newPassword ?? "";
  if (newPassword.length < 8) {
    return outcome({ success: false, reason: "newPassword must be at least 8 characters" }, 400);
  }

  let adminClient: ReturnType<typeof createAdminClient>;
  try {
    adminClient = createAdminClient();
  } catch (err) {
    console.error("admin/users/reset-password: admin client not configured", err);
    return outcome({ success: false, reason: "server not configured" }, 500);
  }

  const { error } = await adminClient.auth.admin.updateUserById(id, { password: newPassword });
  if (error) {
    console.error("admin/users/reset-password: updateUserById failed", error);
    return outcome({ success: false, reason: error.message }, 400);
  }

  return outcome({ success: true });
}
