"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import type { RequestDateFilter, RequestFilter } from "@/lib/supabase/queries/requests";

type TeamMemberOption = {
  id: string;
  first_name: string;
  last_name: string;
};

const statusFilterLabels: Record<RequestFilter, string> = {
  all: "Status",
  new: "New",
  in_review: "In review",
  converted: "Converted",
  declined: "Declined",
};

const dateRangeLabels: Record<RequestDateFilter, string> = {
  all: "Date",
  today: "Today",
  this_week: "This week",
  this_month: "This month",
  custom: "Custom range",
};

export function RequestsFilters({
  teamMembers,
  initialValues,
}: {
  teamMembers: TeamMemberOption[];
  initialValues: {
    q: string;
    status: RequestFilter;
    assignedTo: string;
    createdRange: RequestDateFilter;
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
  const [createdRange, setCreatedRange] = useState<RequestDateFilter>(initialValues.createdRange);
  const [createdFrom, setCreatedFrom] = useState(initialValues.createdFrom);
  const [createdTo, setCreatedTo] = useState(initialValues.createdTo);

  const assignedMember = teamMembers.find((member) => member.id === assignedTo);
  const selectedAssigneeLabel =
    assignedTo === "all"
      ? "Assignee"
      : assignedTo === "unassigned"
        ? "Unassigned"
        : assignedMember
          ? `${assignedMember.first_name} ${assignedMember.last_name}`.trim()
          : "Assignee";

  function pushFilters(
    nextValues?: Partial<{
      q: string;
      status: RequestFilter;
      assignedTo: string;
      createdRange: RequestDateFilter;
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
        className="flex flex-1 flex-col gap-3 xl:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          pushFilters();
        }}
      >
        <div className="relative xl:flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search client, email, phone, address, or service"
            className="pl-9"
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
          <SelectTrigger className="w-full xl:w-[260px]">
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
            const nextValue = (value ?? "all") as RequestFilter;
            setStatus(nextValue);
            pushFilters({ status: nextValue });
          }}
          disabled={isPending}
        >
          <SelectTrigger className="w-full xl:w-[240px]">
            <span>{statusFilterLabels[status]}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="in_review">In review</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Select
            value={createdRange}
            onValueChange={(value) => {
              const nextValue = (value ?? "all") as RequestDateFilter;
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
            <SelectTrigger className="w-full xl:w-[220px]">
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
                className="w-full xl:w-[180px]"
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
                className="w-full xl:w-[180px]"
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
