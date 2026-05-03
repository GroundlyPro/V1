"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

type JobStatus = "active" | "in_progress" | "completed" | "closed" | "cancelled";

const statusLabels: Record<JobStatus, string> = {
  active: "Active",
  in_progress: "In progress",
  completed: "Completed",
  closed: "Closed",
  cancelled: "Cancelled",
};

const statusTriggerClasses: Record<JobStatus, string> = {
  active: "border-green-200 bg-green-50 text-green-700",
  in_progress: "border-blue-200 bg-blue-50 text-blue-700",
  completed: "border-gray-200 bg-gray-100 text-gray-600",
  closed: "border-slate-200 bg-slate-100 text-slate-600",
  cancelled: "border-red-200 bg-red-50 text-red-700",
};

export function JobStatusSelect({
  jobId,
  status,
  updateAction,
}: {
  jobId: string;
  status: JobStatus;
  updateAction: (jobId: string, status: JobStatus) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-1">
      <Select
        value={status}
        disabled={isPending}
        onValueChange={(value) => {
          if (!value || value === status) return;
          startTransition(() => void updateAction(jobId, value as JobStatus));
        }}
      >
        <SelectTrigger className={`h-9 w-[130px] min-w-0 font-medium sm:w-[140px] ${statusTriggerClasses[status]}`}>
          <span className="min-w-0 flex-1 truncate text-left">{statusLabels[status]}</span>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(statusLabels).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isPending ? (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          Saving
        </div>
      ) : null}
    </div>
  );
}
