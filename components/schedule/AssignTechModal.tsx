"use client";

import { useTransition } from "react";
import { Loader2, UserRound } from "lucide-react";
import { assignTech, type ScheduleTeamMember, type ScheduleVisit } from "@/lib/supabase/queries/schedule";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AssignTechModalProps {
  visit: ScheduleVisit;
  teamMembers: ScheduleTeamMember[];
}

function memberName(member: ScheduleTeamMember) {
  return `${member.first_name} ${member.last_name}`;
}

export function AssignTechModal({ visit, teamMembers }: AssignTechModalProps) {
  const [isPending, startTransition] = useTransition();
  const assignedId = visit.visit_assignments[0]?.users?.id ?? "unassigned";

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" className="w-full" />}>
        <UserRound className="size-4" />
        Assign Tech
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Tech</DialogTitle>
          <DialogDescription>
            Choose the team member responsible for this visit.
          </DialogDescription>
        </DialogHeader>
        <Select
          defaultValue={assignedId}
          onValueChange={(value) => {
            if (!value) return;
            startTransition(() => void assignTech(visit.id, value));
          }}
          disabled={isPending}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select tech" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {teamMembers.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {memberName(member)} - {member.role.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isPending ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            Saving assignment
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
