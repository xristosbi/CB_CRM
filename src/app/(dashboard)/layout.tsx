import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!hasSupabaseEnv()) {
    return <DashboardShell email={null}>{children}</DashboardShell>;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <DashboardShell email={user.email ?? null}>{children}</DashboardShell>;
}
