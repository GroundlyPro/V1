"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import type { QuoteStatus } from "@/lib/supabase/queries/quotes";

const statusLabels: Record<QuoteStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  approved: "Approved",
  changes_requested: "Changes requested",
  declined: "Declined",
  expired: "Expired",
};

const statusTriggerClasses: Record<QuoteStatus, string> = {
  draft: "border-slate-200 bg-slate-100 text-slate-700",
  sent: "border-blue-200 bg-blue-50 text-blue-700",
  approved: "border-green-200 bg-green-50 text-green-700",
  changes_requested: "border-amber-200 bg-amber-50 text-amber-700",
  declined: "border-red-200 bg-red-50 text-red-700",
  expired: "border-orange-200 bg-orange-50 text-orange-700",
};

const statusDotClasses: Record<QuoteStatus, string> = {
  draft: "bg-slate-500",
  sent: "bg-blue-500",
  approved: "bg-green-500",
  changes_requested: "bg-amber-500",
  declined: "bg-red-500",
  expired: "bg-orange-500",
};

export function QuoteStatusSelect({
  quoteId,
  status,
  updateAction,
}: {
  quoteId: string;
  status: QuoteStatus;
  updateAction: (quoteId: string, status: QuoteStatus) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-1">
      <Select
        value={status}
        disabled={isPending}
        onValueChange={(value) => {
          if (!value || value === status) return;
          startTransition(() => void updateAction(quoteId, value as QuoteStatus));
        }}
      >
        <SelectTrigger className={`h-9 w-[178px] font-medium ${statusTriggerClasses[status]}`}>
          <span className="flex min-w-0 flex-1 items-center gap-2 truncate text-left">
            <span className={`size-2.5 rounded-full ${statusDotClasses[status]}`} />
            <span className="truncate">{statusLabels[status]}</span>
          </span>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(statusLabels).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              <span className="flex items-center gap-2">
                <span className={`size-2.5 rounded-full ${statusDotClasses[value as QuoteStatus]}`} />
                <span>{label}</span>
              </span>
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
