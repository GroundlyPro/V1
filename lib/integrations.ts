import type { EmailIntegrations } from "@/lib/email";
import type { QuoConfig } from "@/lib/quo";

export type StoredIntegrationsConfig = {
  gmail?: { client_id?: string; client_secret?: string; refresh_token?: string; from_email?: string };
  stripe?: { secret_key?: string; webhook_secret?: string; publishable_key?: string };
  quo?: { api_key?: string; phone_number_id?: string; user_id?: string };
  google_calendar?: { calendar_id?: string };
  resend?: { api_key?: string; from_email?: string };
};

export function dbConfigToEmailIntegrations(
  raw: unknown
): EmailIntegrations {
  const config = (raw ?? {}) as StoredIntegrationsConfig;
  return {
    gmail: config.gmail
      ? {
          clientId: config.gmail.client_id,
          clientSecret: config.gmail.client_secret,
          refreshToken: config.gmail.refresh_token,
          fromEmail: config.gmail.from_email,
        }
      : undefined,
    resend: config.resend
      ? {
          apiKey: config.resend.api_key,
          fromEmail: config.resend.from_email,
        }
      : undefined,
  };
}

export function dbConfigToQuoConfig(raw: unknown): QuoConfig | undefined {
  const config = (raw ?? {}) as StoredIntegrationsConfig;
  if (!config.quo) return undefined;

  return {
    apiKey: config.quo.api_key,
    phoneNumberId: config.quo.phone_number_id,
    userId: config.quo.user_id,
  };
}

export function isProviderConnected(
  provider: keyof StoredIntegrationsConfig,
  config: StoredIntegrationsConfig
): boolean {
  switch (provider) {
    case "gmail": {
      const g = config.gmail;
      const fromDb = Boolean(g?.client_id && g?.client_secret && g?.refresh_token && g?.from_email);
      const fromEnv = Boolean(
        (process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID) &&
          (process.env.GOOGLE_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET) &&
          (process.env.GOOGLE_REFRESH_TOKEN || process.env.GMAIL_REFRESH_TOKEN) &&
          (process.env.GMAIL_FROM_EMAIL || process.env.GOOGLE_GMAIL_FROM_EMAIL)
      );
      return fromDb || fromEnv;
    }
    case "stripe": {
      const s = config.stripe;
      const fromDb = Boolean(s?.secret_key && s?.webhook_secret);
      const fromEnv = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
      return fromDb || fromEnv;
    }
    case "quo": {
      const q = config.quo;
      const fromDb = Boolean(q?.api_key && q?.phone_number_id);
      const fromEnv = Boolean(process.env.QUO_API_KEY && process.env.QUO_PHONE_NUMBER_ID);
      return fromDb || fromEnv;
    }
    case "google_calendar": {
      const c = config.google_calendar;
      return Boolean(c?.calendar_id || process.env.GOOGLE_CALENDAR_ID);
    }
    case "resend": {
      const r = config.resend;
      const fromDb = Boolean(r?.api_key && r?.from_email);
      const fromEnv = Boolean(process.env.RESEND_API_KEY);
      return fromDb || fromEnv;
    }
    default:
      return false;
  }
}

export function getSavedFields(config: StoredIntegrationsConfig): Record<string, string[]> {
  return {
    gmail: Object.entries(config.gmail ?? {})
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k),
    stripe: Object.entries(config.stripe ?? {})
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k),
    quo: Object.entries(config.quo ?? {})
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k),
    google_calendar: Object.entries(config.google_calendar ?? {})
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k),
    resend: Object.entries(config.resend ?? {})
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k),
  };
}
