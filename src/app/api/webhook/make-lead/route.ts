import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { buildTelegramMessage, createLeadFromMake, notifyTelegram } from "@/lib/facebook-leads";

// Simpler sibling to /api/webhook/facebook-leads for leads relayed through a
// Make.com scenario (Facebook Lead Ads module) instead of Meta's own
// webhook — used while the Meta App's leads_retrieval permission isn't
// approved yet, since Make's connector already has it. The body is already
// a flat, parsed lead (no leadgen_id, no Graph API round-trip needed here).
interface MakeLeadBody {
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
  ad_name?: string;
  campaign_name?: string;
  created_time?: string;
}

// Make's HTTP module treats any non-2xx as a scenario error (retries/stops
// the run) rather than a value it can branch on — so every outcome except
// authentication returns 200 with a `success` flag Make can inspect and log.
function outcome(body: { success: boolean; reason?: string; contact_id?: string; routed_to?: string }, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(request: NextRequest) {
  const providedSecret = request.headers.get("x-make-secret");
  const expectedSecret = process.env.MAKE_WEBHOOK_SECRET;
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return outcome({ success: false, reason: "unauthorized" }, 401);
  }

  let body: MakeLeadBody;
  try {
    body = (await request.json()) as MakeLeadBody;
  } catch {
    return outcome({ success: false, reason: "invalid json" });
  }

  const name = body.name?.trim() || "Facebook Lead";
  const email = body.email?.trim() || null;
  const phone = body.phone?.trim() || null;
  const website = body.website?.trim() || null;
  const adName = body.ad_name?.trim() || null;
  const campaignName = body.campaign_name?.trim() || null;

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch (err) {
    console.error("make-lead webhook: Supabase admin client not configured", err);
    return outcome({ success: false, reason: "server not configured" });
  }

  try {
    const result = await createLeadFromMake(supabase, {
      name,
      email,
      phone,
      website,
      adName,
      campaignName,
    });

    await notifyTelegram(buildTelegramMessage(name, phone, email, result));

    return outcome({
      success: true,
      contact_id: result.contactId,
      routed_to: result.pipelineName ?? "unrouted",
    });
  } catch (err) {
    console.error("make-lead webhook: failed to process lead", err);
    return outcome({ success: false, reason: "processing failed" });
  }
}
