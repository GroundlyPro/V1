import { NextResponse } from "next/server";
import { createConversation, isChatSchemaMissingError } from "@/lib/supabase/queries/chat";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const thread = await createConversation({
      kind: body.kind,
      title: body.title ?? "",
      description: body.description ?? "",
      clientId: body.clientId ?? undefined,
      participantIds: Array.isArray(body.participantIds) ? body.participantIds : undefined,
    });

    return NextResponse.json(thread);
  } catch (error) {
    if (isChatSchemaMissingError(error)) {
      return NextResponse.json(
        { error: "Chat database tables are not installed yet. Apply migration 022_chat_center.sql." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create conversation" },
      { status: 500 }
    );
  }
}
