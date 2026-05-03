import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { redirect } from "next/navigation";
import { WeekCalendar } from "@/components/schedule/WeekCalendar";
import { createClient } from "@/lib/supabase/server";
import { getScheduleTeamMembers, getVisitsForWeek } from "@/lib/supabase/queries/schedule";

interface SchedulePageProps {
  searchParams: Promise<{
    week?: string;
  }>;
}

function safeWeekStart(value?: string) {
  if (value) {
    const parsed = parseISO(value);
    if (!Number.isNaN(parsed.getTime())) {
      return startOfWeek(parsed, { weekStartsOn: 1 });
    }
  }

  return startOfWeek(new Date(), { weekStartsOn: 1 });
}

export default async function SchedulePage({ searchParams }: SchedulePageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("business_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile) redirect("/onboarding");

  const params = await searchParams;
  const weekStart = safeWeekStart(params.week);
  const weekEnd = addDays(weekStart, 6);
  const [visits, teamMembers] = await Promise.all([
    getVisitsForWeek(profile.business_id, format(weekStart, "yyyy-MM-dd"), format(weekEnd, "yyyy-MM-dd")),
    getScheduleTeamMembers(profile.business_id),
  ]);

  return (
    <WeekCalendar
      weekStart={format(weekStart, "yyyy-MM-dd")}
      visits={visits}
      teamMembers={teamMembers}
    />
  );
}
