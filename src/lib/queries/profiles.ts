import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, UserRole } from "@/lib/database.types";
import type { Profile } from "@/lib/types";

type TypedClient = SupabaseClient<Database>;

const COLUMNS = "id, full_name, display_name, email, role, color, created_at";

export async function fetchProfiles(supabase: TypedClient): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(COLUMNS)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchProfile(supabase: TypedClient, userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select(COLUMNS).eq("id", userId).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function updateProfile(
  supabase: TypedClient,
  userId: string,
  input: { full_name?: string | null; display_name?: string | null; role?: UserRole }
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update(input)
    .eq("id", userId)
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return data;
}
