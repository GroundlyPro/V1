"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays } from "lucide-react";
import type { ReportPeriod } from "@/lib/supabase/queries/reports";

export function DateBadge({
  paramKey,
  period,
  customDate,
}: {
  paramKey: string;
  period: ReportPeriod;
  customDate?: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function navigate(newPeriod: string, newDate?: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramKey, newPeriod);
    if (newDate) {
      params.set(`${paramKey}_d`, newDate);
    } else {
      params.delete(`${paramKey}_d`);
    }
    router.push(`/reports?${params.toString()}`);
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#4a6070]">
      <CalendarDays className="size-3.5 shrink-0" />
      <select
        value={period}
        onChange={(e) => navigate(e.target.value)}
        className="appearance-none bg-transparent underline decoration-[#9fb6c3] decoration-dotted underline-offset-4 cursor-pointer outline-none transition-colors hover:text-[#007bb8]"
      >
        <option value="all">All dates</option>
        <option value="this_month">This month</option>
        <option value="last_month">Last month</option>
        <option value="this_year">This year</option>
        <option value="last_year">Last year</option>
        <option value="custom">Custom date</option>
      </select>
      {period === "custom" ? (
        <input
          type="date"
          defaultValue={customDate ?? ""}
          onBlur={(e) => {
            if (e.target.value) navigate("custom", e.target.value);
          }}
          className="ml-1 h-5 rounded border border-[#d8e3ed] bg-white px-1.5 text-[11px] text-[#1a2d3d] outline-none focus:border-[#007bb8]"
        />
      ) : null}
    </span>
  );
}
