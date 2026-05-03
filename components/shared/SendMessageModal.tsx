"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SendMessageModalProps {
  recipientLabel: string;
  recipientName: string;
  title: string;
  description: string;
  messagePreview: string;
  action: () => Promise<void | { error?: string }>;
  label: string;
}

export function SendMessageModal({
  recipientLabel,
  recipientName,
  title,
  description,
  messagePreview,
  action,
  label,
}: SendMessageModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSend() {
    setLoading(true);
    setError(null);
    try {
      const result = await action();
      if (result && "error" in result && result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send.");
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Send className="size-4" />
        {label}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="space-y-2.5 rounded-xl border border-[#e4ecf3] bg-[#f8fbfd] p-4 text-sm">
            <div className="flex gap-2">
              <span className="w-20 shrink-0 font-medium text-[#9baab8]">To</span>
              <span className="font-semibold text-[#1a2d3d]">{recipientLabel}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-20 shrink-0 font-medium text-[#9baab8]">Recipient</span>
              <span className="text-[#4a6070]">{recipientName}</span>
            </div>
            <div className="border-t border-[#e4ecf3] pt-2.5">
              <p className="mb-1.5 text-xs uppercase tracking-wide text-[#9baab8]">Message preview</p>
              <p className="leading-relaxed text-[#4a6070]">{messagePreview}</p>
            </div>
          </div>

          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={loading}
              className="bg-[#007bb8] text-white hover:bg-[#006aa0]"
            >
              <Send className="size-4" />
              {loading ? "Sending..." : label}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
