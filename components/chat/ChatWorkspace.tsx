"use client";

import {
  FormEvent,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { Mail, MessageSquareText, Phone, Search, Send, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { openQuoContact } from "@/lib/open-quo-contact";
import type {
  ChatConversationSummary,
  ChatThread,
  ChatWorkspaceData,
} from "@/lib/supabase/queries/chat";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type DeliveryType = "internal" | "email" | "note" | "sms";
type SidebarTab = "clients" | "team";
type ListFilter = "all" | "recent" | "unread";
type Selection =
  | { type: "conversation"; conversationId: string }
  | { type: "client"; clientId: string }
  | { type: "team-member"; memberId: string }
  | { type: "team-group"; conversationId: string }
  | null;

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatWhen(value: string | null, relative: boolean) {
  if (!value) return "No messages";

  const date = new Date(value);
  if (!relative) {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes < 1) return "Now";
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function preferredDeliveryType(
  conversation: ChatConversationSummary | null,
  emailConnected: boolean,
  quoConnected: boolean
): DeliveryType {
  if (!conversation) return "internal";
  if (conversation.kind === "team") return "internal";
  if (conversation.client?.email && emailConnected) return "email";
  if (conversation.client?.phone && quoConnected) return "sms";
  return "note";
}

function displayConversationTitle(conversation: ChatConversationSummary) {
  if (conversation.kind === "client") {
    return conversation.client?.name ?? conversation.title;
  }

  if (conversation.title === "Team HQ") return "Team";
  return conversation.title;
}

function sortConversations(items: ChatConversationSummary[]) {
  return [...items].sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTime - aTime;
  });
}

function passesListFilter(
  conversation: ChatConversationSummary | null | undefined,
  filter: ListFilter
) {
  if (filter === "all") return true;
  if (filter === "recent") return Boolean(conversation?.lastMessageAt);
  return Boolean(conversation?.unreadCount && conversation.unreadCount > 0);
}

function ContactQuickActions({
  clientId,
  clientName,
  phone,
  email,
  onEmail,
  onCall,
  onSms,
  busyAction,
}: {
  clientId?: string | null;
  clientName?: string;
  phone?: string | null;
  email?: string | null;
  onEmail?: (() => void) | null;
  onCall?: (() => void) | null;
  onSms?: (() => void) | null;
  busyAction?: "call" | "sms" | null;
}) {
  function handleAction(
    event: { preventDefault: () => void; stopPropagation: () => void },
    action: "call" | "sms" | "email"
  ) {
    event.preventDefault();
    event.stopPropagation();

    if (action === "call") {
      if (onCall) {
        onCall();
        return;
      }
      if (phone) window.location.href = `tel:${phone}`;
      return;
    }

    if (action === "sms") {
      if (onSms) {
        onSms();
        return;
      }
      if (phone) window.location.href = `sms:${phone}`;
      return;
    }

    if (onEmail) {
      onEmail();
      return;
    }
    if (email) window.location.href = `mailto:${email}`;
  }

  return (
    <div className="ml-auto hidden items-center gap-1 opacity-0 transition-opacity group-hover:flex group-hover:opacity-100 group-focus-within:flex group-focus-within:opacity-100">
      {phone && onCall ? (
        <span
          role="button"
          tabIndex={0}
          onClick={(event) => handleAction(event, "call")}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            handleAction(event, "call");
          }}
          className="rounded-md p-1.5 text-[#7d92a3] transition-colors hover:bg-white hover:text-[#007bb8]"
          aria-label={clientId ? `Call ${clientName ?? "client"} via Quo` : "Call"}
          title={busyAction === "call" ? "Opening Quo..." : clientId ? "Call in Quo" : "Call"}
        >
          <Phone className="size-3.5" />
        </span>
      ) : null}
      {email && onEmail ? (
        <span
          role="button"
          tabIndex={0}
          onClick={(event) => handleAction(event, "email")}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            handleAction(event, "email");
          }}
          className="rounded-md p-1.5 text-[#7d92a3] transition-colors hover:bg-white hover:text-[#007bb8]"
          aria-label={clientId ? `Email ${clientName ?? "client"}` : "Email"}
          title={clientId ? "Email from connected inbox" : "Email"}
        >
          <Mail className="size-3.5" />
        </span>
      ) : null}
      {phone && onSms ? (
        <span
          role="button"
          tabIndex={0}
          onClick={(event) => handleAction(event, "sms")}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            handleAction(event, "sms");
          }}
          className="rounded-md p-1.5 text-[#7d92a3] transition-colors hover:bg-white hover:text-[#007bb8]"
          aria-label={clientId ? `Text ${clientName ?? "client"} via Quo` : "SMS"}
          title={busyAction === "sms" ? "Opening Quo..." : clientId ? "Text in Quo" : "SMS"}
        >
          <MessageSquareText className="size-3.5" />
        </span>
      ) : null}
    </div>
  );
}

export function ChatWorkspace({ initialData }: { initialData: ChatWorkspaceData }) {
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [conversations, setConversations] = useState(() =>
    sortConversations(
      initialData.conversations.map((conversation) =>
        conversation.id === initialData.selectedConversationId
          ? { ...conversation, unreadCount: 0 }
          : conversation
      )
    )
  );
  const [threads, setThreads] = useState<Record<string, ChatThread>>(
    initialData.selectedThread && initialData.selectedConversationId
      ? {
          [initialData.selectedConversationId]: {
            ...initialData.selectedThread,
            conversation: { ...initialData.selectedThread.conversation, unreadCount: 0 },
          },
        }
      : {}
  );
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("clients");
  const [listFilter, setListFilter] = useState<ListFilter>("all");
  const [selection, setSelection] = useState<Selection>(
    initialData.selectedConversationId
      ? { type: "conversation", conversationId: initialData.selectedConversationId }
      : null
  );
  const [composer, setComposer] = useState("");
  const [deliveryType, setDeliveryType] = useState<DeliveryType>(
    preferredDeliveryType(
      initialData.selectedThread?.conversation ?? null,
      initialData.emailConnected,
      initialData.quoConnected
    )
  );
  const [search, setSearch] = useState("");
  const [loadingThread, setLoadingThread] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [deliveryWarning, setDeliveryWarning] = useState<string | null>(null);
  const [openingQuo, setOpeningQuo] = useState<{ clientId: string; action: "call" | "sms" } | null>(
    null
  );
  const [pending, startTransition] = useTransition();
  const deferredSearch = useDeferredValue(search).trim().toLowerCase();

  const selectedConversationId = selection?.type === "conversation" ? selection.conversationId : null;
  const selectedThread = selectedConversationId ? threads[selectedConversationId] ?? null : null;
  const selectedConversation =
    selectedThread?.conversation ??
    (selectedConversationId
      ? conversations.find((conversation) => conversation.id === selectedConversationId) ?? null
      : null);
  const canSendSelectedConversationEmail = Boolean(
    selectedConversation?.kind === "client" &&
      selectedConversation.client?.email &&
      initialData.emailConnected
  );
  const canSendSelectedConversationSms = Boolean(
    selectedConversation?.kind === "client" &&
      selectedConversation.client?.phone &&
      initialData.quoConnected
  );

  const clientConversationByClientId = new Map(
    conversations
      .filter((conversation) => conversation.kind === "client" && conversation.client?.id)
      .map((conversation) => [conversation.client!.id, conversation] as const)
  );

  const directTeamConversationByMemberId = new Map<string, ChatConversationSummary>();
  const teamGroupConversations: ChatConversationSummary[] = [];
  for (const conversation of conversations.filter((item) => item.kind === "team")) {
    const otherUsers = conversation.participants.filter(
      (participant) =>
        participant.type === "user" && participant.id !== initialData.currentUserId
    );

    if (otherUsers.length === 1 && conversation.participantCount <= 2) {
      directTeamConversationByMemberId.set(otherUsers[0].id, conversation);
      continue;
    }

    teamGroupConversations.push(conversation);
  }

  const selectedClient =
    selection?.type === "client"
      ? initialData.availableClients.find((client) => client.id === selection.clientId) ?? null
      : null;

  const selectedTeamMember =
    selection?.type === "team-member"
      ? initialData.teamMembers.find((member) => member.id === selection.memberId) ?? null
      : null;

  const selectedGroupConversation =
    selection?.type === "team-group"
      ? teamGroupConversations.find((conversation) => conversation.id === selection.conversationId) ?? null
      : null;

  async function handleOpenQuo(clientId: string, action: "call" | "sms") {
    setSendError(null);
    setOpeningQuo({ clientId, action });
    try {
      await openQuoContact(clientId);
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Unable to open Quo contact.");
    } finally {
      setOpeningQuo(null);
    }
  }

  function ensureClientDeliveryAvailable(
    client: { email?: string | null; phone?: string | null },
    nextDeliveryType: "email" | "sms"
  ) {
    if (nextDeliveryType === "email" && !initialData.emailConnected) {
      setSendError("Gmail or a fallback email provider is not connected in Settings.");
      return false;
    }

    if (nextDeliveryType === "email" && !client.email) {
      setSendError("This client has no email address.");
      return false;
    }

    if (nextDeliveryType === "sms" && !initialData.quoConnected) {
      setSendError("Quo is not connected in Settings.");
      return false;
    }

    if (nextDeliveryType === "sms" && !client.phone) {
      setSendError("This client has no phone number.");
      return false;
    }

    return true;
  }

  function openClientInbox(
    client: { id: string; name: string; email?: string | null; phone?: string | null },
    nextDeliveryType: "email" | "sms" | "note"
  ) {
    setSendError(null);

    if (
      (nextDeliveryType === "email" || nextDeliveryType === "sms") &&
      !ensureClientDeliveryAvailable(client, nextDeliveryType)
    ) {
      return;
    }

    const existingConversation = clientConversationByClientId.get(client.id);
    if (existingConversation) {
      selectConversation(existingConversation, nextDeliveryType);
      return;
    }

    void startClientConversation(client.id, nextDeliveryType);
  }

  async function loadThread(conversationId: string) {
    setLoadingThread(true);
    setSendError(null);

    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Failed to load thread");

      const thread = result as ChatThread;
      setThreads((current) => ({ ...current, [conversationId]: thread }));
      setConversations((current) =>
        sortConversations(
          current.map((conversation) =>
            conversation.id === conversationId ? thread.conversation : conversation
          )
        )
      );
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Failed to load thread");
    } finally {
      setLoadingThread(false);
    }
  }

  function upsertThread(thread: ChatThread) {
    setThreads((current) => ({ ...current, [thread.conversation.id]: thread }));
    setConversations((current) =>
      sortConversations([
        thread.conversation,
        ...current.filter((conversation) => conversation.id !== thread.conversation.id),
      ])
    );
    setSelection({ type: "conversation", conversationId: thread.conversation.id });
    setDeliveryType(
      preferredDeliveryType(
        thread.conversation,
        initialData.emailConnected,
        initialData.quoConnected
      )
    );
  }

  function markThreadRead(conversationId: string) {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation
      )
    );
    setThreads((current) => {
      const thread = current[conversationId];
      if (!thread) return current;
      return {
        ...current,
        [conversationId]: {
          ...thread,
          conversation: { ...thread.conversation, unreadCount: 0 },
        },
      };
    });

    void fetch(`/api/chat/conversations/${conversationId}/read`, { method: "POST" });
  }

  function selectConversation(
    conversation: ChatConversationSummary,
    nextDeliveryType?: DeliveryType
  ) {
    setSelection({ type: "conversation", conversationId: conversation.id });
    setDeliveryType(
      nextDeliveryType ??
        preferredDeliveryType(conversation, initialData.emailConnected, initialData.quoConnected)
    );
    if (!threads[conversation.id]) {
      void loadThread(conversation.id);
    }
    if (conversation.unreadCount > 0) {
      markThreadRead(conversation.id);
    }
  }

  async function startClientConversation(
    clientId: string,
    nextDeliveryType: "email" | "sms" | "note" = "note"
  ) {
    const client = initialData.availableClients.find((item) => item.id === clientId);
    if (!client) return;

    setSendError(null);
    startTransition(async () => {
      const response = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "client",
          clientId,
          title: client.name,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        setSendError(result.error ?? "Failed to start chat");
        return;
      }

      upsertThread(result as ChatThread);
      setDeliveryType(nextDeliveryType);
    });
  }

  async function startTeamConversation(memberId: string) {
    const member = initialData.teamMembers.find((item) => item.id === memberId);
    if (!member) return;

    setSendError(null);
    startTransition(async () => {
      const response = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "team",
          title: member.name,
          participantIds: [memberId],
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        setSendError(result.error ?? "Failed to start chat");
        return;
      }

      upsertThread(result as ChatThread);
    });
  }

  const handleRealtimeMessage = useEffectEvent(async (payload: {
    id: string;
    conversation_id: string;
    body: string;
    created_at: string;
    sender_kind: "user" | "client" | "system";
    sender_name: string;
    sender_role: string | null;
    sender_user_id: string | null;
    delivery_type: "internal" | "email" | "note" | "sms" | "system";
    delivery_status: "pending" | "sent" | "failed";
  }) => {
    const conversationId = payload.conversation_id;
    const existingThread = threads[conversationId];

    if (!existingThread) {
      await loadThread(conversationId);
      return;
    }

    setThreads((current) => {
      const thread = current[conversationId];
      if (!thread) return current;
      if (thread.messages.some((message) => message.id === payload.id)) return current;

      return {
        ...current,
        [conversationId]: {
          conversation: {
            ...thread.conversation,
            lastMessageAt: payload.created_at,
            lastMessagePreview: payload.body,
            lastMessageSenderName: payload.sender_name,
            unreadCount:
              payload.sender_user_id === initialData.currentUserId ||
              selectedConversationId === conversationId
                ? 0
                : thread.conversation.unreadCount + 1,
          },
          messages: [
            ...thread.messages,
            {
              id: payload.id,
              body: payload.body,
              createdAt: payload.created_at,
              senderKind: payload.sender_kind,
              senderName: payload.sender_name,
              senderRole: payload.sender_role,
              deliveryType: payload.delivery_type,
              deliveryStatus: payload.delivery_status,
              isOwnMessage: payload.sender_user_id === initialData.currentUserId,
            },
          ],
        },
      };
    });

    setConversations((current) =>
      sortConversations(
        current.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                lastMessageAt: payload.created_at,
                lastMessagePreview: payload.body,
                lastMessageSenderName: payload.sender_name,
                unreadCount:
                  payload.sender_user_id === initialData.currentUserId ||
                  selectedConversationId === conversationId
                    ? 0
                    : conversation.unreadCount + 1,
              }
            : conversation
        )
      )
    );

    if (conversationId === selectedConversationId && payload.sender_user_id !== initialData.currentUserId) {
      void fetch(`/api/chat/conversations/${conversationId}/read`, { method: "POST" });
    }
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`chat-messages:${initialData.businessId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `business_id=eq.${initialData.businessId}`,
        },
        (event) => {
          handleRealtimeMessage(event.new as never);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialData.businessId]);

  useEffect(() => {
    if (!initialData.selectedConversationId) return;
    const initiallySelected = initialData.conversations.find(
      (conversation) => conversation.id === initialData.selectedConversationId
    );
    if (!initiallySelected || initiallySelected.unreadCount === 0) return;

    void fetch(`/api/chat/conversations/${initialData.selectedConversationId}/read`, {
      method: "POST",
    });
  }, [initialData.conversations, initialData.selectedConversationId]);

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    if (!selectedConversationId || !composer.trim()) return;

    setSendError(null);
    setDeliveryWarning(null);

    startTransition(async () => {
      const response = await fetch(`/api/chat/conversations/${selectedConversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: composer,
          deliveryType,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        setSendError(result.error ?? "Failed to send message");
        return;
      }

      const sentAt = result.message.createdAt as string;
      const body = result.message.body as string;
      const senderName = result.message.senderName as string;

      setThreads((current) => {
        const thread = current[selectedConversationId];
        if (!thread) return current;
        if (thread.messages.some((message) => message.id === result.message.id)) return current;

        return {
          ...current,
          [selectedConversationId]: {
            conversation: {
              ...thread.conversation,
              unreadCount: 0,
              lastMessageAt: sentAt,
              lastMessagePreview: body,
              lastMessageSenderName: senderName,
            },
            messages: [...thread.messages, result.message],
          },
        };
      });

      setConversations((current) =>
        sortConversations(
          current.map((conversation) =>
            conversation.id === selectedConversationId
              ? {
                  ...conversation,
                  unreadCount: 0,
                  lastMessageAt: sentAt,
                  lastMessagePreview: body,
                  lastMessageSenderName: senderName,
                }
              : conversation
          )
        )
      );

      setComposer("");
      if (result.deliveryError) {
        setDeliveryWarning(result.deliveryError);
      }
    });
  }

  const filteredClients = initialData.availableClients.filter((client) => {
    const conversation = clientConversationByClientId.get(client.id);
    const haystack = [client.name, client.email, client.phone, client.companyName]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(deferredSearch) && passesListFilter(conversation, listFilter);
  });

  const filteredTeamMembers = initialData.teamMembers.filter((member) => {
    const conversation = directTeamConversationByMemberId.get(member.id);
    const haystack = [member.name, member.email, member.role].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(deferredSearch) && passesListFilter(conversation, listFilter);
  });

  const filteredTeamGroups = teamGroupConversations.filter((conversation) => {
    const haystack = [
      displayConversationTitle(conversation),
      conversation.lastMessagePreview,
      conversation.lastMessageSenderName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(deferredSearch) && passesListFilter(conversation, listFilter);
  });

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1a2d3d]">Chat</h1>
        <p className="text-sm text-muted-foreground">
          Message clients and your team from one place.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#e4ecf3] bg-white shadow-[0_1px_4px_rgba(0,20,40,0.05)]">
        <div className="grid min-h-[720px] grid-cols-1 lg:grid-cols-[320px_1fr]">
          <aside className="border-b border-[#edf3f8] lg:border-b-0 lg:border-r">
            <div className="space-y-4 border-b border-[#edf3f8] p-5">
              <div className="flex gap-2">
                {[
                  { key: "clients", label: "Clients" },
                  { key: "team", label: "Team" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setSidebarTab(tab.key as SidebarTab)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                      sidebarTab === tab.key
                        ? "bg-[#007bb8] text-white"
                        : "bg-[#f3f7fa] text-[#4a6070] hover:bg-[#e8f0f6]"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8aa0b2]" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={sidebarTab === "clients" ? "Search clients" : "Search team"}
                  className="pl-9"
                />
              </div>

              <div className="flex gap-1">
                {[
                  { key: "all", label: "All" },
                  { key: "recent", label: "Recent" },
                  { key: "unread", label: "Unread" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setListFilter(item.key as ListFilter)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                      listFilter === item.key
                        ? "bg-[#eaf4fb] text-[#007bb8]"
                        : "text-[#6f8597] hover:bg-[#f3f7fa]"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <ScrollArea className="h-[620px]">
              <div className="p-3">
                {sidebarTab === "clients" ? (
                  <div className="space-y-1.5">
                    {filteredClients.length > 0 ? (
                      filteredClients.map((client) => {
                        const conversation = clientConversationByClientId.get(client.id) ?? null;
                        const isActive =
                          (selection?.type === "conversation" && conversation?.id === selection.conversationId) ||
                          (selection?.type === "client" && selection.clientId === client.id);

                        return (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => {
                              if (conversation) {
                                selectConversation(conversation);
                              } else {
                                setSelection({ type: "client", clientId: client.id });
                                setDeliveryType(
                                  client.email && initialData.emailConnected
                                    ? "email"
                                    : client.phone && initialData.quoConnected
                                      ? "sms"
                                      : "note"
                                );
                              }
                            }}
                            className={cn(
                              "group flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                              isActive ? "bg-[#f5f9fc]" : "hover:bg-[#f8fbfd]"
                            )}
                          >
                            <Avatar className="h-9 w-9">
                              <AvatarFallback
                                className="font-semibold text-white"
                                style={{ background: "linear-gradient(135deg, #007bb8, #29b6f6)" }}
                              >
                                {initials(client.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <div className="truncate text-sm font-medium text-[#1a2d3d]">
                                  {client.name}
                                </div>
                                {conversation?.unreadCount ? (
                                  <span className="rounded-full bg-[#d32f2f] px-2 py-0.5 text-[10px] font-bold text-white">
                                    {conversation.unreadCount}
                                  </span>
                                ) : null}
                                <ContactQuickActions
                                  clientId={client.id}
                                  clientName={client.name}
                                  phone={client.phone}
                                  email={client.email}
                                  onEmail={
                                    client.email && initialData.emailConnected
                                      ? () => openClientInbox(client, "email")
                                      : null
                                  }
                                  onCall={() => void handleOpenQuo(client.id, "call")}
                                  onSms={
                                    client.phone && initialData.quoConnected
                                      ? () => openClientInbox(client, "sms")
                                      : null
                                  }
                                  busyAction={
                                    openingQuo?.clientId === client.id ? openingQuo.action : null
                                  }
                                />
                              </div>
                              <div className="truncate text-xs text-[#7d92a3]">
                                {client.email || client.phone || "No contact info"}
                              </div>
                              <div className="mt-1 truncate text-xs text-[#9baab8]">
                                {conversation?.lastMessagePreview ?? "No messages yet"}
                              </div>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                        No clients found
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredTeamGroups.length > 0 ? (
                      <div className="space-y-1.5">
                        <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.6px] text-[#8aa0b2]">
                          Team chats
                        </div>
                        {filteredTeamGroups.map((conversation) => {
                          const isActive =
                            selection?.type === "conversation" &&
                            selection.conversationId === conversation.id;

                          return (
                            <button
                              key={conversation.id}
                              type="button"
                              onClick={() => selectConversation(conversation)}
                              className={cn(
                                "group flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                                isActive ? "bg-[#f5f9fc]" : "hover:bg-[#f8fbfd]"
                              )}
                            >
                              <Avatar className="h-9 w-9">
                                <AvatarFallback
                                  className="font-semibold text-white"
                                  style={{ background: "linear-gradient(135deg, #0d1c2e, #274d6b)" }}
                                >
                                  <Users className="size-4" />
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="truncate text-sm font-medium text-[#1a2d3d]">
                                    {displayConversationTitle(conversation)}
                                  </div>
                                  {conversation.unreadCount ? (
                                    <span className="rounded-full bg-[#d32f2f] px-2 py-0.5 text-[10px] font-bold text-white">
                                      {conversation.unreadCount}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="mt-1 truncate text-xs text-[#9baab8]">
                                  {conversation.lastMessagePreview ?? "No messages yet"}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    <div className="space-y-1.5">
                      <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.6px] text-[#8aa0b2]">
                        Team members
                      </div>
                      {filteredTeamMembers.length > 0 ? (
                        filteredTeamMembers.map((member) => {
                          const conversation = directTeamConversationByMemberId.get(member.id) ?? null;
                          const isActive =
                            (selection?.type === "conversation" && conversation?.id === selection.conversationId) ||
                            (selection?.type === "team-member" && selection.memberId === member.id);

                          return (
                            <button
                              key={member.id}
                              type="button"
                              onClick={() => {
                                if (conversation) {
                                  selectConversation(conversation);
                                } else {
                                  setSelection({ type: "team-member", memberId: member.id });
                                  setDeliveryType("internal");
                                }
                              }}
                              className={cn(
                                "group flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                                isActive ? "bg-[#f5f9fc]" : "hover:bg-[#f8fbfd]"
                              )}
                            >
                              <Avatar className="h-9 w-9">
                                <AvatarFallback
                                  className="font-semibold text-white"
                                  style={{ background: "linear-gradient(135deg, #0d1c2e, #274d6b)" }}
                                >
                                  {initials(member.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="truncate text-sm font-medium text-[#1a2d3d]">
                                    {member.name}
                                  </div>
                                  {conversation?.unreadCount ? (
                                    <span className="rounded-full bg-[#d32f2f] px-2 py-0.5 text-[10px] font-bold text-white">
                                      {conversation.unreadCount}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="truncate text-xs text-[#7d92a3]">
                                  {member.role || "Team"}
                                </div>
                                <div className="mt-1 truncate text-xs text-[#9baab8]">
                                  {conversation?.lastMessagePreview ?? member.email}
                                </div>
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                          No team members found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </aside>

          <div className="flex min-w-0 flex-col">
            {selectedConversation ? (
              <>
                <div className="flex items-center justify-between gap-3 border-b border-[#edf3f8] px-5 py-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-[#1a2d3d]">
                      {displayConversationTitle(selectedConversation)}
                    </h2>
                    <div className="text-sm text-muted-foreground">
                      {selectedConversation.kind === "client"
                        ? selectedConversation.client?.email || selectedConversation.client?.phone || "Client"
                        : selectedConversation.lastMessageSenderName || "Team"}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDeliveryType("email")}
                      disabled={!canSendSelectedConversationEmail}
                      title={
                        canSendSelectedConversationEmail
                          ? "Send via email"
                          : "Email is not available for this client"
                      }
                    >
                      <Mail className="size-4" />
                      Email
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDeliveryType("sms")}
                      disabled={!canSendSelectedConversationSms}
                      title={
                        canSendSelectedConversationSms
                          ? "Send via SMS"
                          : "SMS is not available for this client"
                      }
                    >
                      <MessageSquareText className="size-4" />
                      SMS
                    </Button>
                    {selectedConversation.client?.phone ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void handleOpenQuo(selectedConversation.client!.id, "call")}
                        disabled={
                          openingQuo?.clientId === selectedConversation.client.id && openingQuo.action === "call"
                        }
                      >
                        <Phone className="size-4" />
                        {openingQuo?.clientId === selectedConversation.client.id &&
                        openingQuo.action === "call"
                          ? "Opening Quo..."
                          : "Call"}
                      </Button>
                    ) : null}
                  </div>
                </div>

                <ScrollArea className="h-[470px]">
                  <div className="space-y-3 px-5 py-5">
                    {loadingThread && !selectedThread ? (
                      <div className="text-sm text-muted-foreground">Loading messages...</div>
                    ) : selectedThread?.messages.length ? (
                      selectedThread.messages.map((message) => (
                        <div
                          key={message.id}
                          className={cn("flex", message.isOwnMessage ? "justify-end" : "justify-start")}
                        >
                          <div
                            className={cn(
                              "max-w-[78%] rounded-2xl px-4 py-3",
                              message.isOwnMessage
                                ? "bg-[#007bb8] text-white"
                                : "bg-[#f5f8fb] text-[#1f3445]"
                            )}
                          >
                            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold opacity-80">
                              <span>{message.senderName}</span>
                              <span>{formatWhen(message.createdAt, isHydrated)}</span>
                              {message.deliveryType !== "internal" ? (
                                <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] uppercase">
                                  {message.deliveryType}
                                </span>
                              ) : null}
                            </div>
                            <div className="whitespace-pre-wrap text-sm leading-6">{message.body}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed p-8 text-center">
                        <p className="font-medium text-gray-900">No messages yet</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Send the first message to start this chat.
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <form onSubmit={handleSend} className="border-t border-[#edf3f8] p-5">
                  {selectedConversation.kind === "client" ? (
                    <div className="mb-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setDeliveryType("email")}
                        disabled={!canSendSelectedConversationEmail}
                        title={
                          canSendSelectedConversationEmail
                            ? "Send via email"
                            : "Email is not available for this client"
                        }
                        className={cn(
                          "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                          deliveryType === "email"
                            ? "bg-[#007bb8] text-white"
                            : "bg-[#f3f7fa] text-[#4a6070]",
                          !canSendSelectedConversationEmail && "cursor-not-allowed opacity-50"
                        )}
                      >
                        Email
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeliveryType("sms")}
                        disabled={!canSendSelectedConversationSms}
                        title={
                          canSendSelectedConversationSms
                            ? "Send via SMS"
                            : "SMS is not available for this client"
                        }
                        className={cn(
                          "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                          deliveryType === "sms"
                            ? "bg-[#007bb8] text-white"
                            : "bg-[#f3f7fa] text-[#4a6070]",
                          !canSendSelectedConversationSms && "cursor-not-allowed opacity-50"
                        )}
                      >
                        SMS
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeliveryType("note")}
                        className={cn(
                          "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                          deliveryType === "note"
                            ? "bg-[#007bb8] text-white"
                            : "bg-[#f3f7fa] text-[#4a6070]"
                        )}
                      >
                        Internal note
                      </button>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Textarea
                      value={composer}
                      onChange={(event) => setComposer(event.target.value)}
                      placeholder="Write a message"
                      className="min-h-24"
                    />
                    <Button
                      type="submit"
                      disabled={pending || !composer.trim()}
                      className="sm:self-end"
                    >
                      <Send className="size-4" />
                      {pending ? "Sending..." : "Send"}
                    </Button>
                  </div>

                  {sendError ? (
                    <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                      {sendError}
                    </div>
                  ) : null}
                  {deliveryWarning ? (
                    <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                      {deliveryWarning}
                    </div>
                  ) : null}
                </form>
              </>
            ) : selectedClient ? (
              <div className="flex h-full flex-1 items-center justify-center p-8">
                <div className="w-full max-w-md rounded-2xl border border-[#e4ecf3] bg-white p-6 text-center">
                  <Avatar className="mx-auto h-12 w-12">
                    <AvatarFallback
                      className="font-semibold text-white"
                      style={{ background: "linear-gradient(135deg, #007bb8, #29b6f6)" }}
                    >
                      {initials(selectedClient.name)}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="mt-4 text-lg font-semibold text-[#1a2d3d]">{selectedClient.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedClient.email || selectedClient.phone || "No contact info"}
                  </p>
                  <div className="mt-5 flex justify-center gap-2">
                    <Button onClick={() => startClientConversation(selectedClient.id)} disabled={pending}>
                      <MessageSquareText className="size-4" />
                      {pending ? "Starting..." : "Start chat"}
                    </Button>
                    {selectedClient.email && initialData.emailConnected ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => openClientInbox(selectedClient, "email")}
                      >
                        <Mail className="size-4" />
                        Email
                      </Button>
                    ) : null}
                    {selectedClient.phone && initialData.quoConnected ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => openClientInbox(selectedClient, "sms")}
                      >
                        <MessageSquareText className="size-4" />
                        SMS
                      </Button>
                    ) : null}
                    {selectedClient.phone ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleOpenQuo(selectedClient.id, "call")}
                        disabled={openingQuo?.clientId === selectedClient.id && openingQuo.action === "call"}
                      >
                        <Phone className="size-4" />
                        {openingQuo?.clientId === selectedClient.id && openingQuo.action === "call"
                          ? "Opening Quo..."
                          : "Call"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : selectedTeamMember ? (
              <div className="flex h-full flex-1 items-center justify-center p-8">
                <div className="w-full max-w-md rounded-2xl border border-[#e4ecf3] bg-white p-6 text-center">
                  <Avatar className="mx-auto h-12 w-12">
                    <AvatarFallback
                      className="font-semibold text-white"
                      style={{ background: "linear-gradient(135deg, #0d1c2e, #274d6b)" }}
                    >
                      {initials(selectedTeamMember.name)}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="mt-4 text-lg font-semibold text-[#1a2d3d]">{selectedTeamMember.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedTeamMember.role || "Team"} · {selectedTeamMember.email}
                  </p>
                  <div className="mt-5 flex justify-center gap-2">
                    <Button onClick={() => startTeamConversation(selectedTeamMember.id)} disabled={pending}>
                      <MessageSquareText className="size-4" />
                      {pending ? "Starting..." : "Start chat"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : selectedGroupConversation ? (
              <div className="flex h-full flex-1 items-center justify-center p-8">
                <div className="w-full max-w-md rounded-2xl border border-[#e4ecf3] bg-white p-6 text-center">
                  <h2 className="text-lg font-semibold text-[#1a2d3d]">
                    {displayConversationTitle(selectedGroupConversation)}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Open the chat to view messages.
                  </p>
                  <div className="mt-5 flex justify-center">
                    <Button onClick={() => selectConversation(selectedGroupConversation)}>
                      Open chat
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center p-8">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#eef5fb] text-[#007bb8]">
                    <MessageSquareText className="size-6" />
                  </div>
                  <h2 className="text-lg font-semibold text-[#1a2d3d]">Select a client or team member</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Start on the left to open a chat.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
