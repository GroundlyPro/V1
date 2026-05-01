import { CalendarClock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { JobDetail } from "@/lib/supabase/queries/jobs";

type Visit = JobDetail["job_visits"][number];

function formatVisitTime(visit: Visit) {
  if (!visit.scheduled_date) return "Unscheduled";
  const date = new Date(`${visit.scheduled_date}T00:00:00`);
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);

  if (!visit.start_time) return formattedDate;
  return `${formattedDate} at ${visit.start_time.slice(0, 5)}`;
}

export function VisitCard({ visit }: { visit: Visit }) {
  const assigned = visit.visit_assignments
    .map((assignment) => assignment.users)
    .filter(Boolean)
    .map((user) => `${user!.first_name} ${user!.last_name}`);

  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium text-gray-900">{visit.title}</h3>
            <Badge variant="secondary">{visit.status.replace("_", " ")}</Badge>
          </div>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarClock className="size-4" />
            {formatVisitTime(visit)}
            {visit.end_time ? ` - ${visit.end_time.slice(0, 5)}` : ""}
          </p>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="size-4" />
            {assigned.length > 0 ? assigned.join(", ") : "No technician assigned"}
          </p>
        </div>
      </div>
      {visit.instructions && (
        <p className="mt-3 text-sm text-gray-700">{visit.instructions}</p>
      )}
    </div>
  );
}
