import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type LaborRow = Database["public"]["Tables"]["labor_entries"]["Row"];
type LaborInsert = Database["public"]["Tables"]["labor_entries"]["Insert"];
type UserRow = Database["public"]["Tables"]["users"]["Row"];

export type LaborEntry = LaborRow & {
  users: Pick<UserRow, "id" | "first_name" | "last_name"> | null;
};

export interface LogTimeInput {
  user_id: string;
  date: string;
  hours: number;
  hourly_rate: number;
  notes?: string;
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

export async function getLaborEntries(
  jobId: string,
  businessId: string
): Promise<LaborEntry[]> {
  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("labor_entries")
    .select("*, users(id, first_name, last_name)")
    .eq("job_id", jobId)
    .eq("business_id", businessId)
    .order("date", { ascending: false });

  if (error) throw error;
  return (data ?? []) as LaborEntry[];
}

export async function logTime(jobId: string, input: LogTimeInput) {
  const { supabase, profile } = await getMyProfile();
  const hours = Number(input.hours || 0);
  const hourlyRate = Number(input.hourly_rate || 0);

  const payload: LaborInsert = {
    job_id: jobId,
    business_id: profile.business_id,
    user_id: input.user_id,
    date: input.date,
    hours,
    hourly_rate: hourlyRate,
    total_cost: hours * hourlyRate,
    notes: input.notes?.trim() || null,
  };

  const { error } = await supabase.from("labor_entries").insert(payload);
  if (error) throw error;
}

export async function deleteLabor(laborId: string) {
  const { supabase, profile } = await getMyProfile();
  const { error } = await supabase
    .from("labor_entries")
    .delete()
    .eq("id", laborId)
    .eq("business_id", profile.business_id);

  if (error) throw error;
}
