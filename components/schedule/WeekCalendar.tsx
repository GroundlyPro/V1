"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { addDays, addMonths, format, isSameDay, parseISO, startOfWeek } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2, PanelRightOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  rescheduleVisit,
  type ScheduleTeamMember,
  type ScheduleVisit,
} from "@/lib/supabase/queries/schedule";
import { AssignTechModal } from "@/components/schedule/AssignTechModal";
import { DayColumn } from "@/components/schedule/DayColumn";
import { SendSmsReminderButton } from "@/components/schedule/SendSmsReminderButton";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface WeekCalendarProps {
  weekStart: string;
  visits: ScheduleVisit[];
  teamMembers: ScheduleTeamMember[];
}

const timeSlots = [
  "06:00",
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
];

function clientName(visit: ScheduleVisit) {
  const client = visit.jobs?.clients;
  if (!client) return "No client";
  const name = `${client.first_name} ${client.last_name}`;
  return client.company_name ? `${client.company_name} (${name})` : name;
}

function formatTime(visit: ScheduleVisit) {
  const start = visit.start_time?.slice(0, 5) ?? "Any time";
  const end = visit.end_time?.slice(0, 5);
  return end ? `${start} - ${end}` : start;
}

function addOneHour(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const nextHour = Math.min(hour + 1, 23);
  return `${String(nextHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function toWeekParam(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function WeekCalendar({ weekStart, visits, teamMembers }: WeekCalendarProps) {
  const router = useRouter();
  const [view, setView] = useState<"week" | "day">("week");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedVisit, setSelectedVisit] = useState<ScheduleVisit | null>(null);
  const [isPending, startTransition] = useTransition();
  const start = parseISO(weekStart);
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(start, index)), [start]);
  const visibleDays = view === "day" ? days.filter((day) => isSameDay(day, selectedDate)) : days;
  const previousWeek = toWeekParam(addDays(start, -7));
  const nextWeek = toWeekParam(addDays(start, 7));
  const previousMonth = toWeekParam(startOfWeek(addMonths(start, -1), { weekStartsOn: 1 }));
  const nextMonth = toWeekParam(startOfWeek(addMonths(start, 1), { weekStartsOn: 1 }));

  function handleDateJump(value: string) {
    if (!value) return;
    const picked = parseISO(value);
    if (!Number.isNaN(picked.getTime())) {
      router.push(`/schedule?week=${toWeekParam(startOfWeek(picked, { weekStartsOn: 1 }))}`);
    }
  }

  function visitsForDay(date: Date) {
    const key = format(date, "yyyy-MM-dd");
    return visits.filter((visit) => visit.scheduled_date === key);
  }

  function handleDropVisit(visitId: string, date: string, time: string) {
    const visit = visits.find((item) => item.id === visitId);
    const endTime = visit?.end_time ? addOneHour(time) : undefined;
    startTransition(() => void rescheduleVisit(visitId, date, time, endTime));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
          <p className="text-sm text-muted-foreground">
            {format(start, "MMM d")} - {format(addDays(start, 6), "MMM d, yyyy")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/schedule?week=${previousMonth}`} className={buttonVariants({ variant: "outline", size: "icon" })} title="Previous month">
            <ChevronsLeft className="size-4" />
            <span className="sr-only">Previous month</span>
          </Link>
          <Link href={`/schedule?week=${previousWeek}`} className={buttonVariants({ variant: "outline", size: "icon" })} title="Previous week">
            <ChevronLeft className="size-4" />
            <span className="sr-only">Previous week</span>
          </Link>
          <Link href="/schedule" className={buttonVariants({ variant: "outline" })}>
            <CalendarDays className="size-4" />
            Today
          </Link>
          <Link href={`/schedule?week=${nextWeek}`} className={buttonVariants({ variant: "outline", size: "icon" })} title="Next week">
            <ChevronRight className="size-4" />
            <span className="sr-only">Next week</span>
          </Link>
          <Link href={`/schedule?week=${nextMonth}`} className={buttonVariants({ variant: "outline", size: "icon" })} title="Next month">
            <ChevronsRight className="size-4" />
            <span className="sr-only">Next month</span>
          </Link>
          <input
            type="date"
            value={weekStart}
            onChange={(e) => handleDateJump(e.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            title="Jump to date"
          />
          <Tabs value={view} onValueChange={(value) => setView(value as "week" | "day")}>
            <TabsList>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="day">Day</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {view === "day" ? (
        <div className="flex flex-wrap gap-2">
          {days.map((day) => (
            <Button
              key={day.toISOString()}
              type="button"
              variant={isSameDay(day, selectedDate) ? "default" : "outline"}
              onClick={() => setSelectedDate(day)}
            >
              {format(day, "EEE d")}
            </Button>
          ))}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border bg-background">
        {visits.length === 0 ? (
          <div className="flex min-h-72 items-center justify-center p-8 text-center">
            <div>
              <p className="font-medium text-gray-900">No visits scheduled this week</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add visits from a job record, then assign techs here.
              </p>
            </div>
          </div>
        ) : (
          <div
            className="grid min-w-[760px]"
            style={{ gridTemplateColumns: `repeat(${visibleDays.length}, minmax(0, 1fr))` }}
          >
            {visibleDays.map((day) => (
              <DayColumn
                key={day.toISOString()}
                date={day}
                visits={visitsForDay(day)}
                timeSlots={timeSlots}
                compact={view === "week"}
                onDropVisit={handleDropVisit}
                onSelectVisit={setSelectedVisit}
              />
            ))}
          </div>
        )}
      </div>

      {isPending ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          Updating schedule
        </div>
      ) : null}

      <Sheet open={Boolean(selectedVisit)} onOpenChange={(open) => !open && setSelectedVisit(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {selectedVisit ? (
            <>
              <SheetHeader>
                <SheetTitle>{selectedVisit.title}</SheetTitle>
                <SheetDescription>{selectedVisit.jobs?.title ?? "No job attached"}</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4">
                <div className="flex flex-wrap gap-2">
                  <Badge>{selectedVisit.status.replace("_", " ")}</Badge>
                  <Badge variant="outline">{selectedVisit.jobs?.job_number ?? "No job number"}</Badge>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">Client</p>
                    <p className="mt-1 text-gray-900">{clientName(selectedVisit)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">Scheduled</p>
                    <p className="mt-1 text-gray-900">
                      {selectedVisit.scheduled_date
                        ? `${format(parseISO(selectedVisit.scheduled_date), "EEEE, MMM d")} at ${formatTime(selectedVisit)}`
                        : "Not scheduled"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">Assigned</p>
                    <p className="mt-1 text-gray-900">
                      {selectedVisit.visit_assignments[0]?.users
                        ? `${selectedVisit.visit_assignments[0].users.first_name} ${selectedVisit.visit_assignments[0].users.last_name}`
                        : "Unassigned"}
                    </p>
                  </div>
                  {selectedVisit.instructions ? (
                    <div>
                      <p className="text-xs font-medium uppercase text-muted-foreground">Instructions</p>
                      <p className="mt-1 text-gray-900">{selectedVisit.instructions}</p>
                    </div>
                  ) : null}
                </div>
                <AssignTechModal visit={selectedVisit} teamMembers={teamMembers} />
                <SendSmsReminderButton
                  visitId={selectedVisit.id}
                  disabled={!selectedVisit.jobs?.clients?.phone}
                />
                <Link href={`/jobs/${selectedVisit.job_id}`} className={buttonVariants({ variant: "outline", className: "w-full" })}>
                  <PanelRightOpen className="size-4" />
                  Open Job
                </Link>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
