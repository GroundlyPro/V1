"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import type { QuoteCreatedRange, QuoteFilters } from "@/lib/supabase/queries/quotes";

type TeamMemberOption = {
  id: string;
  first_name: string;
  last_name: string;
};

const statusFilterLabels: Record<NonNullable<QuoteFilters["status"]>, string> = {
  all: "Status",
  draft: "Draft",
  sent: "Sent",
  approved: "Approved",
  changes_requested: "Changes requested",
  declined: "Declined",
  expired: "Expired",
};

const dateRangeLabels: Record<QuoteCreatedRange, string> = {
  all: "Date",
  today: "Today",
  this_week: "This week",
  this_month: "This month",
  custom: "Custom range",
};

export function QuotesFilters({
  teamMembers,
  initialValues,
}: {
  teamMembers: TeamMemberOption[];
  initialValues: {
    q: string;
    status: NonNullable<QuoteFilters["status"]>;
    assignedTo: string;
    createdRange: QuoteCreatedRange;
    createdFrom: string;
    createdTo: string;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState(initialValues.q);
  const [status, setStatus] = useState(initialValues.status);
  const [assignedTo, setAssignedTo] = useState(initialValues.assignedTo);
  const [createdRange, setCreatedRange] = useState<QuoteCreatedRange>(initialValues.createdRange);
  const [createdFrom, setCreatedFrom] = useState(initialValues.createdFrom);
  const [createdTo, setCreatedTo] = useState(initialValues.createdTo);

  const selectedAssigneeLabel =
    assignedTo === "all"
      ? "Assignee"
      : assignedTo === "unassigned"
        ? "Unassigned"
        : teamMembers.find((member) => member.id === assignedTo)
            ? `${teamMembers.find((member) => member.id === assignedTo)!.first_name} ${teamMembers.find((member) => member.id === assignedTo)!.last_name}`.trim()
            : "Assignee";

  function pushFilters(
    nextValues?: Partial<{
      q: string;
      status: NonNullable<QuoteFilters["status"]>;
      assignedTo: string;
      createdRange: QuoteCreatedRange;
      createdFrom: string;
      createdTo: string;
    }>
  ) {
    const values = {
      q,
      status,
      assignedTo,
      createdRange,
      createdFrom,
      createdTo,
      ...nextValues,
    };

    const params = new URLSearchParams();

    if (values.q.trim()) params.set("q", values.q.trim());
    if (values.status !== "all") params.set("status", values.status);
    if (values.assignedTo !== "all") params.set("assignedTo", values.assignedTo);
    if (values.createdRange !== "all") params.set("createdRange", values.createdRange);

    if (values.createdRange === "custom") {
      if (values.createdFrom) params.set("createdFrom", values.createdFrom);
      if (values.createdTo) params.set("createdTo", values.createdTo);
    }

    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname);
    });
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row">
      <form
        className="flex flex-1 flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          pushFilters();
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search quote title or number"
            className="pl-8"
          />
        </div>

        <Select
          value={assignedTo}
          onValueChange={(value) => {
            const nextValue = value ?? "all";
            setAssignedTo(nextValue);
            pushFilters({ assignedTo: nextValue });
          }}
          disabled={isPending}
        >
          <SelectTrigger className="w-full sm:w-52">
            <span>{selectedAssigneeLabel}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assignees</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {teamMembers.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.first_name} {member.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={status}
          onValueChange={(value) => {
            const nextValue = (value ?? "all") as NonNullable<QuoteFilters["status"]>;
            setStatus(nextValue);
            pushFilters({ status: nextValue });
          }}
          disabled={isPending}
        >
          <SelectTrigger className="w-full sm:w-48">
            <span>{statusFilterLabels[status]}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="changes_requested">Changes requested</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Select
            value={createdRange}
            onValueChange={(value) => {
              const nextValue = (value ?? "all") as QuoteCreatedRange;
              const nextFrom = nextValue === "custom" ? createdFrom : "";
              const nextTo = nextValue === "custom" ? createdTo : "";
              setCreatedRange(nextValue);
              if (nextValue !== "custom") {
                setCreatedFrom("");
                setCreatedTo("");
              }
              pushFilters({
                createdRange: nextValue,
                createdFrom: nextFrom,
                createdTo: nextTo,
              });
            }}
            disabled={isPending}
          >
            <SelectTrigger className="w-full sm:w-44">
              <span>{dateRangeLabels[createdRange]}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All dates</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this_week">This week</SelectItem>
              <SelectItem value="this_month">This month</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>

          {createdRange === "custom" ? (
            <>
              <Input
                type="date"
                value={createdFrom}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  const nextTo = createdTo && createdTo < nextValue ? nextValue : createdTo;
                  setCreatedFrom(nextValue);
                  if (nextTo !== createdTo) setCreatedTo(nextTo);
                  pushFilters({
                    createdRange: "custom",
                    createdFrom: nextValue,
                    createdTo: nextTo,
                  });
                }}
                className="w-full sm:w-40"
              />
              <Input
                type="date"
                value={createdTo}
                min={createdFrom || undefined}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setCreatedTo(nextValue);
                  pushFilters({ createdRange: "custom", createdTo: nextValue });
                }}
                className="w-full sm:w-40"
              />
            </>
          ) : null}
        </div>

        <button className={buttonVariants({ variant: "outline" })} type="submit" disabled={isPending}>
          Filter
        </button>
      </form>
    </div>
  );
}
