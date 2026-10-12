import { NextResponse, type NextRequest } from "next/server";

// Relays a calendar event change to Make.com server-side, so the outbound
// POST comes from our own server (keeping MAKE_CALENDAR_WEBHOOK_URL off the
// browser's network tab) and so a Make outage can never fail the
// appointment itself — the client calls this fire-and-forget right after
// its own Supabase write already succeeded.
export async function POST(request: NextRequest) {
  const webhookUrl = process.env.MAKE_CALENDAR_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json({ ok: true, skipped: true, reason: "MAKE_CALENDAR_WEBHOOK_URL not set" });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid json" });
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error(`calendar-webhook relay: Make responded ${res.status}`);
    }
    return NextResponse.json({ ok: res.ok });
  } catch (err) {
    console.error("calendar-webhook relay: failed to reach Make", err);
    return NextResponse.json({ ok: false, reason: "network error" });
  }
}
