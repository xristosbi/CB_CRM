import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { extractLeadgenIds, processLeadgenEvent } from "@/lib/facebook-leads";

// Meta's webhook subscription handshake: echoes hub.challenge back once the
// verify token matches what's configured in the Meta App dashboard.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && challenge && token === process.env.FB_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

// Meta calls this for every leadgen event (and retries on non-2xx), so it
// must always return 200 quickly once the payload itself is valid JSON —
// per-lead failures are logged, not surfaced as an HTTP error, so one bad
// lead can't make Meta think the whole webhook is down and disable it.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const leadgenIds = extractLeadgenIds(body);
  if (leadgenIds.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch (err) {
    console.error("facebook-leads webhook: Supabase admin client not configured", err);
    return NextResponse.json({ ok: false, error: "server not configured" }, { status: 500 });
  }

  let processed = 0;
  for (const leadgenId of leadgenIds) {
    try {
      await processLeadgenEvent(supabase, leadgenId);
      processed++;
    } catch (err) {
      console.error(`facebook-leads webhook: failed to process leadgen ${leadgenId}`, err);
    }
  }

  return NextResponse.json({ ok: true, processed, total: leadgenIds.length });
}
