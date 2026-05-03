"use client";

import { useState } from "react";
import { CheckCircle, Loader2, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SendSmsReminderButtonProps {
  visitId: string;
  disabled?: boolean;
}

export function SendSmsReminderButton({ visitId, disabled = false }: SendSmsReminderButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sendReminder() {
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/sms/appointment-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitId }),
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setError(result?.error ?? "Unable to send reminder.");
        return;
      }

      setMessage("Reminder sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send reminder.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={sendReminder}
        disabled={disabled || loading}
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : <MessageSquareText className="size-4" />}
        Send SMS Reminder
      </Button>
      {message ? (
        <p className="flex items-center gap-1.5 text-xs text-green-700">
          <CheckCircle className="size-3" />
          {message}
        </p>
      ) : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
