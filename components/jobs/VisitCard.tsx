import { CalendarClock, Trash2, Users } from "lucide-react";
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

export function VisitCard({
  visit,
  deleteAction,
}: {
  visit: Visit;
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  const assigned = visit.visit_assignments
    .map((assignment) => assignment.users)
    .filter(Boolean)
    .map((user) => `${user!.first_name} ${user!.last_name}`);

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-gray-900">{visit.title}</h3>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarClock className="size-4 shrink-0" />
            {formatVisitTime(visit)}
            {visit.end_time ? ` - ${visit.end_time.slice(0, 5)}` : ""}
          </p>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="size-4 shrink-0" />
            {assigned.length > 0 ? assigned.join(", ") : "No technician assigned"}
          </p>
        </div>
        <form action={deleteAction}>
          <input type="hidden" name="visitId" value={visit.id} />
          <button
            type="submit"
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
            aria-label="Delete visit"
          >
            <Trash2 className="size-4" />
          </button>
        </form>
      </div>
      {visit.instructions && (
        <p className="mt-3 text-sm text-gray-700">{visit.instructions}</p>
      )}
    </div>
  );
}
