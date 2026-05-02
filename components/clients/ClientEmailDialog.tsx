"use client";

import { useState } from "react";
import { Paperclip, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ClientEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  email?: string | null;
}

export function ClientEmailDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  email,
}: ClientEmailDialogProps) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function reset() {
    setSubject("");
    setMessage("");
    setFiles([]);
    setError(null);
    setSent(false);
  }

  async function handleSend() {
    if (!email || sending) return;
    setSending(true);
    setError(null);
    setSent(false);

    const formData = new FormData();
    formData.set("clientId", clientId);
    formData.set("subject", subject);
    formData.set("message", message);
    for (const file of files) {
      formData.append("attachments", file);
    }

    try {
      const response = await fetch("/api/clients/send-email", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(result?.error ?? "Unable to send email.");
        setSending(false);
        return;
      }

      setSent(true);
      setSending(false);
      router.refresh();
      window.setTimeout(() => {
        onOpenChange(false);
        reset();
      }, 700);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send email.");
      setSending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send Email</DialogTitle>
          <DialogDescription>
            Send a message directly to this client from your connected email provider.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-[#f8fbfd] p-3 text-sm">
            <p className="font-medium text-gray-900">{clientName}</p>
            <p className="text-muted-foreground">{email || "No email address"}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`client-email-subject-${clientId}`}>Subject</Label>
            <Input
              id={`client-email-subject-${clientId}`}
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              disabled={!email || sending}
              placeholder="Subject"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`client-email-message-${clientId}`}>Message</Label>
            <Textarea
              id={`client-email-message-${clientId}`}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              disabled={!email || sending}
              placeholder="Write your message..."
              className="min-h-36"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`client-email-attachments-${clientId}`}>Attachments</Label>
            <Input
              id={`client-email-attachments-${clientId}`}
              type="file"
              multiple
              disabled={!email || sending}
              onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
              className="min-h-11"
            />
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Attach up to 5 files, 15 MB total.</p>
              {files.map((file) => (
                <p key={`${file.name}-${file.size}`} className="flex items-center gap-1">
                  <Paperclip className="size-3" />
                  {file.name}
                </p>
              ))}
            </div>
          </div>

          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          {sent ? <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Email sent.</p> : null}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={!email || sending || !subject.trim() || !message.trim()}
            >
              <Send className="size-4" />
              {sending ? "Sending..." : "Send Email"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
