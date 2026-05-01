import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];
type AddressInsert = Database["public"]["Tables"]["client_addresses"]["Insert"];
type QuoteInsert = Database["public"]["Tables"]["quotes"]["Insert"];
type QuoteLineItemInsert = Database["public"]["Tables"]["quote_line_items"]["Insert"];
type RequestRow = Database["public"]["Tables"]["requests"]["Row"];
type RequestInsert = Database["public"]["Tables"]["requests"]["Insert"];
type RequestUpdate = Database["public"]["Tables"]["requests"]["Update"];
type BusinessRow = Database["public"]["Tables"]["businesses"]["Row"];

export type RequestStatus = "new" | "in_review" | "converted" | "declined";
export type RequestFilter = "all" | RequestStatus;

export type RequestListItem = Pick<
  RequestRow,
  | "id"
  | "created_at"
  | "first_name"
  | "last_name"
  | "email"
  | "phone"
  | "service_type"
  | "status"
  | "source"
>;

export type RequestDetail = RequestRow & {
  converted_quote: { id: string; quote_number: string | null; title: string } | null;
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

export type ManualRequestInput = Omit<PublicRequestInput, "business_id">;

export interface RequestFilters {
  status?: RequestFilter;
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

export async function getRequests(
  businessId: string,
  filters: RequestFilters = {}
): Promise<RequestListItem[]> {
  const supabase = await createSupabaseClient();
  let query = supabase
    .from("requests")
    .select("id, created_at, first_name, last_name, email, phone, service_type, status, source")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []) as RequestListItem[];
}

export async function getRequest(id: string, businessId: string): Promise<RequestDetail | null> {
  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("requests")
    .select("*, converted_quote:quotes!requests_converted_to_quote_id_fkey(id, quote_number, title)")
    .eq("id", id)
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) throw error;
  return data as RequestDetail | null;
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
  const payload: RequestInsert = {
    business_id: profile.business_id,
    first_name: input.first_name.trim(),
    last_name: input.last_name.trim(),
    email: clean(input.email),
    phone: clean(input.phone),
    address: clean(input.address),
    service_type: clean(input.service_type),
    message: messageWithPreferredDate(input.message, input.preferred_date),
    source: "manual",
    status: "new",
  };

  const { data, error } = await supabase.from("requests").insert(payload).select("id").single();
  if (error) throw error;

  return data;
}
