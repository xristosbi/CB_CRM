import { NextResponse, type NextRequest } from "next/server";

import { requireCallerAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

interface DeleteUserBody {
  reassignTo?: string | null;
}

function outcome(body: { success: boolean; reason?: string; mode?: "deleted" | "deactivated" }, status = 200) {
  return NextResponse.json(body, { status });
}

// Removes a teammate. The normal path is a hard delete of their auth.users
// row: every table that references profiles.id uses "on delete set null"
// (see 0008_users_assignment.sql), and profiles itself cascades from
// auth.users, so this alone leaves no orphans — leads/opportunities/events
// just become unassigned. When a reassignTo id is given, assignments are
// moved to that teammate first instead of being nulled.
//
// If the hard delete fails for any reason, falls back to deactivating the
// account (login blocked, hidden from profile lists) rather than leaving
// the member half-removed — the response's `mode` tells the caller which
// one happened so the UI can say so.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCallerAdmin();
  if (!auth.ok) {
    return outcome({ success: false, reason: auth.reason }, auth.status);
  }

  const { id } = await params;

  if (id === auth.user.id) {
    return outcome({ success: false, reason: "cannot delete your own account" }, 400);
  }

  let body: DeleteUserBody = {};
  try {
    body = (await request.json()) as DeleteUserBody;
  } catch {
    // no body is fine — reassignTo is optional
  }
  const reassignTo = body.reassignTo ?? null;

  let adminClient: ReturnType<typeof createAdminClient>;
  try {
    adminClient = createAdminClient();
  } catch (err) {
    console.error("admin/users delete: admin client not configured", err);
    return outcome({ success: false, reason: "server not configured" }, 500);
  }

  if (reassignTo) {
    const { data: targetProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("id", reassignTo)
      .maybeSingle();
    if (!targetProfile) {
      return outcome({ success: false, reason: "invalid reassignment target" }, 400);
    }

    const { error: reassignOppsErr } = await adminClient
      .from("opportunities")
      .update({ assigned_to: reassignTo })
      .eq("assigned_to", id);
    const { error: reassignEventsErr } = await adminClient
      .from("calendar_events")
      .update({ assigned_to: reassignTo })
      .eq("assigned_to", id);

    if (reassignOppsErr || reassignEventsErr) {
      console.error("admin/users delete: reassignment failed", reassignOppsErr, reassignEventsErr);
      return outcome({ success: false, reason: "reassignment failed" }, 400);
    }
  }

  const { error: deleteErr } = await adminClient.auth.admin.deleteUser(id);
  if (!deleteErr) {
    return outcome({ success: true, mode: "deleted" });
  }

  console.error("admin/users delete: hard delete failed, falling back to deactivate", deleteErr);

  const { error: banErr } = await adminClient.auth.admin.updateUserById(id, { ban_duration: "876000h" });
  const { error: profileErr } = await adminClient
    .from("profiles")
    .update({ is_active: false })
    .eq("id", id);

  if (banErr || profileErr) {
    return outcome({ success: false, reason: deleteErr.message }, 400);
  }

  return outcome({ success: true, mode: "deactivated" });
}
