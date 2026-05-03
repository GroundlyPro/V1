import { NextResponse } from "next/server";
import { isChatSchemaMissingError, markConversationRead } from "@/lib/supabase/queries/chat";

export async function POST(_request: Request, context: RouteContext<"/api/chat/conversations/[id]/read">) {
  const { id } = await context.params;

  try {
    await markConversationRead(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isChatSchemaMissingError(error)) {
      return NextResponse.json(
        { error: "Chat database tables are not installed yet. Apply migration 022_chat_center.sql." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update read state" },
      { status: 500 }
    );
  }
}
