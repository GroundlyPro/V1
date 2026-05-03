"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

type TeamMemberOption = {
  id: string;
  first_name: string;
  last_name: string;
};

const UNASSIGNED = "unassigned";

export function JobAssigneeSelect({
  jobId,
  assignedUserId,
  teamMembers,
  disabled = false,
  updateAction,
}: {
  jobId: string;
  assignedUserId: string;
  teamMembers: TeamMemberOption[];
  disabled?: boolean;
  updateAction: (jobId: string, userId: string) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const selectedMember = teamMembers.find((member) => member.id === assignedUserId);
  const label = selectedMember
    ? `${selectedMember.first_name} ${selectedMember.last_name}`.trim()
    : disabled
      ? "No visit"
      : "Unassigned";

  return (
    <div className="space-y-1">
      <Select
        value={disabled ? UNASSIGNED : assignedUserId}
        disabled={disabled || isPending}
        onValueChange={(value) => {
          if (!value || value === assignedUserId) return;
          startTransition(() => void updateAction(jobId, value));
        }}
      >
        <SelectTrigger className="h-9 w-[140px] min-w-0 sm:w-[150px]">
          <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
          {teamMembers.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              {member.first_name} {member.last_name}
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
