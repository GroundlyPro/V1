import { NextResponse } from "next/server";
import {
  getConversationThread,
  isChatSchemaMissingError,
  sendMessageToConversation,
} from "@/lib/supabase/queries/chat";

export async function GET(_request: Request, context: RouteContext<"/api/chat/conversations/[id]">) {
  const { id } = await context.params;

  try {
    const thread = await getConversationThread(id);
    return NextResponse.json(thread);
  } catch (error) {
    if (isChatSchemaMissingError(error)) {
      return NextResponse.json(
        { error: "Chat database tables are not installed yet. Apply migration 022_chat_center.sql." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load conversation" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, context: RouteContext<"/api/chat/conversations/[id]">) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const result = await sendMessageToConversation({
      conversationId: id,
      body: body.body ?? "",
      deliveryType: body.deliveryType ?? "internal",
    });

    return NextResponse.json(result);
  } catch (error) {
    if (isChatSchemaMissingError(error)) {
      return NextResponse.json(
        { error: "Chat database tables are not installed yet. Apply migration 022_chat_center.sql." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send message" },
      { status: 500 }
    );
  }
}
