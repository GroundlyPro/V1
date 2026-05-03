import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

type ClientRow = Database["public"]["Tables"]["clients"]["Row"];
type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];
type AddressRow = Database["public"]["Tables"]["client_addresses"]["Row"];
type AddressInsert = Database["public"]["Tables"]["client_addresses"]["Insert"];
type QuoteInsert = Database["public"]["Tables"]["quotes"]["Insert"];
type QuoteLineItemInsert = Database["public"]["Tables"]["quote_line_items"]["Insert"];
type RequestRow = Database["public"]["Tables"]["requests"]["Row"];
type RequestInsert = Database["public"]["Tables"]["requests"]["Insert"];
type RequestUpdate = Database["public"]["Tables"]["requests"]["Update"];
type ReminderInsert = Database["public"]["Tables"]["reminders"]["Insert"];
type BusinessRow = Database["public"]["Tables"]["businesses"]["Row"];
type UserRow = Database["public"]["Tables"]["users"]["Row"];

export type RequestStatus = "new" | "in_review" | "converted" | "declined";
export type RequestFilter = "all" | "open" | RequestStatus;
export type RequestDateFilter = "all" | "today" | "this_week" | "this_month" | "past_30_days" | "custom";

export type RequestListItem = Pick<
  RequestRow,
  | "id"
  | "created_at"
  | "address"
  | "first_name"
  | "last_name"
  | "email"
  | "phone"
  | "service_type"
  | "status"
  | "source"
> & {
  users: Pick<UserRow, "id" | "first_name" | "last_name"> | null;
};

export type RequestDetail = RequestRow & {
  converted_quote: { id: string; quote_number: string | null; title: string } | null;
  users: Pick<UserRow, "id" | "first_name" | "last_name" | "email"> | null;
};

export interface PublicRequestInput {
  business_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address?: string;
  service_type?: string;
  message?: string;
  preferred_date?: string;
}

export interface ManualRequestInput {
  client_id: string;
  email?: string;
  phone?: string;
  address?: string;
  service_type?: string;
  requested_on?: string;
  reminder_at?: string;
  message?: string;
  assigned_to?: string;
  image_url?: string;
}

export interface UpdateRequestInput {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address?: string;
  service_type?: string;
  requested_on?: string;
  reminder_at?: string;
  message?: string;
  assigned_to?: string;
  image_url?: string;
}

export type RequestClientOption = Pick<
  ClientRow,
  "id" | "first_name" | "last_name" | "company_name" | "email" | "phone"
> & {
  client_addresses: Pick<
    AddressRow,
    "id" | "label" | "street1" | "street2" | "city" | "state" | "zip" | "is_primary"
  >[];
};

export type RequestTeamMemberOption = Pick<
  UserRow,
  "id" | "first_name" | "last_name" | "role" | "email"
>;

const UNASSIGNED = "unassigned";

export interface RequestFilters {
  search?: string;
  status?: RequestFilter;
  assignedTo?: string;
  createdRange?: RequestDateFilter;
  createdFrom?: string;
  createdTo?: string;
}

export interface RequestDashboardStats {
  overview: Record<RequestStatus, number>;
  newRequests: {
    count: number;
    delta: number;
  };
  conversionRate: {
    value: number;
    delta: number;
  };
  unassignedOpen: number;
}

function startOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(value: Date) {
  const next = startOfDay(value);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

async function getMyProfile() {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: profile, error } = await supabase
    .from("users")
    .select("id, business_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!profile) throw new Error("Business profile not found");

  return { supabase, profile };
}

function clean(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function messageWithPreferredDate(message?: string, preferredDate?: string) {
  const body = clean(message);
  if (!preferredDate) return body;
  return [body, `Preferred date: ${preferredDate}`].filter(Boolean).join("\n\n");
}

function toIsoDateTime(value?: string | null) {
  const normalized = clean(value);
  if (!normalized) return null;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) throw new Error("Invalid reminder date.");
  return parsed.toISOString();
}

export async function getRequests(
  businessId: string,
  filters: RequestFilters = {}
): Promise<RequestListItem[]> {
  const supabase = await createSupabaseClient();
  let query = supabase
    .from("requests")
    .select(`
      id,
      created_at,
      address,
      first_name,
      last_name,
      email,
      phone,
      service_type,
      status,
      source,
      users:users!requests_assigned_to_fkey(id, first_name, last_name)
    `)
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (filters.status === "open") {
    query = query.in("status", ["new", "in_review"]);
  } else if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.search?.trim()) {
    const term = filters.search.trim();
    query = query.or(
      [
        `first_name.ilike.%${term}%`,
        `last_name.ilike.%${term}%`,
        `email.ilike.%${term}%`,
        `phone.ilike.%${term}%`,
        `address.ilike.%${term}%`,
        `service_type.ilike.%${term}%`,
      ].join(",")
    );
  }

  if (filters.assignedTo && filters.assignedTo !== "all") {
    if (filters.assignedTo === UNASSIGNED) {
      query = query.is("assigned_to", null);
    } else {
      query = query.eq("assigned_to", filters.assignedTo);
    }
  }

  const now = new Date();
  if (filters.createdRange === "today") {
    query = query
      .gte("created_at", startOfDay(now).toISOString())
      .lt("created_at", addDays(startOfDay(now), 1).toISOString());
  }

  if (filters.createdRange === "this_week") {
    const weekStart = startOfWeek(now);
    query = query
      .gte("created_at", weekStart.toISOString())
      .lt("created_at", addDays(weekStart, 7).toISOString());
  }

  if (filters.createdRange === "this_month") {
    const monthStart = startOfMonth(now);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    query = query
      .gte("created_at", monthStart.toISOString())
      .lt("created_at", nextMonthStart.toISOString());
  }

  if (filters.createdRange === "past_30_days") {
    query = query.gte("created_at", addDays(now, -30).toISOString()).lt("created_at", now.toISOString());
  }

  if (filters.createdRange === "custom") {
    if (filters.createdFrom) {
      query = query.gte("created_at", startOfDay(new Date(filters.createdFrom)).toISOString());
    }
    if (filters.createdTo) {
      query = query.lt("created_at", addDays(startOfDay(new Date(filters.createdTo)), 1).toISOString());
    }
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []) as RequestListItem[];
}

export async function getRequest(id: string, businessId: string): Promise<RequestDetail | null> {
  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("requests")
    .select(`
      *,
      converted_quote:quotes!requests_converted_to_quote_id_fkey(id, quote_number, title),
      users!requests_assigned_to_fkey(id, first_name, last_name, email)
    `)
    .eq("id", id)
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) throw error;
  return data as RequestDetail | null;
}

export async function getRequestDashboardStats(businessId: string): Promise<RequestDashboardStats> {
  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("requests")
    .select("id, status, created_at, assigned_to")
    .eq("business_id", businessId);

  if (error) throw error;

  const requests = data ?? [];
  const now = new Date();
  const currentStart = addDays(now, -30);
  const previousStart = addDays(now, -60);
  const inRange = (value: string | null, from: Date, to: Date) => {
    if (!value) return false;
    const date = new Date(value);
    return date >= from && date < to;
  };
  const percentChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const overview: RequestDashboardStats["overview"] = {
    new: 0,
    in_review: 0,
    converted: 0,
    declined: 0,
  };

  for (const request of requests) {
    if (request.status in overview) {
      overview[request.status as RequestStatus] += 1;
    }
  }

  const currentRequests = requests.filter((request) => inRange(request.created_at, currentStart, now));
  const previousRequests = requests.filter((request) => inRange(request.created_at, previousStart, currentStart));
  const currentConverted = currentRequests.filter((request) => request.status === "converted").length;
  const previousConverted = previousRequests.filter((request) => request.status === "converted").length;
  const currentConversionRate =
    currentRequests.length > 0 ? Math.round((currentConverted / currentRequests.length) * 100) : 0;
  const previousConversionRate =
    previousRequests.length > 0 ? Math.round((previousConverted / previousRequests.length) * 100) : 0;

  return {
    overview,
    newRequests: {
      count: currentRequests.length,
      delta: percentChange(currentRequests.length, previousRequests.length),
    },
    conversionRate: {
      value: currentConversionRate,
      delta: currentConversionRate - previousConversionRate,
    },
    unassignedOpen: requests.filter(
      (request) => !request.assigned_to && (request.status === "new" || request.status === "in_review")
    ).length,
  };
}

export async function updateRequestStatus(id: string, status: RequestStatus) {
  const { supabase, profile } = await getMyProfile();
  const update: RequestUpdate = { status };

  const { error } = await supabase
    .from("requests")
    .update(update)
    .eq("id", id)
    .eq("business_id", profile.business_id);

  if (error) throw error;
}

export async function updateRequestAssignee(id: string, assignedTo?: string | null) {
  const { supabase, profile } = await getMyProfile();
  const update: RequestUpdate = {
    assigned_to: assignedTo === UNASSIGNED ? null : clean(assignedTo),
  };

  const { error } = await supabase
    .from("requests")
    .update(update)
    .eq("id", id)
    .eq("business_id", profile.business_id);

  if (error) throw error;
}

export async function updateRequest(id: string, input: UpdateRequestInput) {
  const { supabase, profile } = await getMyProfile();
  const update: RequestUpdate = {
    first_name: input.first_name.trim(),
    last_name: input.last_name.trim(),
    email: clean(input.email),
    phone: clean(input.phone),
    address: clean(input.address),
    service_type: clean(input.service_type),
    requested_on: clean(input.requested_on),
    reminder_at: toIsoDateTime(input.reminder_at),
    message: clean(input.message),
    assigned_to: input.assigned_to === UNASSIGNED ? null : clean(input.assigned_to),
    image_url: clean(input.image_url),
  };

  const { error } = await supabase
    .from("requests")
    .update(update)
    .eq("id", id)
    .eq("business_id", profile.business_id);

  if (error) throw error;
}

export async function getRequestFormOptions(businessId: string) {
  const supabase = await createSupabaseClient();

  const [clientsResult, membersResult] = await Promise.all([
    supabase
      .from("clients")
      .select("id, first_name, last_name, company_name, email, phone, client_addresses(*)")
      .eq("business_id", businessId)
      .order("last_name", { ascending: true }),
    supabase
      .from("users")
      .select("id, first_name, last_name, role, email")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .order("first_name", { ascending: true }),
  ]);

  if (clientsResult.error) throw clientsResult.error;
  if (membersResult.error) throw membersResult.error;

  return {
    clients: (clientsResult.data ?? []) as RequestClientOption[],
    teamMembers: (membersResult.data ?? []) as RequestTeamMemberOption[],
  };
}

export async function convertRequestToQuote(id: string) {
  const { supabase, profile } = await getMyProfile();
  const businessId = profile.business_id;

  const { data: request, error: requestError } = await supabase
    .from("requests")
    .select("*")
    .eq("id", id)
    .eq("business_id", businessId)
    .single();

  if (requestError) throw requestError;

  let clientId = request.client_id;
  let addressId: string | null = null;

  if (!clientId) {
    const clientPayload: ClientInsert = {
      business_id: businessId,
      first_name: request.first_name,
      last_name: request.last_name,
      email: clean(request.email),
      phone: clean(request.phone),
      status: "lead",
      type: "residential",
      lead_source: request.source,
      notes: clean(request.message),
    };

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .insert(clientPayload)
      .select("id")
      .single();

    if (clientError) throw clientError;
    clientId = client.id;

    if (request.address) {
      const addressPayload: AddressInsert = {
        business_id: businessId,
        client_id: clientId,
        label: "Request address",
        street1: request.address,
        city: "",
        state: "",
        zip: "",
        country: "US",
        is_primary: true,
        is_billing: true,
      };

      const { data: address, error: addressError } = await supabase
        .from("client_addresses")
        .insert(addressPayload)
        .select("id")
        .single();

      if (addressError) throw addressError;
      addressId = address.id;
    }
  }

  const quotePayload: QuoteInsert = {
    business_id: businessId,
    client_id: clientId,
    address_id: addressId,
    title: request.service_type || "New service request",
    message_to_client: clean(request.message),
    internal_notes: `Created from request ${request.id}`,
    created_by: profile.id,
  };

  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .insert(quotePayload)
    .select("id")
    .single();

  if (quoteError) throw quoteError;

  if (request.service_type) {
    const lineItemPayload: QuoteLineItemInsert = {
      business_id: businessId,
      quote_id: quote.id,
      name: request.service_type,
      description: clean(request.message),
      quantity: 1,
      unit_cost: 0,
      unit_price: 0,
      total: 0,
      sort_order: 0,
    };

    const { error: lineItemError } = await supabase.from("quote_line_items").insert(lineItemPayload);
    if (lineItemError) throw lineItemError;
  }

  const { error: updateError } = await supabase
    .from("requests")
    .update({ status: "converted", client_id: clientId, converted_to_quote_id: quote.id })
    .eq("id", id)
    .eq("business_id", businessId);

  if (updateError) throw updateError;
  return quote;
}

export async function getBusinessBySlug(
  slug: string
): Promise<Pick<BusinessRow, "id" | "name" | "email" | "phone"> | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("id, name, email, phone")
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).find((business) => slugify(business.name) === slug) ?? null;
}

export async function submitPublicRequest(input: PublicRequestInput) {
  const supabase = createAdminClient();
  const payload: RequestInsert = {
    business_id: input.business_id,
    first_name: input.first_name.trim(),
    last_name: input.last_name.trim(),
    email: clean(input.email),
    phone: clean(input.phone),
    address: clean(input.address),
    service_type: clean(input.service_type),
    message: messageWithPreferredDate(input.message, input.preferred_date),
    source: "booking_widget",
    status: "new",
  };

  const { data, error } = await supabase.from("requests").insert(payload).select("id").single();
  if (error) throw error;

  return data;
}

export async function createManualRequest(input: ManualRequestInput) {
  const { supabase, profile } = await getMyProfile();
  const businessId = profile.business_id;
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select(`
      id,
      first_name,
      last_name,
      email,
      phone,
      client_addresses(id, label, street1, street2, city, state, zip, is_primary)
    `)
    .eq("id", input.client_id)
    .eq("business_id", businessId)
    .single();

  if (clientError) throw clientError;

  const primaryAddress =
    client.client_addresses.find((address) => address.is_primary) ?? client.client_addresses[0];
  const addressFromClient = primaryAddress
    ? [
        primaryAddress.label || undefined,
        primaryAddress.street1,
        primaryAddress.street2,
        primaryAddress.city,
        primaryAddress.state,
        primaryAddress.zip,
      ]
        .filter(Boolean)
        .join(", ")
    : null;

  const payload: RequestInsert = {
    business_id: businessId,
    client_id: client.id,
    first_name: client.first_name.trim(),
    last_name: client.last_name.trim(),
    email: clean(input.email) ?? clean(client.email),
    phone: clean(input.phone) ?? clean(client.phone),
    address: clean(input.address) ?? addressFromClient,
    service_type: clean(input.service_type),
    message: clean(input.message),
    assigned_to: input.assigned_to === UNASSIGNED ? null : clean(input.assigned_to),
    image_url: clean(input.image_url),
    reminder_at: toIsoDateTime(input.reminder_at),
    requested_on: clean(input.requested_on),
    source: "manual",
    status: "new",
  };

  const { data, error } = await supabase.from("requests").insert(payload).select("id").single();
  if (error) throw error;

  if (payload.reminder_at) {
    const reminderPayload: ReminderInsert = {
      business_id: businessId,
      entity_id: data.id,
      entity_type: "request",
      channel: "dashboard",
      remind_at: payload.reminder_at,
      message: `Follow up on request from ${client.first_name} ${client.last_name}${input.service_type ? ` for ${input.service_type}` : ""}.`,
    };

    const { error: reminderError } = await supabase.from("reminders").insert(reminderPayload);
    if (reminderError) throw reminderError;
  }

  return data;
}
