"use client";

import { useState, useTransition } from "react";
import {
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  MessageSquareText,
  Settings2,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type IntegrationStatus = {
  gmail: boolean;
  stripe: boolean;
  quo: boolean;
  googleCalendar: boolean;
  resend: boolean;
};

type FieldDef = {
  key: string;
  label: string;
  placeholder: string;
  secret?: boolean;
  type?: string;
};

type IntegrationDef = {
  provider: string;
  title: string;
  description: string;
  icon: React.ElementType;
  fields: FieldDef[];
};

const INTEGRATIONS: IntegrationDef[] = [
  {
    provider: "gmail",
    title: "Gmail",
    description: "Send quotes, invoices, and reminders directly from your Gmail account.",
    icon: Mail,
    fields: [
      { key: "client_id", label: "Client ID", placeholder: "710765925550-....apps.googleusercontent.com" },
      { key: "client_secret", label: "Client Secret", placeholder: "GOCSPX-...", secret: true },
      { key: "refresh_token", label: "Refresh Token", placeholder: "1//0g...", secret: true },
      { key: "from_email", label: "Sender Email", placeholder: "you@gmail.com", type: "email" },
    ],
  },
  {
    provider: "stripe",
    title: "Stripe",
    description: "Collect invoice payments and manage checkout sessions.",
    icon: CreditCard,
    fields: [
      { key: "secret_key", label: "Secret Key", placeholder: "sk_live_...", secret: true },
      { key: "webhook_secret", label: "Webhook Secret", placeholder: "whsec_...", secret: true },
      { key: "publishable_key", label: "Publishable Key (optional)", placeholder: "pk_live_..." },
    ],
  },
  {
    provider: "quo",
    title: "Quo",
    description: "Send SMS visit reminders and urgent crew updates.",
    icon: MessageSquareText,
    fields: [
      { key: "api_key", label: "API Key", placeholder: "quo_api_...", secret: true },
      { key: "phone_number_id", label: "Phone Number ID", placeholder: "PN123abc" },
      { key: "user_id", label: "User ID (optional)", placeholder: "US123abc" },
    ],
  },
  {
    provider: "google_calendar",
    title: "Google Calendar",
    description: "Sync scheduled jobs and visits to your business calendar. Uses same Gmail OAuth credentials.",
    icon: CalendarDays,
    fields: [
      { key: "calendar_id", label: "Calendar ID", placeholder: "your-calendar-id@group.calendar.google.com" },
    ],
  },
  {
    provider: "resend",
    title: "Resend (fallback)",
    description: "Fallback email provider used when Gmail is not configured.",
    icon: Settings2,
    fields: [
      { key: "api_key", label: "API Key", placeholder: "re_...", secret: true },
      { key: "from_email", label: "From Email", placeholder: "noreply@yourdomain.com", type: "email" },
    ],
  },
];

function SecretInput({
  value,
  onChange,
  placeholder,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  id: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-9 font-mono text-sm"
        autoComplete="off"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-[#1a2d3d]"
        tabIndex={-1}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function IntegrationCard({
  integration,
  connected,
  savedFields,
  saveAction,
}: {
  integration: IntegrationDef;
  connected: boolean;
  savedFields: string[];
  saveAction: (provider: string, config: Record<string, string>) => Promise<{ error?: string }>;
}) {
  const Icon = integration.icon;
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(integration.fields.map((f) => [f.key, ""]))
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleChange(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
    setSaved(false);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const patch: Record<string, string> = {};
    for (const [k, v] of Object.entries(values)) {
      if (v.trim()) patch[k] = v.trim();
    }
    if (Object.keys(patch).length === 0) return;
    startTransition(async () => {
      const result = await saveAction(integration.provider, patch);
      if (result?.error) {
        setError(result.error);
      } else {
        setSaved(true);
        setValues(Object.fromEntries(integration.fields.map((f) => [f.key, ""])));
      }
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#eef7fb] text-[#007bb8]">
              <Icon className="size-5" />
            </div>
            <div>
              <h4 className="font-semibold text-[#1a2d3d]">{integration.title}</h4>
              <p className="mt-0.5 text-sm text-muted-foreground">{integration.description}</p>
            </div>
          </div>
          <Badge
            variant={connected ? "default" : "outline"}
            className={`shrink-0 gap-1 ${connected ? "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100" : ""}`}
          >
            {connected ? (
              <><CheckCircle2 className="size-3" /> Connected</>
            ) : (
              <><XCircle className="size-3" /> Not configured</>
            )}
          </Badge>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {integration.fields.map((field) => {
              const hasExisting = savedFields.includes(field.key);
              return (
                <div key={field.key} className="space-y-1.5">
                  <Label htmlFor={`${integration.provider}-${field.key}`} className="text-xs font-medium text-[#4a6070]">
                    {field.label}
                    {hasExisting && (
                      <span className="ml-1.5 text-[10px] font-normal text-emerald-600">● saved</span>
                    )}
                  </Label>
                  {field.secret ? (
                    <SecretInput
                      id={`${integration.provider}-${field.key}`}
                      value={values[field.key]}
                      onChange={(v) => handleChange(field.key, v)}
                      placeholder={hasExisting ? "Leave blank to keep existing" : field.placeholder}
                    />
                  ) : (
                    <Input
                      id={`${integration.provider}-${field.key}`}
                      type={field.type ?? "text"}
                      value={values[field.key]}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder={hasExisting ? "Leave blank to keep existing" : field.placeholder}
                      className="font-mono text-sm"
                      autoComplete="off"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {saved && <p className="text-sm text-emerald-600">Credentials saved successfully.</p>}

          <div className="flex justify-end pt-1">
            <Button type="submit" size="sm" disabled={isPending} className="bg-[#007bb8] hover:bg-[#006da0] text-white">
              {isPending && <Loader2 className="mr-2 size-3.5 animate-spin" />}
              Save credentials
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function IntegrationsTab({
  status,
  savedFields,
  saveAction,
}: {
  status: IntegrationStatus;
  savedFields: Record<string, string[]>;
  saveAction: (provider: string, config: Record<string, string>) => Promise<{ error?: string }>;
}) {
  const connectedMap: Record<string, boolean> = {
    gmail: status.gmail,
    stripe: status.stripe,
    quo: status.quo,
    google_calendar: status.googleCalendar,
    resend: status.resend,
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-[#1a2d3d]">Integrations</h3>
        <p className="text-sm text-muted-foreground">
          Enter credentials below to connect each service. Leave a field blank to keep the existing saved value.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {INTEGRATIONS.map((integration) => (
          <IntegrationCard
            key={integration.provider}
            integration={integration}
            connected={connectedMap[integration.provider] ?? false}
            savedFields={savedFields[integration.provider] ?? []}
            saveAction={saveAction}
          />
        ))}
      </div>
    </div>
  );
}
