"use client";

import { useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

// Covers everything below the root layout (login + the whole dashboard,
// including its own layout.tsx) — the most common cause of a cold "couldn't
// load" is a transient hiccup on the very first serverless/Supabase round
// trip, which usually just works on an immediate second try. This retries
// automatically, once, before ever showing the person an error.
const RETRY_KEY = "cb-crm-error-auto-retry-at";
const COOLDOWN_MS = 10_000;

function readShouldAutoRetry(): boolean {
  try {
    const lastRetryAt = Number(sessionStorage.getItem(RETRY_KEY) ?? 0);
    return Date.now() - lastRetryAt > COOLDOWN_MS;
  } catch {
    // sessionStorage unavailable (private browsing, etc.) — skip straight
    // to the manual button rather than risk retrying forever.
    return false;
  }
}

export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [shouldAutoRetry] = useState(readShouldAutoRetry);

  useEffect(() => {
    console.error("Route error boundary:", error);
  }, [error]);

  useEffect(() => {
    if (!shouldAutoRetry) return;
    try {
      sessionStorage.setItem(RETRY_KEY, String(Date.now()));
    } catch {
      // Ignore — worst case this auto-retries more than once.
    }
    const timer = setTimeout(reset, 400);
    return () => clearTimeout(timer);
  }, [shouldAutoRetry, reset]);

  if (shouldAutoRetry) {
    // Deliberately quiet during the automatic retry — most of the time
    // this resolves before the person even registers it.
    return null;
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-lg font-semibold">Κάτι πήγε στραβά.</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Δεν ήταν δυνατή η φόρτωση της σελίδας. Δοκίμασε ξανά — αν συνεχίζει να
        εμφανίζεται, έλεγξε τη σύνδεσή σου στο internet.
      </p>
      <Button
        onClick={() => {
          try {
            sessionStorage.removeItem(RETRY_KEY);
          } catch {
            // Ignore.
          }
          reset();
        }}
      >
        <RefreshCcw className="size-4" />
        Δοκίμασε ξανά
      </Button>
    </div>
  );
}
