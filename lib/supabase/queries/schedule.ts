"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type ClientRow = Database["public"]["Tables"]["clients"]["Row"];
type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
type UserRow = Database["public"]["Tables"]["users"]["Row"];
type VisitRow = Database["public"]["Tables"]["job_visits"]["Row"];

export type ScheduleTeamMember = Pick<
  UserRow,
  "id" | "first_name" | "last_name" | "role" | "email"
>;

export type ScheduleVisit = VisitRow & {
  jobs:
    | (Pick<JobRow, "id" | "title" | "job_number" | "status"> & {
        clients: Pick<ClientRow, "id" | "first_name" | "last_name" | "company_name" | "phone"> | null;
      })
    | null;
  visit_assignments: {
    id: string;
    users: Pick<UserRow, "id" | "first_name" | "last_name" | "role"> | null;
  }[];
};

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

export async function getVisitsForWeek(
  businessId: string,
  startDate: string,
  endDate: string
): Promise<ScheduleVisit[]> {
  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("job_visits")
    .select(
      `
      *,
      jobs(id, title, job_number, status, clients(id, first_name, last_name, company_name, phone)),
      visit_assignments(id, users(id, first_name, last_name, role))
    `
    )
    .eq("business_id", businessId)
    .gte("scheduled_date", startDate)
    .lte("scheduled_date", endDate)
    .order("scheduled_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) throw error;

  return (data ?? []) as ScheduleVisit[];
}

export async function getScheduleTeamMembers(businessId: string): Promise<ScheduleTeamMember[]> {
  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, first_name, last_name, role, email")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("first_name", { ascending: true });

  if (error) throw error;

  return data ?? [];
}

export async function assignTech(visitId: string, userId: string) {
  const { supabase, profile } = await getMyProfile();

  const { data: visit, error: visitError } = await supabase
    .from("job_visits")
    .select("id")
    .eq("id", visitId)
    .eq("business_id", profile.business_id)
    .maybeSingle();

  if (visitError) throw visitError;
  if (!visit) throw new Error("Visit not found");

  const { error: deleteError } = await supabase
    .from("visit_assignments")
    .delete()
    .eq("visit_id", visitId)
    .eq("business_id", profile.business_id);

  if (deleteError) throw deleteError;

  if (userId && userId !== "unassigned") {
    const { error: insertError } = await supabase.from("visit_assignments").insert({
      business_id: profile.business_id,
      visit_id: visitId,
      user_id: userId,
    });

    if (insertError) throw insertError;
  }

  revalidatePath("/schedule");
}

export async function rescheduleVisit(
  visitId: string,
  date: string,
  time: string,
  endTime?: string
) {
  const { supabase, profile } = await getMyProfile();

  const { error } = await supabase
    .from("job_visits")
    .update({
      scheduled_date: date,
      start_time: time,
      end_time: endTime || null,
    })
    .eq("id", visitId)
    .eq("business_id", profile.business_id);

  if (error) throw error;

  revalidatePath("/schedule");
  revalidatePath("/jobs");
}
