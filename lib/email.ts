import { isGmailConfigured, sendGmailMessage, type GmailConfig } from "@/lib/gmail";

export type EmailIntegrations = {
  gmail?: GmailConfig;
  resend?: { apiKey?: string; fromEmail?: string };
};

export type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

type SendTransactionalEmailInput = {
  businessName: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
  integrations?: EmailIntegrations;
};

function getResendConfig(integrations?: EmailIntegrations) {
  return {
    apiKey: integrations?.resend?.apiKey || process.env.RESEND_API_KEY,
    fromEmail:
      integrations?.resend?.fromEmail ||
      process.env.RESEND_FROM_EMAIL ||
      "noreply@groundlypro.com",
  };
}

async function sendWithResend({
  to,
  replyTo,
  subject,
  html,
  attachments,
  integrations,
}: Omit<SendTransactionalEmailInput, "businessName">) {
  const { apiKey, fromEmail } = getResendConfig(integrations);

  if (!apiKey) {
    throw new Error("No email provider configured. Set up Gmail or Resend in Settings -> Integrations.");
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: fromEmail,
    to,
    replyTo,
    subject,
    html,
    attachments: attachments?.map((attachment) => ({
      filename: attachment.filename,
      content: attachment.content,
      contentType: attachment.contentType,
    })),
  });
}

export async function sendTransactionalEmail({
  businessName,
  to,
  replyTo,
  subject,
  html,
  attachments,
  integrations,
}: SendTransactionalEmailInput) {
  if (isGmailConfigured(integrations?.gmail)) {
    try {
      await sendGmailMessage({
        fromName: businessName,
        to,
        replyTo,
        subject,
        html,
        attachments,
        configOverride: integrations?.gmail,
      });
      return;
    } catch (gmailError) {
      if (!getResendConfig(integrations).apiKey) {
        throw gmailError;
      }
    }
  }

  await sendWithResend({
    to,
    replyTo,
    subject,
    html,
    attachments,
    integrations,
  });
}
