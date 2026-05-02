export type QuoConfig = {
  apiKey?: string;
  phoneNumberId?: string;
  userId?: string;
};

type SendQuoMessageInput = {
  to: string;
  content: string;
  config?: QuoConfig;
};

type QuoErrorResponse = {
  error?: { message?: string };
  message?: string;
};

function getQuoConfig(config?: QuoConfig) {
  return {
    apiKey: config?.apiKey ?? process.env.QUO_API_KEY,
    phoneNumberId: config?.phoneNumberId ?? process.env.QUO_PHONE_NUMBER_ID,
    userId: config?.userId ?? process.env.QUO_USER_ID,
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

  const response = await fetch("https://api.openphone.com/v1/messages", {
    method: "POST",
    headers: {
      Authorization: quo.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content,
      from: quo.phoneNumberId,
      to: [to],
      userId: quo.userId || undefined,
      setInboxStatus: "done",
    }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as QuoErrorResponse | null;
    throw new Error(body?.error?.message ?? body?.message ?? "Quo SMS send failed.");
  }
}
