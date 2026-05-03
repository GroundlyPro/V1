"use client";

import { startTransition, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateClientStatusAction } from "@/app/(dashboard)/clients/actions";

const statusClasses: Record<string, string> = {
  active: "border-green-200 bg-green-100 text-green-700",
  lead: "border-blue-200 bg-blue-100 text-blue-700",
  inactive: "border-gray-200 bg-gray-100 text-gray-600",
};

const statuses = [
  { value: "active", label: "Active" },
  { value: "lead", label: "Lead" },
  { value: "inactive", label: "Inactive" },
] as const;

interface ClientStatusSelectProps {
  clientId: string;
  status: "active" | "lead" | "inactive";
}

export function ClientStatusSelect({ clientId, status }: ClientStatusSelectProps) {
  const [value, setValue] = useState(status);
  const [isSaving, setIsSaving] = useState(false);

  function handleChange(nextValue: ClientStatusSelectProps["status"] | null) {
    if (!nextValue) return;
    if (nextValue === value || isSaving) return;

    const previousValue = value;
    setValue(nextValue);
    setIsSaving(true);

    startTransition(async () => {
      try {
        await updateClientStatusAction(clientId, nextValue);
      } catch (error) {
        setValue(previousValue);
        window.alert(error instanceof Error ? error.message : "Unable to update status.");
      } finally {
        setIsSaving(false);
      }
    });
  }

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger
        size="sm"
        disabled={isSaving}
        className={`min-w-24 justify-start border ${statusClasses[value] ?? statusClasses.inactive}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="start">
        {statuses.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
