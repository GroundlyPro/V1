import { NextResponse } from "next/server";
import { processQuoIncomingMessage } from "@/lib/supabase/queries/chat";

type QuoMessageWebhookEvent = {
  type?: string;
  data?: {
    object?: {
      id?: string;
      from?: string;
      to?: string[];
      direction?: "incoming" | "outgoing";
      text?: string;
      status?: string;
      createdAt?: string;
      userId?: string;
      phoneNumberId?: string;
      contactIds?: string[];
    };
  };
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as QuoMessageWebhookEvent | null;
  const message = body?.data?.object;

  if (body?.type !== "message.received" || !message) {
    return NextResponse.json({ ignored: true }, { status: 202 });
  }

  if (
    !message.id ||
    !message.from ||
    !Array.isArray(message.to) ||
    !message.text ||
    !message.createdAt ||
    !message.phoneNumberId ||
    !message.direction
  ) {
    return NextResponse.json({ error: "Invalid Quo message webhook payload." }, { status: 400 });
  }

  try {
    const result = await processQuoIncomingMessage({
      id: message.id,
      from: message.from,
      to: message.to,
      direction: message.direction,
      text: message.text,
      status: message.status ?? "delivered",
      createdAt: message.createdAt,
      userId: message.userId,
      phoneNumberId: message.phoneNumberId,
      contactIds: message.contactIds ?? [],
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process Quo webhook." },
      { status: 500 }
    );
  }
}
