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

interface SendEmailModalProps {
  clientEmail: string;
  clientName: string;
  subject: string;
  bodyPreview: string;
  action: () => Promise<void | { error?: string }>;
  label?: string;
  variant?: "default" | "outline";
}

export function SendEmailModal({
  clientEmail,
  clientName,
  subject,
  bodyPreview,
  action,
  label = "Send Email",
  variant = "outline",
}: SendEmailModalProps) {
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
      <DialogTrigger render={<Button variant={variant} size="sm" />}>
        <Send className="size-4" />
        {label}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Email</DialogTitle>
          <DialogDescription>Review before sending - this goes directly to the client.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="rounded-xl border border-[#e4ecf3] bg-[#f8fbfd] p-4 text-sm space-y-2.5">
            <div className="flex gap-2">
              <span className="w-16 shrink-0 text-[#9baab8] font-medium">To</span>
              <span className="text-[#1a2d3d] font-semibold">{clientEmail}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-16 shrink-0 text-[#9baab8] font-medium">Name</span>
              <span className="text-[#4a6070]">{clientName}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-16 shrink-0 text-[#9baab8] font-medium">Subject</span>
              <span className="text-[#4a6070]">{subject}</span>
            </div>
            <div className="border-t border-[#e4ecf3] pt-2.5">
              <p className="text-[#9baab8] text-xs uppercase tracking-wide mb-1.5">Message preview</p>
              <p className="text-[#4a6070] leading-relaxed">{bodyPreview}</p>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={loading}
              className="bg-[#007bb8] hover:bg-[#006aa0] text-white"
            >
              <Send className="size-4" />
              {loading ? "Sending..." : "Send Email"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
