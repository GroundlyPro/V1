"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import type {
  RequestListItem,
  RequestStatus,
  RequestTeamMemberOption,
} from "@/lib/supabase/queries/requests";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";

const statusOptions: Array<{ label: string; value: RequestStatus }> = [
  { label: "New", value: "new" },
  { label: "In review", value: "in_review" },
  { label: "Converted", value: "converted" },
  { label: "Declined", value: "declined" },
];

const UNASSIGNED = "unassigned";
const statusTriggerClasses: Record<string, string> = {
  new: "border-orange-200 bg-orange-50 text-orange-700",
  in_review: "border-blue-200 bg-blue-50 text-blue-700",
  converted: "border-green-200 bg-green-50 text-green-700",
  declined: "border-red-200 bg-red-50 text-red-700",
};

function formatCreatedDate(value: string | null) {
  if (!value) return "Recently";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function RequestCard({
  request,
  teamMembers,
  updateStatusAction,
  updateAssigneeAction,
}: {
  request: RequestListItem;
  teamMembers: RequestTeamMemberOption[];
  updateStatusAction: (id: string, status: RequestStatus) => Promise<void>;
  updateAssigneeAction: (id: string, assignedTo: string) => Promise<void>;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<RequestStatus>(request.status as RequestStatus);
  const [assignedTo, setAssignedTo] = useState(request.users?.id ?? UNASSIGNED);
  const [statusPending, setStatusPending] = useState(false);
  const [assigneePending, setAssigneePending] = useState(false);

  return (
    <TableRow>
      <TableCell className="px-4 whitespace-normal">
        <div className="space-y-1">
          <Link href={`/requests/${request.id}`} className="font-semibold text-gray-900 hover:text-brand">
            {request.first_name} {request.last_name}
          </Link>
          <p className="text-xs text-muted-foreground">
            {request.service_type || "Service request"}
          </p>
        </div>
      </TableCell>

      <TableCell className="whitespace-normal text-sm text-muted-foreground">
        {request.address || "No address"}
      </TableCell>

      <TableCell className="text-sm text-muted-foreground">
        {formatCreatedDate(request.created_at)}
      </TableCell>

      <TableCell className="w-[180px]">
        <Select
          value={status}
          disabled={statusPending}
          onValueChange={(value) => {
            const nextValue = value as RequestStatus;
            setStatus(nextValue);
            setStatusPending(true);
            startTransition(async () => {
              try {
                await updateStatusAction(request.id, nextValue);
                router.refresh();
              } catch {
                setStatus(request.status as RequestStatus);
              } finally {
                setStatusPending(false);
              }
            });
          }}
        >
          <SelectTrigger className={`w-full capitalize ${statusTriggerClasses[status] ?? statusTriggerClasses.new}`}>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      <TableCell className="w-[220px]">
        <Select
          value={assignedTo}
          disabled={assigneePending}
          onValueChange={(value) => {
            const nextValue = value ?? UNASSIGNED;
            setAssignedTo(nextValue);
            setAssigneePending(true);
            startTransition(async () => {
              try {
                await updateAssigneeAction(request.id, nextValue);
                router.refresh();
              } catch {
                setAssignedTo(request.users?.id ?? UNASSIGNED);
              } finally {
                setAssigneePending(false);
              }
            });
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Unassigned" />
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
      </TableCell>

      <TableCell className="px-4 text-right">
        <Link href={`/requests/${request.id}`} className="text-sm font-medium text-[#007bb8] hover:underline">
          View details
        </Link>
      </TableCell>
    </TableRow>
  );
}
