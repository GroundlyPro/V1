"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

type DateRangeValue = "all" | "today" | "this_week" | "this_month" | "custom";

const dateRangeLabels: Record<DateRangeValue, string> = {
  all: "Date",
  today: "Today",
  this_week: "This week",
  this_month: "This month",
  custom: "Custom",
};

export function JobDateFilter({
  initialRange,
  initialDate,
}: {
  initialRange: DateRangeValue;
  initialDate: string;
}) {
  const [range, setRange] = useState<DateRangeValue>(initialRange);

  return (
    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
      <Select
        name="createdRange"
        value={range}
        onValueChange={(value) => setRange((value ?? "all") as DateRangeValue)}
      >
        <SelectTrigger className="w-full sm:w-44">
          <span>{dateRangeLabels[range]}</span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All dates</SelectItem>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="this_week">This week</SelectItem>
          <SelectItem value="this_month">This month</SelectItem>
          <SelectItem value="custom">Custom</SelectItem>
        </SelectContent>
      </Select>

      {range === "custom" ? (
        <Input
          name="createdDate"
          type="date"
          defaultValue={initialDate}
          className="w-full sm:w-44"
        />
      ) : (
        <input type="hidden" name="createdDate" defaultValue="" />
      )}
    </div>
  );
}
