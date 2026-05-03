import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTransactionalEmail } from "@/lib/email";
import { isGmailConfigured } from "@/lib/gmail";
import { dbConfigToEmailIntegrations, dbConfigToQuoConfig } from "@/lib/integrations";
import { ensureQuoMessageWebhook, isQuoConfigured, sendQuoMessage } from "@/lib/quo";

type ChatKind = "team" | "client";
type DeliveryType = "internal" | "email" | "note" | "sms";

type AdminSupabase = ReturnType<typeof createAdminClient>;

export type ChatParticipant = {
  id: string;
  type: "user" | "client";
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
};

export type ChatConversationSummary = {
  id: string;
  kind: ChatKind;
  title: string;
  description: string | null;
  unreadCount: number;
  participantCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  lastMessageSenderName: string | null;
  client: {
    id: string;
    name: string;
    companyName: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  participants: ChatParticipant[];
};

export type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  senderKind: "user" | "client" | "system";
  senderName: string;
  senderRole: string | null;
  deliveryType: "internal" | "email" | "note" | "sms" | "system";
  deliveryStatus: "pending" | "sent" | "failed";
  isOwnMessage: boolean;
};

export type ChatThread = {
  conversation: ChatConversationSummary;
  messages: ChatMessage[];
};

export type ChatWorkspaceData = {
  businessId: string;
  currentUserId: string;
  currentUserName: string;
  emailConnected: boolean;
  quoConnected: boolean;
  conversations: ChatConversationSummary[];
  selectedConversationId: string | null;
  selectedThread: ChatThread | null;
  availableClients: Array<{
    id: string;
    name: string;
    companyName: string | null;
    email: string | null;
    phone: string | null;
  }>;
  teamMembers: Array<{
    id: string;
    name: string;
    role: string | null;
    email: string;
    phone: string | null;
  }>;
};

type QueryLikeError = {
  code?: string;
  message?: string;
};

type QuoIncomingMessagePayload = {
  id: string;
  from: string;
  to: string[];
  direction: "incoming" | "outgoing";
  text: string;
  status: string;
  createdAt: string;
  userId?: string;
  phoneNumberId: string;
  contactIds?: string[];
};

type ViewerContext = {
  supabase: Awaited<ReturnType<typeof createSupabaseClient>>;
  businessId: string;
  userId: string;
  authUserId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  businessName: string;
  businessEmail: string | null;
  integrationsConfig: unknown;
};

type ClientLike = {
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
};

function displayClientName(client: ClientLike | null | undefined) {
  if (!client) return "Client";
  const person = [client.first_name, client.last_name].filter(Boolean).join(" ").trim();
  return client.company_name ? `${client.company_name}${person ? ` (${person})` : ""}` : person || "Client";
}

function cleanBodyPreview(value: string | null | undefined) {
  if (!value) return null;
  return value.replace(/\s+/g, " ").trim();
}

function normalizePhoneNumber(value: string | null | undefined) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeKind(value: string): ChatKind {
  return value === "client" ? "client" : "team";
}

function normalizeSenderKind(value: string): "user" | "client" | "system" {
  if (value === "client" || value === "system") return value;
  return "user";
}

function normalizeDeliveryType(value: string): "internal" | "email" | "note" | "sms" | "system" {
  if (value === "email" || value === "note" || value === "sms" || value === "system") return value;
  return "internal";
}

function normalizeDeliveryStatus(value: string): "pending" | "sent" | "failed" {
  if (value === "pending" || value === "failed") return value;
  return "sent";
}

export function isChatSchemaMissingError(error: unknown) {
  const value = error as QueryLikeError | null;
  if (!value) return false;

  return (
    value.code === "PGRST205" ||
    value.code === "42703" ||
    value.code === "42P01" ||
    value.message?.includes("chat_conversations") === true ||
    value.message?.includes("chat_messages") === true ||
    value.message?.includes("chat_participants") === true ||
    value.message?.includes("chat_reads") === true
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function messageHtml(body: string) {
  return `<div style="font-family:Arial,sans-serif;color:#1a2d3d;line-height:1.6;font-size:15px">${escapeHtml(
    body
  ).replace(/\r?\n/g, "<br />")}</div>`;
}

function getPublicAppUrl() {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim();

  if (!raw) return null;
  return /^https?:\/\//i.test(raw) ? raw.replace(/\/+$/, "") : `https://${raw.replace(/\/+$/, "")}`;
}

async function getViewerContext(): Promise<ViewerContext> {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, auth_user_id, business_id, first_name, last_name")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile) throw new Error("Business profile not found");

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("name, email")
    .eq("id", profile.business_id)
    .single<{ name: string; email: string | null }>();

  if (businessError) throw businessError;

  let integrationsConfig: unknown = undefined;
  const { data: integrationData, error: integrationsError } = await supabase
    .from("businesses")
    .select("integrations_config")
    .eq("id", profile.business_id)
    .single<{ integrations_config: unknown }>();

  if (!integrationsError) {
    integrationsConfig = integrationData?.integrations_config;
  } else if (integrationsError.code !== "42703") {
    throw integrationsError;
  }

  return {
    supabase: createAdminClient(),
    businessId: profile.business_id,
    userId: profile.id,
    authUserId: profile.auth_user_id ?? user.id,
    firstName: profile.first_name,
    lastName: profile.last_name,
    fullName: `${profile.first_name} ${profile.last_name}`.trim(),
    businessName: business?.name ?? "My Business",
    businessEmail: business?.email ?? null,
    integrationsConfig,
  };
}

async function ensureDefaultTeamRoom(ctx: ViewerContext) {
  const { supabase, businessId, userId } = ctx;
  const { data: existing, error } = await supabase
    .from("chat_conversations")
    .select("id")
    .eq("business_id", businessId)
    .eq("kind", "team")
    .is("archived_at", null)
    .limit(1);

  if (error) throw error;
  if ((existing ?? []).length > 0) return;

  const { data: members, error: membersError } = await supabase
    .from("users")
    .select("id")
    .eq("business_id", businessId)
    .eq("is_active", true);

  if (membersError) throw membersError;

  const { data: conversation, error: conversationError } = await supabase
    .from("chat_conversations")
    .insert({
      business_id: businessId,
      kind: "team",
      title: "Team HQ",
      description: "Company-wide room for dispatch, updates, and fast replies.",
      created_by: userId,
    })
    .select("id")
    .single();

  if (conversationError) throw conversationError;

  const participantRows = (members ?? []).map((member: { id: string }) => ({
    business_id: businessId,
    conversation_id: conversation.id,
    user_id: member.id,
    role: "member",
  }));

  if (participantRows.length > 0) {
    const { error: participantsError } = await supabase
      .from("chat_participants")
      .insert(participantRows);
    if (participantsError) throw participantsError;

    const { error: readsError } = await supabase.from("chat_reads").insert(
      participantRows.map((participant) => ({
        business_id: businessId,
        conversation_id: conversation.id,
        user_id: participant.user_id,
        unread_count: 0,
      }))
    );
    if (readsError) throw readsError;
  }

  const { error: messageError } = await supabase.from("chat_messages").insert({
    business_id: businessId,
    conversation_id: conversation.id,
    sender_kind: "system",
    sender_name: "Groundly",
    sender_role: "System",
    body: "Team HQ is ready. Keep internal updates, scheduling changes, and quick client handoffs here.",
    delivery_type: "system",
    delivery_status: "sent",
  });

  if (messageError) throw messageError;
}

async function ensureQuoInboxWebhook(ctx: ViewerContext) {
  const quoConfig = dbConfigToQuoConfig(ctx.integrationsConfig);
  if (!isQuoConfigured(quoConfig)) return;

  const appUrl = getPublicAppUrl();
  if (!appUrl) return;

  try {
    await ensureQuoMessageWebhook({
      url: `${appUrl}/api/quo/webhooks/messages`,
      config: quoConfig,
    });
  } catch (error) {
    console.error("Unable to ensure Quo message webhook:", error);
  }
}

async function listConversationRows(ctx: ViewerContext) {
  const { supabase, businessId, userId } = ctx;

  const [{ data: conversations, error: conversationsError }, { data: participants, error: participantsError }, { data: reads, error: readsError }] =
    await Promise.all([
      supabase
        .from("chat_conversations")
        .select(
          `
          id,
          kind,
          title,
          description,
          client_id,
          last_message_at,
          last_message_preview,
          last_message_sender_name,
          clients(id, first_name, last_name, company_name, email, phone)
        `
        )
        .eq("business_id", businessId)
        .is("archived_at", null)
        .order("last_message_at", { ascending: false }),
      supabase
        .from("chat_participants")
        .select(
          `
          conversation_id,
          user_id,
          client_id,
          users(id, first_name, last_name, role, email, phone),
          clients(id, first_name, last_name, company_name, email, phone)
        `
        )
        .eq("business_id", businessId),
      supabase
        .from("chat_reads")
        .select("conversation_id, unread_count, last_read_at")
        .eq("business_id", businessId)
        .eq("user_id", userId),
    ]);

  if (conversationsError) throw conversationsError;
  if (participantsError) throw participantsError;
  if (readsError) throw readsError;

  const participantsByConversation = new Map<string, ChatParticipant[]>();
  for (const row of participants ?? []) {
    const user = Array.isArray(row.users) ? row.users[0] : row.users;
    const client = Array.isArray(row.clients) ? row.clients[0] : row.clients;
    const entry: ChatParticipant | null = user
      ? {
          id: user.id,
          type: "user",
          name: `${user.first_name} ${user.last_name}`.trim(),
          role: user.role ?? null,
          email: user.email ?? null,
          phone: user.phone ?? null,
        }
      : client
        ? {
            id: client.id,
            type: "client",
            name: displayClientName(client),
            role: "Client",
            email: client.email ?? null,
            phone: client.phone ?? null,
          }
        : null;

    if (!entry) continue;
    const bucket = participantsByConversation.get(row.conversation_id) ?? [];
    bucket.push(entry);
    participantsByConversation.set(row.conversation_id, bucket);
  }

  const readsByConversation = new Map<string, { unread_count: number; last_read_at: string | null }>();
  for (const row of reads ?? []) {
    readsByConversation.set(row.conversation_id, {
      unread_count: row.unread_count ?? 0,
      last_read_at: row.last_read_at ?? null,
    });
  }

  return (conversations ?? []).map((row) => {
    const client = Array.isArray(row.clients) ? row.clients[0] : row.clients;
    const participantList = participantsByConversation.get(row.id) ?? [];
    const read = readsByConversation.get(row.id);

    return {
      id: row.id,
      kind: normalizeKind(row.kind),
      title: row.title,
      description: row.description ?? null,
      unreadCount: read?.unread_count ?? 0,
      participantCount: participantList.length,
      lastMessageAt: row.last_message_at ?? null,
      lastMessagePreview: cleanBodyPreview(row.last_message_preview),
      lastMessageSenderName: row.last_message_sender_name ?? null,
      client: client
        ? {
            id: client.id,
            name: displayClientName(client),
            companyName: client.company_name ?? null,
            email: client.email ?? null,
            phone: client.phone ?? null,
          }
        : null,
      participants: participantList,
    } satisfies ChatConversationSummary;
  });
}

async function getMessagesForConversation(ctx: ViewerContext, conversationId: string) {
  const { supabase, businessId, userId } = ctx;
  const { data, error } = await supabase
    .from("chat_messages")
    .select(
      "id, body, created_at, sender_kind, sender_name, sender_role, sender_user_id, delivery_type, delivery_status"
    )
    .eq("business_id", businessId)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(80);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    senderKind: normalizeSenderKind(row.sender_kind),
    senderName: row.sender_name,
    senderRole: row.sender_role ?? null,
    deliveryType: normalizeDeliveryType(row.delivery_type),
    deliveryStatus: normalizeDeliveryStatus(row.delivery_status),
    isOwnMessage: row.sender_user_id === userId,
  })) as ChatMessage[];
}

export async function getChatWorkspaceData(): Promise<ChatWorkspaceData> {
  const ctx = await getViewerContext();
  await ensureDefaultTeamRoom(ctx);
  await ensureQuoInboxWebhook(ctx);

  const [conversations, teamMembersResult, clientsResult] = await Promise.all([
    listConversationRows(ctx),
    ctx.supabase
      .from("users")
      .select("id, first_name, last_name, role, email, phone")
      .eq("business_id", ctx.businessId)
      .eq("is_active", true)
      .order("first_name", { ascending: true }),
    ctx.supabase
      .from("clients")
      .select("id, first_name, last_name, company_name, email, phone")
      .eq("business_id", ctx.businessId)
      .order("company_name", { ascending: true })
      .order("last_name", { ascending: true })
      .limit(80),
  ]);

  if (teamMembersResult.error) throw teamMembersResult.error;
  if (clientsResult.error) throw clientsResult.error;

  const selectedConversationId = conversations[0]?.id ?? null;
  const selectedThread = selectedConversationId
    ? {
        conversation: conversations[0],
        messages: await getMessagesForConversation(ctx, selectedConversationId),
      }
    : null;

  return {
    businessId: ctx.businessId,
    currentUserId: ctx.userId,
    currentUserName: ctx.fullName,
    emailConnected:
      isGmailConfigured(dbConfigToEmailIntegrations(ctx.integrationsConfig).gmail) ||
      Boolean(dbConfigToEmailIntegrations(ctx.integrationsConfig).resend?.apiKey) ||
      Boolean(process.env.RESEND_API_KEY),
    quoConnected: isQuoConfigured(dbConfigToQuoConfig(ctx.integrationsConfig)),
    conversations,
    selectedConversationId,
    selectedThread,
    availableClients: (clientsResult.data ?? []).map((client) => ({
      id: client.id,
      name: displayClientName(client),
      companyName: client.company_name ?? null,
      email: client.email ?? null,
      phone: client.phone ?? null,
    })),
    teamMembers: (teamMembersResult.data ?? []).map((member) => ({
      id: member.id,
      name: `${member.first_name} ${member.last_name}`.trim(),
      role: member.role ?? null,
      email: member.email,
      phone: member.phone ?? null,
    })),
  };
}

async function getBusinessIdForQuoPhoneNumber(
  supabase: AdminSupabase,
  phoneNumberId: string
) {
  const { data: businesses, error } = await supabase
    .from("businesses")
    .select("id, integrations_config")
    .returns<Array<{ id: string; integrations_config: unknown }>>();

  if (error) throw error;

  const match = (businesses ?? []).find((business) => {
    const quoConfig = dbConfigToQuoConfig(business.integrations_config);
    return quoConfig?.phoneNumberId === phoneNumberId;
  });

  return match?.id ?? null;
}

async function findClientByInboundPhone(
  supabase: AdminSupabase,
  businessId: string,
  fromPhone: string
) {
  const normalizedPhone = normalizePhoneNumber(fromPhone);
  if (!normalizedPhone) return null;

  const { data: exactClient, error: exactError } = await supabase
    .from("clients")
    .select("id, first_name, last_name, company_name, email, phone")
    .eq("business_id", businessId)
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (exactError) throw exactError;
  if (exactClient) return exactClient;

  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, first_name, last_name, company_name, email, phone")
    .eq("business_id", businessId)
    .not("phone", "is", null)
    .limit(500);

  if (error) throw error;

  return (
    (clients ?? []).find((client) => normalizePhoneNumber(client.phone) === normalizedPhone) ?? null
  );
}

async function createPlaceholderClientForInboundPhone(
  supabase: AdminSupabase,
  businessId: string,
  fromPhone: string
) {
  const normalizedPhone = normalizePhoneNumber(fromPhone);
  if (!normalizedPhone) return null;

  const phoneDigits = normalizedPhone.replace(/\D/g, "");
  const lastFour = phoneDigits.slice(-4);
  const lastName = lastFour ? `SMS ${lastFour}` : "SMS Lead";

  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      business_id: businessId,
      first_name: "Inbound",
      last_name: lastName,
      phone: normalizedPhone,
      notes: "Auto-created from inbound Quo/OpenPhone SMS webhook.",
      status: "lead",
    })
    .select("id, first_name, last_name, company_name, email, phone")
    .single();

  if (error) throw error;
  return client;
}

async function ensureClientForInboundPhone(
  supabase: AdminSupabase,
  businessId: string,
  fromPhone: string
) {
  const existingClient = await findClientByInboundPhone(supabase, businessId, fromPhone);
  if (existingClient) {
    return { client: existingClient, created: false as const };
  }

  const createdClient = await createPlaceholderClientForInboundPhone(supabase, businessId, fromPhone);
  if (!createdClient) {
    throw new Error("Inbound Quo phone number could not be normalized.");
  }

  return { client: createdClient, created: true as const };
}

async function ensureClientConversationForInboundMessage(input: {
  supabase: AdminSupabase;
  businessId: string;
  clientId: string;
  clientName: string;
}) {
  const { supabase, businessId, clientId, clientName } = input;

  const { data: existing, error: existingError } = await supabase
    .from("chat_conversations")
    .select("id")
    .eq("business_id", businessId)
    .eq("client_id", clientId)
    .is("archived_at", null)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing.id;

  const { data: members, error: membersError } = await supabase
    .from("users")
    .select("id")
    .eq("business_id", businessId)
    .eq("is_active", true);

  if (membersError) throw membersError;

  const ownerId = members?.[0]?.id ?? null;

  const { data: conversation, error: conversationError } = await supabase
    .from("chat_conversations")
    .insert({
      business_id: businessId,
      kind: "client",
      title: clientName,
      client_id: clientId,
      created_by: ownerId,
    })
    .select("id")
    .single();

  if (conversationError) throw conversationError;

  if ((members ?? []).length > 0) {
    const participantRows = members.map((member) => ({
      business_id: businessId,
      conversation_id: conversation.id,
      user_id: member.id,
      role: member.id === ownerId ? "owner" : "member",
    }));

    const { error: participantError } = await supabase
      .from("chat_participants")
      .insert(participantRows);
    if (participantError) throw participantError;

    const { error: readsError } = await supabase.from("chat_reads").insert(
      participantRows.map((participant) => ({
        business_id: businessId,
        conversation_id: conversation.id,
        user_id: participant.user_id,
        unread_count: 0,
      }))
    );
    if (readsError) throw readsError;
  }

  const { error: clientParticipantError } = await supabase.from("chat_participants").insert({
    business_id: businessId,
    conversation_id: conversation.id,
    client_id: clientId,
    role: "client",
  });
  if (clientParticipantError) throw clientParticipantError;

  return conversation.id;
}

export async function processQuoIncomingMessage(payload: QuoIncomingMessagePayload) {
  if (payload.direction !== "incoming") return { ignored: true as const };

  const supabase = createAdminClient();
  const businessId = await getBusinessIdForQuoPhoneNumber(supabase, payload.phoneNumberId);
  if (!businessId) {
    throw new Error("No Groundly business is connected to this Quo phone number.");
  }

  const { client, created: createdClient } = await ensureClientForInboundPhone(
    supabase,
    businessId,
    payload.from
  );

  const clientName = displayClientName(client);
  const conversationId = await ensureClientConversationForInboundMessage({
    supabase,
    businessId,
    clientId: client.id,
    clientName,
  });

  const { data: existingMessage, error: existingError } = await supabase
    .from("chat_messages")
    .select("id")
    .eq("business_id", businessId)
    .eq("conversation_id", conversationId)
    .contains("metadata", { quoMessageId: payload.id })
    .maybeSingle();

  if (existingError) throw existingError;
  if (existingMessage) {
    return { ignored: false as const, duplicate: true as const, conversationId };
  }

  const { error: insertError } = await supabase.from("chat_messages").insert({
    business_id: businessId,
    conversation_id: conversationId,
    sender_client_id: client.id,
    sender_kind: "client",
    sender_name: clientName,
    sender_role: "Client",
    body: payload.text,
    delivery_type: "sms",
    delivery_status: "sent",
    created_at: payload.createdAt,
    metadata: {
      quoMessageId: payload.id,
      quoPhoneNumberId: payload.phoneNumberId,
      quoStatus: payload.status,
      quoDirection: payload.direction,
      quoContactIds: payload.contactIds ?? [],
    },
  });

  if (insertError) throw insertError;

  return {
    ignored: false as const,
    duplicate: false as const,
    conversationId,
    createdClient,
  };
}

export async function getConversationThread(conversationId: string): Promise<ChatThread> {
  const ctx = await getViewerContext();
  const conversations = await listConversationRows(ctx);
  const conversation = conversations.find((item) => item.id === conversationId);
  if (!conversation) throw new Error("Conversation not found");

  return {
    conversation,
    messages: await getMessagesForConversation(ctx, conversationId),
  };
}

export async function createConversation(input: {
  kind: ChatKind;
  title: string;
  description?: string;
  clientId?: string;
  participantIds?: string[];
}) {
  const ctx = await getViewerContext();
  const { supabase, businessId, userId } = ctx;
  const title = input.title.trim();

  if (!title) throw new Error("Title is required");

  if (input.kind === "client") {
    if (!input.clientId) throw new Error("Client is required");

    const { data: existing, error: existingError } = await supabase
      .from("chat_conversations")
      .select("id")
      .eq("business_id", businessId)
      .eq("client_id", input.clientId)
      .is("archived_at", null)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) return getConversationThread(existing.id);
  }

  const { data: conversation, error: conversationError } = await supabase
    .from("chat_conversations")
    .insert({
      business_id: businessId,
      kind: input.kind,
      title,
      description: input.description?.trim() || null,
      client_id: input.kind === "client" ? input.clientId ?? null : null,
      created_by: userId,
    })
    .select("id")
    .single();

  if (conversationError) throw conversationError;

  const participantIds =
    input.kind === "client"
      ? (
          await supabase
            .from("users")
            .select("id")
            .eq("business_id", businessId)
            .eq("is_active", true)
        ).data?.map((member: { id: string }) => member.id) ?? [userId]
      : Array.from(new Set([userId, ...(input.participantIds ?? [])]));

  if (participantIds.length > 0) {
    const { error: participantError } = await supabase.from("chat_participants").insert(
      participantIds.map((participantId) => ({
        business_id: businessId,
        conversation_id: conversation.id,
        user_id: participantId,
        role: participantId === userId ? "owner" : "member",
      }))
    );
    if (participantError) throw participantError;

    const { error: readsError } = await supabase.from("chat_reads").insert(
      participantIds.map((participantId) => ({
        business_id: businessId,
        conversation_id: conversation.id,
        user_id: participantId,
        unread_count: 0,
      }))
    );
    if (readsError) throw readsError;
  }

  if (input.kind === "client" && input.clientId) {
    const { error: clientParticipantError } = await supabase.from("chat_participants").insert({
      business_id: businessId,
      conversation_id: conversation.id,
      client_id: input.clientId,
      role: "client",
    });
    if (clientParticipantError) throw clientParticipantError;
  }

  const { error: systemMessageError } = await supabase.from("chat_messages").insert({
    business_id: businessId,
    conversation_id: conversation.id,
    sender_kind: "system",
    sender_name: "Groundly",
    sender_role: "System",
    body:
      input.kind === "team"
        ? `${title} is live. Use this room for dispatch, internal notes, and handoffs.`
        : `${title} is ready for client follow-up.`,
    delivery_type: "system",
    delivery_status: "sent",
  });
  if (systemMessageError) throw systemMessageError;

  return getConversationThread(conversation.id);
}

export async function markConversationRead(conversationId: string) {
  const ctx = await getViewerContext();
  const { supabase, businessId, userId } = ctx;

  const { error } = await supabase
    .from("chat_reads")
    .update({
      unread_count: 0,
      last_read_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("business_id", businessId)
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function sendMessageToConversation(input: {
  conversationId: string;
  body: string;
  deliveryType: DeliveryType;
}) {
  const ctx = await getViewerContext();
  const { supabase, businessId, userId, fullName, businessEmail, businessName, integrationsConfig } = ctx;
  const body = input.body.trim();
  if (!body) throw new Error("Message is required");

  const { data: conversation, error: conversationError } = await supabase
    .from("chat_conversations")
    .select("id, kind, title, client_id, clients(id, first_name, last_name, company_name, email, phone)")
    .eq("business_id", businessId)
    .eq("id", input.conversationId)
    .maybeSingle();

  if (conversationError) throw conversationError;
  if (!conversation) throw new Error("Conversation not found");

  let deliveryStatus: "pending" | "sent" | "failed" = "sent";
  let deliveryMetadata: Record<string, string> = {};
  const client = Array.isArray(conversation.clients) ? conversation.clients[0] : conversation.clients;

  if (conversation.kind === "client" && input.deliveryType === "email") {
    if (!client?.email) throw new Error("Client has no email address");

    try {
      await sendTransactionalEmail({
        businessName,
        to: client.email,
        replyTo: businessEmail ?? undefined,
        subject: `${businessName}: ${conversation.title}`,
        html: messageHtml(body),
        integrations: dbConfigToEmailIntegrations(integrationsConfig),
      });
    } catch (error) {
      deliveryStatus = "failed";
      deliveryMetadata = {
        error: error instanceof Error ? error.message : "Email delivery failed",
      };
    }
  }

  if (conversation.kind === "client" && input.deliveryType === "sms") {
    if (!client?.phone) throw new Error("Client has no phone number");
    if (!isQuoConfigured(dbConfigToQuoConfig(integrationsConfig))) {
      throw new Error("Quo is not configured in Settings.");
    }

    try {
      await sendQuoMessage({
        to: client.phone,
        content: body,
        config: dbConfigToQuoConfig(integrationsConfig),
      });
    } catch (error) {
      deliveryStatus = "failed";
      deliveryMetadata = {
        error: error instanceof Error ? error.message : "SMS delivery failed",
      };
    }
  }

  const { data: message, error: messageError } = await supabase
    .from("chat_messages")
    .insert({
      business_id: businessId,
      conversation_id: input.conversationId,
      sender_user_id: userId,
      sender_kind: "user",
      sender_name: fullName,
      sender_role: "Team",
      body,
      delivery_type: input.deliveryType,
      delivery_status: deliveryStatus,
      metadata: deliveryMetadata,
    })
    .select(
      "id, body, created_at, sender_kind, sender_name, sender_role, sender_user_id, delivery_type, delivery_status"
    )
    .single();

  if (messageError) throw messageError;

  return {
    message: {
      id: message.id,
      body: message.body,
      createdAt: message.created_at,
      senderKind: normalizeSenderKind(message.sender_kind),
      senderName: message.sender_name,
      senderRole: message.sender_role ?? null,
      deliveryType: normalizeDeliveryType(message.delivery_type),
      deliveryStatus: normalizeDeliveryStatus(message.delivery_status),
      isOwnMessage: true,
    } satisfies ChatMessage,
    deliveryError: deliveryMetadata.error ?? null,
  };
}
