"use client";

import { useState } from "react";
import { Mail, MessageSquare, Phone, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { openQuoContact } from "@/lib/open-quo-contact";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface InvoiceRowActionsProps {
  invoiceId: string;
  invoiceNumber: string;
  clientId?: string | null;
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  total: number | null;
  dueDate: string | null;
}

function formatCurrency(value: number | null) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value ?? 0);
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function InvoiceRowActions({
  invoiceId,
  invoiceNumber,
  clientId,
  clientName,
  clientEmail,
  clientPhone,
  total,
  dueDate,
}: InvoiceRowActionsProps) {
  const router = useRouter();
  const [emailOpen, setEmailOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openingQuo, setOpeningQuo] = useState<"call" | "sms" | null>(null);

  async function handleCall() {
    if (!clientPhone || !clientId) return;
    setError(null);
    setOpeningQuo("call");
    try {
      await openQuoContact(clientId);
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : "Unable to open Quo contact.");
    } finally {
      setOpeningQuo(null);
    }
  }

  async function handleSms() {
    if (!clientPhone || !clientId) return;
    setError(null);
    setOpeningQuo("sms");
    try {
      await openQuoContact(clientId);
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : "Unable to open Quo contact.");
    } finally {
      setOpeningQuo(null);
    }
  }

  async function handleSendInvoice() {
    if (!clientEmail || sending) return;
    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/invoices/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setError(result?.error ?? "Unable to send invoice email.");
        setSending(false);
        return;
      }

      setEmailOpen(false);
      setSending(false);
      router.refresh();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send invoice email.");
      setSending(false);
    }
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
              aria-label={`Open send options for ${invoiceNumber}`}
            >
              <Send className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => setEmailOpen(true)} disabled={!clientEmail}>
            <Mail className="size-4" />
            {clientEmail ? "Email" : "No email"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => void handleCall()}
            disabled={!clientPhone || !clientId || openingQuo !== null}
          >
            <Phone className="size-4" />
            {clientPhone ? (openingQuo === "call" ? "Opening Quo..." : "Call") : "No phone"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => void handleSms()}
            disabled={!clientPhone || !clientId || openingQuo !== null}
          >
            <MessageSquare className="size-4" />
            {clientPhone ? (openingQuo === "sms" ? "Opening Quo..." : "SMS") : "No phone"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={emailOpen}
        onOpenChange={(open) => {
          setEmailOpen(open);
          if (!open) {
            setError(null);
            setSending(false);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Invoice</DialogTitle>
            <DialogDescription>
              This sends invoice {invoiceNumber} directly to the selected client.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <div className="space-y-2 rounded-xl border border-[#e4ecf3] bg-[#f8fbfd] p-4 text-sm">
              <div className="flex gap-2">
                <span className="w-16 shrink-0 font-medium text-[#9baab8]">To</span>
                <span className="font-semibold text-[#1a2d3d]">{clientEmail ?? "No email address"}</span>
              </div>
              <div className="flex gap-2">
                <span className="w-16 shrink-0 font-medium text-[#9baab8]">Client</span>
                <span className="text-[#4a6070]">{clientName}</span>
              </div>
              <div className="flex gap-2">
                <span className="w-16 shrink-0 font-medium text-[#9baab8]">Invoice</span>
                <span className="text-[#4a6070]">{invoiceNumber}</span>
              </div>
              <div className="border-t border-[#e4ecf3] pt-2.5">
                <p className="mb-1.5 text-xs uppercase tracking-wide text-[#9baab8]">Message preview</p>
                <p className="text-[#4a6070] leading-relaxed">
                  Invoice total {formatCurrency(total)} due {formatDate(dueDate)}.
                </p>
              </div>
            </div>

            {error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            ) : null}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setEmailOpen(false)} disabled={sending}>
                Cancel
              </Button>
              <Button
                onClick={handleSendInvoice}
                disabled={!clientEmail || sending}
                className="bg-[#007bb8] text-white hover:bg-[#006aa0]"
              >
                <Send className="size-4" />
                {sending ? "Sending..." : "Send Email"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
