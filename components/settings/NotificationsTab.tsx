"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export type NotificationValues = {
  email_notifications: boolean;
  sms_notifications: boolean;
  job_reminders_enabled: boolean;
  job_reminder_24h: boolean;
  job_reminder_1h: boolean;
};

export function NotificationsTab({
  defaultValues,
  action,
}: {
  defaultValues: NotificationValues;
  action: (values: NotificationValues) => Promise<{ error?: string } | void>;
}) {
  const [values, setValues] = useState(defaultValues);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    setPending(true);
    setError(null);
    const result = await action(values);
    if (result?.error) setError(result.error);
    setPending(false);
  }

  return (
    <div className="max-w-2xl space-y-4">
      {[
        {
          key: "email_notifications" as const,
          label: "Email notifications",
          description: "Send invoice, quote, request, and team updates by email.",
        },
        {
          key: "sms_notifications" as const,
          label: "SMS notifications",
          description: "Send visit reminders and urgent crew updates by text message.",
        },
        {
          key: "job_reminders_enabled" as const,
          label: "Job reminders",
          description: "Create client and cleaner reminder events when job confirmations are sent.",
        },
        {
          key: "job_reminder_24h" as const,
          label: "24-hour reminder",
          description: "Queue a reminder 24 hours before each scheduled job visit.",
        },
        {
          key: "job_reminder_1h" as const,
          label: "1-hour reminder",
          description: "Queue a reminder 1 hour before each scheduled job visit.",
        },
      ].map((item) => (
        <div key={item.key} className="flex min-h-16 items-center justify-between gap-4 rounded-lg border border-[#dfe8f0] bg-white p-4">
          <div>
            <Label htmlFor={item.key} className="text-sm font-semibold text-[#1a2d3d]">
              {item.label}
            </Label>
            <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
          </div>
          <input
            id={item.key}
            type="checkbox"
            className="size-5 accent-[#007bb8]"
            checked={values[item.key]}
            onChange={(event) =>
              setValues((current) => ({ ...current, [item.key]: event.target.checked }))
            }
          />
        </div>
      ))}

      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
      <Button className="min-h-11" disabled={pending} onClick={onSave}>
        {pending ? "Saving..." : "Save notification settings"}
      </Button>
    </div>
  );
}
