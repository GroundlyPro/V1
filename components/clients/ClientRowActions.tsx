"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit, Mail, MessageSquare, MoreHorizontal, Trash2 } from "lucide-react";
import { deleteClientAction } from "@/app/(dashboard)/clients/actions";
import { ClientEmailDialog } from "@/components/clients/ClientEmailDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ClientRowActionsProps {
  clientId: string;
  clientName: string;
  email?: string | null;
  phone?: string | null;
}

export function ClientRowActions({
  clientId,
  clientName,
  email,
  phone,
}: ClientRowActionsProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  function handleSms() {
    if (!phone) return;
    window.location.href = `sms:${phone}`;
  }

  function handleDelete() {
    if (isDeleting) return;

    const confirmed = window.confirm(`Delete ${clientName}?`);
    if (!confirmed) return;

    setIsDeleting(true);

    startTransition(async () => {
      try {
        await deleteClientAction(clientId);
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "Unable to delete client.");
        setIsDeleting(false);
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[popup-open]:opacity-100"
              aria-label={`Open actions for ${clientName}`}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => router.push(`/clients/${clientId}#edit`)}>
            <Edit className="size-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setEmailOpen(true)} disabled={!email}>
            <Mail className="size-4" />
            {email ? "Email" : "No email"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSms} disabled={!phone}>
            <MessageSquare className="size-4" />
            {phone ? "SMS" : "No phone"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDelete} variant="destructive" disabled={isDeleting}>
            <Trash2 className="size-4" />
            {isDeleting ? "Deleting..." : "Delete"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ClientEmailDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        clientId={clientId}
        clientName={clientName}
        email={email}
      />
    </>
  );
}
