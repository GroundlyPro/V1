export type GmailConfig = {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  fromEmail?: string;
};

export type GmailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

function isExpiredTokenError(message: string | undefined) {
  if (!message) return false;
  const value = message.toLowerCase();
  return (
    value.includes("invalid_grant") ||
    value.includes("token has been expired or revoked") ||
    value.includes("expired") ||
    value.includes("revoked")
  );
}

function resolveConfig(override?: GmailConfig): GmailConfig {
  return {
    clientId: override?.clientId || process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID,
    clientSecret: override?.clientSecret || process.env.GOOGLE_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET,
    refreshToken: override?.refreshToken || process.env.GOOGLE_REFRESH_TOKEN || process.env.GMAIL_REFRESH_TOKEN,
    fromEmail: override?.fromEmail || process.env.GMAIL_FROM_EMAIL || process.env.GOOGLE_GMAIL_FROM_EMAIL,
  };
}

export function isGmailConfigured(override?: GmailConfig) {
  const c = resolveConfig(override);
  return Boolean(c.clientId && c.clientSecret && c.refreshToken && c.fromEmail);
}

async function getAccessToken(config: GmailConfig) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId!,
      client_secret: config.clientSecret!,
      refresh_token: config.refreshToken!,
      grant_type: "refresh_token",
    }),
  });

  const token = (await response.json().catch(() => null)) as GoogleTokenResponse | null;
  if (!response.ok || !token?.access_token) {
    const message = token?.error_description ?? token?.error ?? "Unable to refresh Gmail access token.";
    if (isExpiredTokenError(message)) {
      throw new Error("Token expired");
    }
    throw new Error(message);
  }
  return token.access_token;
}

function encodeMessage(message: string) {
  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function strip(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function encodeHeader(value: string) {
  if (/^[\x20-\x7E]*$/.test(value)) return strip(value);
  return `=?UTF-8?B?${Buffer.from(value).toString("base64")}?=`;
}

function buildMessage({
  fromName,
  fromEmail,
  to,
  subject,
  html,
  replyTo,
  attachments,
}: {
  fromName: string;
  fromEmail: string;
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: GmailAttachment[];
}) {
  const headers = [
    `From: ${encodeHeader(fromName)} <${strip(fromEmail)}>`,
    `To: ${strip(to)}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
  ];
  if (replyTo) headers.push(`Reply-To: ${strip(replyTo)}`);

  if (!attachments?.length) {
    return [
      ...headers,
      'Content-Type: text/html; charset="UTF-8"',
      "",
      html,
    ].join("\r\n");
  }

  const boundary = `mixed_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  const parts = [
    ...headers,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    html,
  ];

  for (const attachment of attachments) {
    const filename = encodeHeader(attachment.filename);
    parts.push(
      `--${boundary}`,
      `Content-Type: ${attachment.contentType || "application/octet-stream"}; name="${filename}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${filename}"`,
      "",
      attachment.content.toString("base64").replace(/(.{76})/g, "$1\r\n")
    );
  }

  parts.push(`--${boundary}--`);
  return parts.join("\r\n");
}

export async function sendGmailMessage({
  fromName,
  to,
  subject,
  html,
  replyTo,
  attachments,
  configOverride,
}: {
  fromName: string;
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: GmailAttachment[];
  configOverride?: GmailConfig;
}) {
  const config = resolveConfig(configOverride);
  if (!config.fromEmail) throw new Error("GMAIL_FROM_EMAIL is not configured.");

  const accessToken = await getAccessToken(config);
  const message = buildMessage({
    fromName,
    fromEmail: config.fromEmail,
    to,
    subject,
    html,
    replyTo,
    attachments,
  });

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: encodeMessage(message) }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? "Gmail send failed.");
  }
}
