import { TeamSettings } from "@/components/settings/team-settings";
import { MOCK_PROFILES } from "@/lib/mock-data";
import { fetchProfiles } from "@/lib/queries/profiles";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const usingMockData = !hasSupabaseEnv();
  const profiles = usingMockData ? MOCK_PROFILES : await fetchProfiles(await createClient());

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Ρυθμίσεις</h1>

      <div className="mt-6">
        <TeamSettings initialProfiles={profiles} usingMockData={usingMockData} />
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Διαχείριση pipelines &amp; stages έρχεται σε επόμενο βήμα.
      </p>
    </div>
  );
}
