export type QuoConfig = {
  apiKey?: string;
  phoneNumberId?: string;
  userId?: string;
};

export type QuoContactInput = {
  externalId: string;
  firstName: string;
  lastName?: string | null;
  companyName?: string | null;
  email?: string | null;
  phone: string;
  sourceUrl?: string;
  config?: QuoConfig;
};

type SendQuoMessageInput = {
  to: string;
  content: string;
  config?: QuoConfig;
};

type EnsureQuoMessageWebhookInput = {
  url: string;
  config?: QuoConfig;
};

type QuoErrorResponse = {
  error?: { message?: string };
  message?: string;
};

type QuoContactResponse = {
  data?: {
    id: string;
    sourceUrl?: string | null;
  }[];
};

type QuoCreateContactResponse = {
  data?: {
    id: string;
    sourceUrl?: string | null;
  };
};

type QuoWebhookRecord = {
  id: string;
  url: string;
  status: "enabled" | "disabled";
  events: string[];
  resourceIds?: string[] | null;
};

type QuoListWebhooksResponse = {
  data?: QuoWebhookRecord[];
};

type QuoPhoneNumberResponse = {
  data?: {
    id: string;
    number?: string | null;
    users?: Array<{
      id?: string | null;
      role?: string | null;
    }> | null;
  };
};

function getQuoConfig(config?: QuoConfig) {
  return {
    apiKey: config?.apiKey ?? process.env.QUO_API_KEY,
    phoneNumberId: config?.phoneNumberId ?? process.env.QUO_PHONE_NUMBER_ID,
    userId: config?.userId ?? process.env.QUO_USER_ID,
  };
}

function clean(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizePhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return value.trim();
}

function getContactUrl(contactId: string, sourceUrl?: string | null) {
  return clean(sourceUrl) ?? `https://openphone.co/contacts/${contactId}`;
}

function getHeaders(apiKey: string) {
  return {
    Authorization: apiKey,
    "Content-Type": "application/json",
  };
}

async function parseError(response: Response) {
  const body = (await response.json().catch(() => null)) as QuoErrorResponse | null;
  return body?.error?.message ?? body?.message ?? "Quo request failed.";
}

function isLikelyQuoUserId(value?: string | null) {
  return Boolean(value && /^US/i.test(value.trim()));
}

async function getQuoPhoneNumberDetails(apiKey: string, phoneNumberId: string) {
  const response = await fetch(`https://api.openphone.com/v1/phone-numbers/${phoneNumberId}`, {
    method: "GET",
    headers: {
      Authorization: apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const body = (await response.json().catch(() => null)) as QuoPhoneNumberResponse | null;
  const number = clean(body?.data?.number);
  const ownerUserId =
    clean(
      body?.data?.users?.find((user) => isLikelyQuoUserId(user.id) && user.role === "owner")?.id ??
        body?.data?.users?.find((user) => isLikelyQuoUserId(user.id))?.id
    ) ?? null;

  if (!number) {
    throw new Error("Quo phone number lookup did not return a sending number.");
  }

  return {
    number,
    ownerUserId,
  };
}

export function isQuoConfigured(config?: QuoConfig) {
  const quo = getQuoConfig(config);
  return Boolean(quo.apiKey && quo.phoneNumberId);
}

export async function sendQuoMessage({ to, content, config }: SendQuoMessageInput) {
  const quo = getQuoConfig(config);

  if (!quo.apiKey || !quo.phoneNumberId) {
    throw new Error("QUO_API_KEY and QUO_PHONE_NUMBER_ID are required.");
  }

  const sender = await getQuoPhoneNumberDetails(quo.apiKey, quo.phoneNumberId);
  const requestedUserId = clean(quo.userId);
  const userId = isLikelyQuoUserId(requestedUserId) ? requestedUserId : sender.ownerUserId ?? undefined;
  const recipientNumber = normalizePhoneNumber(to);

  const response = await fetch("https://api.openphone.com/v1/messages", {
    method: "POST",
    headers: getHeaders(quo.apiKey),
    body: JSON.stringify({
      content,
      from: sender.number,
      phoneNumberId: quo.phoneNumberId,
      to: [recipientNumber],
      userId,
      setInboxStatus: "done",
    }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function ensureQuoContact({
  externalId,
  firstName,
  lastName,
  companyName,
  email,
  phone,
  sourceUrl,
  config,
}: QuoContactInput) {
  const quo = getQuoConfig(config);

  if (!quo.apiKey) {
    throw new Error("QUO_API_KEY is required.");
  }

  const params = new URLSearchParams();
  params.append("externalIds", externalId);

  const lookup = await fetch(`https://api.openphone.com/v1/contacts?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: quo.apiKey,
    },
  });

  if (!lookup.ok) {
    throw new Error(await parseError(lookup));
  }

  const existing = ((await lookup.json().catch(() => null)) as QuoContactResponse | null)?.data?.[0];
  if (existing?.id) {
    return {
      contactId: existing.id,
      url: getContactUrl(existing.id, existing.sourceUrl),
    };
  }

  const create = await fetch("https://api.openphone.com/v1/contacts", {
    method: "POST",
    headers: getHeaders(quo.apiKey),
    body: JSON.stringify({
      externalId,
      source: "groundly-pro",
      sourceUrl,
      defaultFields: {
        firstName,
        lastName: clean(lastName) ?? undefined,
        company: clean(companyName) ?? undefined,
        emails: clean(email)
          ? [
              {
                name: "work",
                value: clean(email),
              },
            ]
          : undefined,
        phoneNumbers: [
          {
            name: "mobile",
            value: normalizePhoneNumber(phone),
          },
        ],
      },
    }),
  });

  if (!create.ok) {
    throw new Error(await parseError(create));
  }

  const created = ((await create.json().catch(() => null)) as QuoCreateContactResponse | null)?.data;
  if (!created?.id) {
    throw new Error("Quo contact creation did not return a contact id.");
  }

  return {
    contactId: created.id,
    url: getContactUrl(created.id, created.sourceUrl),
  };
}

export async function ensureQuoMessageWebhook({
  url,
  config,
}: EnsureQuoMessageWebhookInput) {
  const quo = getQuoConfig(config);

  if (!quo.apiKey || !quo.phoneNumberId) {
    throw new Error("QUO_API_KEY and QUO_PHONE_NUMBER_ID are required.");
  }

  const listResponse = await fetch("https://api.openphone.com/v1/webhooks", {
    method: "GET",
    headers: {
      Authorization: quo.apiKey,
    },
  });

  if (!listResponse.ok) {
    throw new Error(await parseError(listResponse));
  }

  const existing = ((await listResponse.json().catch(() => null)) as QuoListWebhooksResponse | null)?.data ?? [];
  const matchingWebhook = existing.find((webhook) => {
    const resourceIds = webhook.resourceIds ?? [];
    const phoneNumberId = quo.phoneNumberId!;
    return (
      webhook.url === url &&
      webhook.status === "enabled" &&
      webhook.events.includes("message.received") &&
      resourceIds.includes(phoneNumberId)
    );
  });

  if (matchingWebhook) {
    return matchingWebhook;
  }

  const createResponse = await fetch("https://api.openphone.com/v1/webhooks/messages", {
    method: "POST",
    headers: getHeaders(quo.apiKey),
    body: JSON.stringify({
      url,
      label: "Groundly chat inbox",
      status: "enabled",
      events: ["message.received"],
      resourceIds: [quo.phoneNumberId],
      userId: quo.userId || undefined,
    }),
  });

  if (!createResponse.ok) {
    throw new Error(await parseError(createResponse));
  }

  const created = ((await createResponse.json().catch(() => null)) as { data?: QuoWebhookRecord } | null)?.data;
  if (!created) {
    throw new Error("Quo webhook creation did not return a webhook record.");
  }

  return created;
}
