import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { CurrentUserProvider } from "@/lib/hooks/use-current-user";
import { MOCK_CURRENT_USER, MOCK_PROFILES } from "@/lib/mock-data";
import { fetchProfile, fetchProfiles } from "@/lib/queries/profiles";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { USER_EMAIL_HEADER, USER_ID_HEADER } from "@/lib/supabase/middleware";
import type { Profile } from "@/lib/types";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!hasSupabaseEnv()) {
    return (
      <CurrentUserProvider
        initialCurrentUser={MOCK_CURRENT_USER}
        initialProfiles={MOCK_PROFILES}
        usingMockData
      >
        <DashboardShell>{children}</DashboardShell>
      </CurrentUserProvider>
    );
  }

  const supabase = await createClient();

  // The proxy (middleware) already verified the JWT for this request and
  // forwards the identity via headers — reading it here avoids a second
  // network round trip to Supabase Auth on every single navigation (the
  // middleware's getClaims()/getUser() call was already one). Only falls
  // back to calling auth.getUser() itself if those headers are somehow
  // missing (e.g. the proxy matcher doesn't cover this request).
  const requestHeaders = await headers();
  let userId = requestHeaders.get(USER_ID_HEADER) ?? "";
  let userEmail = requestHeaders.get(USER_EMAIL_HEADER) ?? "";

  if (!userId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      redirect("/login");
    }
    userId = user.id;
    userEmail = user.email ?? "";
  }

  // A profile should always exist (the signup trigger creates one), but
  // this stays resilient if migration 0008 hasn't been run yet on this
  // Supabase project — falling back to a usable admin profile rather than
  // crashing the whole dashboard.
  const fallbackProfile: Profile = {
    id: userId,
    full_name: null,
    display_name: userEmail.split("@")[0] || "Χρήστης",
    email: userEmail || null,
    role: "admin",
    color: null,
    created_at: new Date().toISOString(),
  };

  let currentUser: Profile = fallbackProfile;
  let profiles: Profile[] = [fallbackProfile];
  try {
    const [fetchedProfile, fetchedProfiles] = await Promise.all([
      fetchProfile(supabase, userId),
      fetchProfiles(supabase),
    ]);
    currentUser = fetchedProfile ?? fallbackProfile;
    profiles = fetchedProfiles.length > 0 ? fetchedProfiles : [currentUser];
  } catch (err) {
    console.error(
      "DashboardLayout: failed to load profiles — has migration 0008_users_assignment.sql been run?",
      err
    );
  }

  return (
    <CurrentUserProvider initialCurrentUser={currentUser} initialProfiles={profiles} usingMockData={false}>
      <DashboardShell>{children}</DashboardShell>
    </CurrentUserProvider>
  );
}
