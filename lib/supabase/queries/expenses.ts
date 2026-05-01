import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type ExpenseRow = Database["public"]["Tables"]["expenses"]["Row"];
type ExpenseInsert = Database["public"]["Tables"]["expenses"]["Insert"];

export type Expense = ExpenseRow;

export interface AddExpenseInput {
  item: string;
  category?: string;
  amount: number;
  date: string;
  description?: string;
  receipt_url?: string | null;
}

async function getMyProfile() {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: profile, error } = await supabase
    .from("users")
    .select("id, business_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!profile) throw new Error("Business profile not found");

  return { supabase, profile };
}

export async function getExpenses(jobId: string, businessId: string): Promise<Expense[]> {
  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("job_id", jobId)
    .eq("business_id", businessId)
    .order("date", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function addExpense(jobId: string, input: AddExpenseInput) {
  const { supabase, profile } = await getMyProfile();

  const payload: ExpenseInsert = {
    job_id: jobId,
    business_id: profile.business_id,
    item: input.item.trim(),
    category: input.category?.trim() || null,
    amount: Number(input.amount || 0),
    date: input.date,
    description: input.description?.trim() || null,
    receipt_url: input.receipt_url || null,
    user_id: profile.id,
  };

  const { error } = await supabase.from("expenses").insert(payload);
  if (error) throw error;
}

export async function deleteExpense(expenseId: string) {
  const { supabase, profile } = await getMyProfile();
  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId)
    .eq("business_id", profile.business_id);

  if (error) throw error;
}
