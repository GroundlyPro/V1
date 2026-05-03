"use client";

import { CalendarClock, GripVertical, UserRound } from "lucide-react";
import { type ScheduleVisit } from "@/lib/supabase/queries/schedule";
import { cn } from "@/lib/utils";

interface VisitBlockProps {
  visit: ScheduleVisit;
  compact?: boolean;
  onSelect: (visit: ScheduleVisit) => void;
}

const statusClasses: Record<string, string> = {
  scheduled: "border-emerald-200 bg-emerald-50 text-emerald-950",
  in_progress: "border-blue-200 bg-blue-50 text-blue-950",
  completed: "border-zinc-200 bg-zinc-100 text-zinc-700",
  skipped: "border-amber-200 bg-amber-50 text-amber-950",
};

function clientName(visit: ScheduleVisit) {
  const client = visit.jobs?.clients;
  if (!client) return "No client";
  const name = `${client.first_name} ${client.last_name}`;
  return client.company_name ? client.company_name : name;
}

function timeRange(visit: ScheduleVisit) {
  const start = visit.start_time?.slice(0, 5) ?? "Any time";
  const end = visit.end_time?.slice(0, 5);
  return end ? `${start}-${end}` : start;
}

function techName(visit: ScheduleVisit) {
  const tech = visit.visit_assignments[0]?.users;
  return tech ? `${tech.first_name} ${tech.last_name}` : "Unassigned";
}

export function VisitBlock({ visit, compact = false, onSelect }: VisitBlockProps) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", visit.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => onSelect(visit)}
      className={cn(
        "group w-full rounded-md border p-2 text-left shadow-sm transition hover:-translate-y-px hover:shadow",
        statusClasses[visit.status] ?? statusClasses.scheduled
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">{visit.title}</p>
          <p className="truncate text-[11px] text-current/70">{visit.jobs?.title ?? "No job"}</p>
        </div>
        <GripVertical className="mt-0.5 size-3 shrink-0 opacity-45" />
      </div>
      {!compact ? (
        <div className="mt-2 space-y-1 text-[11px] text-current/75">
          <div className="flex items-center gap-1">
            <CalendarClock className="size-3" />
            <span>{timeRange(visit)}</span>
          </div>
          <div className="flex items-center gap-1">
            <UserRound className="size-3" />
            <span className="truncate">{techName(visit)}</span>
          </div>
          <p className="truncate">{clientName(visit)}</p>
        </div>
      ) : null}
    </button>
  );
}
