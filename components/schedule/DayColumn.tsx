"use client";

import { format, isToday } from "date-fns";
import { type ScheduleVisit } from "@/lib/supabase/queries/schedule";
import { VisitBlock } from "@/components/schedule/VisitBlock";
import { cn } from "@/lib/utils";

interface DayColumnProps {
  date: Date;
  visits: ScheduleVisit[];
  timeSlots: string[];
  onDropVisit: (visitId: string, date: string, time: string) => void;
  onSelectVisit: (visit: ScheduleVisit) => void;
  compact?: boolean;
}

function toDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function DayColumn({
  date,
  visits,
  timeSlots,
  onDropVisit,
  onSelectVisit,
  compact = false,
}: DayColumnProps) {
  const dateKey = toDateKey(date);

  return (
    <div className="min-w-0 border-r last:border-r-0">
      <div
        className={cn(
          "sticky top-0 z-10 border-b bg-background px-3 py-2",
          isToday(date) && "bg-emerald-50"
        )}
      >
        <p className="text-xs font-medium uppercase text-muted-foreground">{format(date, "EEE")}</p>
        <p className="text-lg font-semibold text-gray-900">{format(date, "MMM d")}</p>
      </div>
      <div>
        {timeSlots.map((time) => {
          const slotVisits = visits.filter(
            (visit) => (visit.start_time ?? "08:00").slice(0, 5) === time
          );

          return (
            <div
              key={`${dateKey}-${time}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const visitId = event.dataTransfer.getData("text/plain");
                if (visitId) onDropVisit(visitId, dateKey, time);
              }}
              className="min-h-24 border-b bg-white/70 p-2 transition hover:bg-emerald-50/50"
            >
              <p className="mb-2 text-[11px] font-medium text-muted-foreground">{time}</p>
              <div className="space-y-2">
                {slotVisits.map((visit) => (
                  <VisitBlock
                    key={visit.id}
                    visit={visit}
                    compact={compact}
                    onSelect={onSelectVisit}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
