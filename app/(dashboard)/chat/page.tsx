import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChatWorkspace } from "@/components/chat/ChatWorkspace";
import { getChatWorkspaceData, isChatSchemaMissingError } from "@/lib/supabase/queries/chat";

async function loadChatWorkspace() {
  try {
    const initialData = await getChatWorkspaceData();
    return { initialData, missingSchema: false as const };
  } catch (error) {
    if (isChatSchemaMissingError(error)) {
      return { initialData: null, missingSchema: true as const };
    }

    throw error;
  }
}

export default async function ChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { initialData, missingSchema } = await loadChatWorkspace();

  if (!missingSchema && initialData) {
    return <ChatWorkspace initialData={initialData} />;
  }

  return (
    <div className="max-w-4xl">
      <div className="overflow-hidden rounded-[28px] border border-[#d7e7f3] bg-white shadow-[0_18px_40px_rgba(0,50,90,0.08)]">
        <div
          className="border-b border-[#e7f0f7] px-7 py-6"
          style={{
            backgroundImage:
              "linear-gradient(136deg, rgba(0,123,184,0.11) 0%, rgba(255,255,255,0.95) 38%, rgba(41,182,246,0.10) 100%)",
          }}
        >
          <div className="text-[12px] font-semibold uppercase tracking-[0.8px] text-[#007bb8]">
            Chat Setup Required
          </div>
          <h1 className="mt-2 text-[30px] font-bold tracking-[-0.8px] text-[#183145]">
            Chat can’t load until the Supabase migration is applied
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[#5d7487]">
            The frontend is deployed, but your live database does not yet have the new chat tables.
          </p>
        </div>

        <div className="space-y-4 px-7 py-6 text-sm text-[#456072]">
          <div className="rounded-2xl bg-[#f6fbfe] px-4 py-4">
            <div className="font-semibold text-[#1a2d3d]">What is missing</div>
            <div className="mt-1">
              Supabase returned that `public.chat_conversations` is not present in the schema cache.
            </div>
          </div>

          <div className="rounded-2xl border border-[#e3edf5] px-4 py-4">
            <div className="font-semibold text-[#1a2d3d]">Apply this migration</div>
            <div className="mt-2">
              [supabase/migrations/022_chat_center.sql](/C:/Users/Admin/Music/Groundly%20F/V1-main/supabase/migrations/022_chat_center.sql:1)
            </div>
            <div className="mt-3">
              If you use the Supabase CLI, run `supabase db push` against the same hosted project your `.env.local` points to.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
