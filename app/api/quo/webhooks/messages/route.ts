import { NextResponse } from "next/server";
import { getQuoMessageById } from "@/lib/quo";
import { processQuoIncomingMessage } from "@/lib/supabase/queries/chat";

export const runtime = "nodejs";

type JsonRecord = Record<string, unknown>;

type NormalizedWebhookMessage = {
  id: string;
  from: string;
  to: string[];
  direction: "incoming" | "outgoing";
  text: string;
  status: string;
  createdAt: string;
  userId?: string;
  phoneNumberId: string;
  contactIds: string[];
};

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (typeof entry === "string") return entry.trim();

      const record = asRecord(entry);
      return (
        readString(record?.value) ??
        readString(record?.phoneNumber) ??
        readString(record?.phone) ??
        readString(record?.id) ??
        ""
      );
    })
    .filter(Boolean);
}

function extractEventType(body: JsonRecord | null) {
  return (
    readString(body?.type) ??
    readString(body?.event) ??
    readString(asRecord(body?.data)?.type) ??
    null
  );
}

function extractMessageRecord(body: JsonRecord | null) {
  const data = asRecord(body?.data);
  return asRecord(data?.object) ?? data ?? asRecord(body?.object);
}

function normalizeWebhookMessage(
  body: JsonRecord | null,
  message: JsonRecord | null
): Partial<NormalizedWebhookMessage> & { id?: string } {
  const data = asRecord(body?.data);
  const fallbackPhoneNumberId = readString(data?.resourceId) ?? readString(body?.resourceId);

  return {
    id: readString(message?.id) ?? undefined,
    from: readString(message?.from) ?? undefined,
    to: readStringArray(message?.to),
    direction:
      readString(message?.direction)?.toLowerCase() === "outgoing" ? "outgoing" : "incoming",
    text: readString(message?.text) ?? readString(message?.content) ?? undefined,
    status: readString(message?.status) ?? "delivered",
    createdAt:
      readString(message?.createdAt) ??
      readString(message?.created_at) ??
      undefined,
    userId: readString(message?.userId) ?? readString(message?.user_id) ?? undefined,
    phoneNumberId:
      readString(message?.phoneNumberId) ??
      readString(message?.phone_number_id) ??
      fallbackPhoneNumberId ??
      undefined,
    contactIds: readStringArray(message?.contactIds ?? message?.contact_ids),
  };
}

function isCompleteMessage(
  value: Partial<NormalizedWebhookMessage> & { id?: string }
): value is NormalizedWebhookMessage {
  return Boolean(
    value.id &&
      value.from &&
      value.to?.length &&
      value.text &&
      value.createdAt &&
      value.phoneNumberId &&
      value.direction
  );
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const body = (rawBody ? JSON.parse(rawBody) : null) as JsonRecord | null;
  const eventType = extractEventType(body);
  const rawMessage = extractMessageRecord(body);

  if (eventType !== "message.received" || !rawMessage) {
    return NextResponse.json({ ignored: true, eventType }, { status: 202 });
  }

  let message = normalizeWebhookMessage(body, rawMessage);

  if (!isCompleteMessage(message) && message.id) {
    try {
      const fetched = await getQuoMessageById(message.id);
      message = {
        ...normalizeWebhookMessage(body, asRecord(fetched)),
        ...message,
        to: message.to?.length ? message.to : readStringArray(asRecord(fetched)?.to),
        contactIds: message.contactIds?.length
          ? message.contactIds
          : readStringArray(asRecord(fetched)?.contactIds ?? asRecord(fetched)?.contact_ids),
      };
    } catch (error) {
      console.error("Quo webhook message hydration failed:", error);
    }
  }

  if (!isCompleteMessage(message)) {
    console.error("Invalid Quo message webhook payload:", {
      eventType,
      keys: rawMessage ? Object.keys(rawMessage) : [],
      bodyPreview: rawBody.slice(0, 1000),
    });
    return NextResponse.json({ error: "Invalid Quo message webhook payload." }, { status: 400 });
  }

  try {
    const result = await processQuoIncomingMessage(message);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Failed to process Quo webhook:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process Quo webhook." },
      { status: 500 }
    );
  }
}
