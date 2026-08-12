import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import type { Expense } from "@/lib/types";

type TypedClient = SupabaseClient<Database>;

const COLUMNS = "id, description, amount, category, date, notes, created_at";

export async function fetchExpenses(supabase: TypedClient): Promise<Expense[]> {
  const { data, error } = await supabase
    .from("expenses")
    .select(COLUMNS)
    .order("date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createExpense(
  supabase: TypedClient,
  input: {
    description: string;
    amount: number;
    category: string | null;
    date: string;
    notes: string | null;
  }
): Promise<Expense> {
  const { data, error } = await supabase
    .from("expenses")
    .insert(input)
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

export async function updateExpense(
  supabase: TypedClient,
  expenseId: string,
  input: {
    description: string;
    amount: number;
    category: string | null;
    date: string;
    notes: string | null;
  }
): Promise<Expense> {
  const { data, error } = await supabase
    .from("expenses")
    .update(input)
    .eq("id", expenseId)
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteExpense(supabase: TypedClient, expenseId: string): Promise<void> {
  const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
  if (error) throw error;
}
