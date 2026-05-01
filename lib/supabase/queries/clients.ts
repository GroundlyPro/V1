import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type ClientRow = Database["public"]["Tables"]["clients"]["Row"];
type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];
type ClientUpdate = Database["public"]["Tables"]["clients"]["Update"];
type AddressRow = Database["public"]["Tables"]["client_addresses"]["Row"];
type AddressInsert = Database["public"]["Tables"]["client_addresses"]["Insert"];
type AddressUpdate = Database["public"]["Tables"]["client_addresses"]["Update"];
type ContactRow = Database["public"]["Tables"]["client_contacts"]["Row"];
type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];
type NoteRow = Database["public"]["Tables"]["notes"]["Row"];

export type ClientListItem = ClientRow & {
  client_addresses: AddressRow[];
};

export type ClientDetail = ClientRow & {
  client_addresses: AddressRow[];
  client_contacts: ContactRow[];
  jobs: Pick<JobRow, "id" | "job_number" | "title" | "status" | "total_price" | "start_date">[];
  invoices: Pick<InvoiceRow, "id" | "invoice_number" | "status" | "total" | "balance" | "due_date">[];
  timeline_notes: Pick<NoteRow, "id" | "body" | "is_pinned" | "created_at">[];
};

export interface ClientFilters {
  search?: string;
  status?: "all" | "active" | "lead" | "inactive";
}

export interface ClientFormInput {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company_name?: string;
  status?: string;
  type?: string;
  street: string;
  street2?: string;
  city: string;
  state: string;
  zip?: string;
  notes?: string;
  tags?: string;
}

export interface ClientAddressInput {
  label?: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  is_billing?: boolean;
  is_primary?: boolean;
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

function clean(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function tagsFromInput(tags?: string) {
  const values = tags
    ?.split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  return values && values.length > 0 ? values : null;
}

export async function getClients(
  businessId: string,
  filters: ClientFilters = {}
): Promise<ClientListItem[]> {
  const supabase = await createSupabaseClient();
  let query = supabase
    .from("clients")
    .select(
      "*, client_addresses(id, created_at, updated_at, client_id, business_id, label, street1, street2, city, state, zip, country, lat, lng, is_billing, is_primary, tax_rate_id)"
    )
    .eq("business_id", businessId)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.search) {
    const search = filters.search.replaceAll("%", "").trim();
    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,company_name.ilike.%${search}%,email.ilike.%${search}%`
      );
    }
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []) as ClientListItem[];
}

export async function getClient(id: string, businessId?: string): Promise<ClientDetail | null> {
  const supabase = await createSupabaseClient();
  let query = supabase
    .from("clients")
    .select(
      `
      *,
      client_addresses(*),
      client_contacts(*),
      jobs(id, job_number, title, status, total_price, start_date),
      invoices(id, invoice_number, status, total, balance, due_date)
    `
    )
    .eq("id", id);

  if (businessId) {
    query = query.eq("business_id", businessId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;

  if (!data) return null;

  const { data: timelineNotes, error: notesError } = await supabase
    .from("notes")
    .select("id, body, is_pinned, created_at")
    .eq("business_id", data.business_id)
    .eq("entity_type", "client")
    .eq("entity_id", id)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (notesError) throw notesError;

  return {
    ...(data as Omit<ClientDetail, "timeline_notes">),
    timeline_notes: timelineNotes ?? [],
  };
}

export async function createClient(input: ClientFormInput) {
  const { supabase, profile } = await getMyProfile();
  const businessId = profile.business_id;

  const clientPayload: ClientInsert = {
    business_id: businessId,
    first_name: input.first_name.trim(),
    last_name: input.last_name.trim(),
    email: clean(input.email),
    phone: clean(input.phone),
    company_name: clean(input.company_name),
    status: input.status ?? "active",
    type: input.type ?? "residential",
    notes: clean(input.notes),
    tags: tagsFromInput(input.tags),
  };

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert(clientPayload)
    .select()
    .single();

  if (clientError) throw clientError;

  const addressPayload: AddressInsert = {
    business_id: businessId,
    client_id: client.id,
    label: "Primary",
    street1: input.street.trim(),
    street2: clean(input.street2),
    city: input.city.trim(),
    state: input.state.trim(),
    zip: input.zip?.trim() ?? "",
    country: "US",
    is_primary: true,
    is_billing: true,
  };

  const { error: addressError } = await supabase
    .from("client_addresses")
    .insert(addressPayload);

  if (addressError) throw addressError;

  return client;
}

export async function updateClient(id: string, input: ClientFormInput) {
  const { supabase, profile } = await getMyProfile();
  const businessId = profile.business_id;

  const clientPayload: ClientUpdate = {
    first_name: input.first_name.trim(),
    last_name: input.last_name.trim(),
    email: clean(input.email),
    phone: clean(input.phone),
    company_name: clean(input.company_name),
    status: input.status ?? "active",
    type: input.type ?? "residential",
    notes: clean(input.notes),
    tags: tagsFromInput(input.tags),
  };

  const { error: clientError } = await supabase
    .from("clients")
    .update(clientPayload)
    .eq("id", id)
    .eq("business_id", businessId);

  if (clientError) throw clientError;

  const { data: primaryAddress, error: addressLookupError } = await supabase
    .from("client_addresses")
    .select("id")
    .eq("client_id", id)
    .eq("business_id", businessId)
    .eq("is_primary", true)
    .maybeSingle();

  if (addressLookupError) throw addressLookupError;

  const addressPayload: AddressUpdate = {
    street1: input.street.trim(),
    street2: clean(input.street2),
    city: input.city.trim(),
    state: input.state.trim(),
    zip: input.zip?.trim() ?? "",
  };

  if (primaryAddress) {
    const { error } = await supabase
      .from("client_addresses")
      .update(addressPayload)
      .eq("id", primaryAddress.id)
      .eq("business_id", businessId);

    if (error) throw error;
  } else {
    await addClientAddress(id, {
      street1: input.street,
      street2: input.street2,
      city: input.city,
      state: input.state,
      zip: input.zip ?? "",
      is_primary: true,
      is_billing: true,
      label: "Primary",
    });
  }
}

export async function deleteClient(id: string) {
  const { supabase, profile } = await getMyProfile();
  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", id)
    .eq("business_id", profile.business_id);

  if (error) throw error;
}

export async function addClientAddress(clientId: string, input: ClientAddressInput) {
  const { supabase, profile } = await getMyProfile();
  const businessId = profile.business_id;

  if (input.is_primary) {
    const { error } = await supabase
      .from("client_addresses")
      .update({ is_primary: false })
      .eq("client_id", clientId)
      .eq("business_id", businessId);

    if (error) throw error;
  }

  const payload: AddressInsert = {
    business_id: businessId,
    client_id: clientId,
    label: clean(input.label),
    street1: input.street1.trim(),
    street2: clean(input.street2),
    city: input.city.trim(),
    state: input.state.trim(),
    zip: input.zip.trim(),
    country: "US",
    is_primary: input.is_primary ?? false,
    is_billing: input.is_billing ?? false,
  };

  const { error } = await supabase.from("client_addresses").insert(payload);
  if (error) throw error;
}

export async function deleteClientAddress(addressId: string) {
  const { supabase, profile } = await getMyProfile();
  const { error } = await supabase
    .from("client_addresses")
    .delete()
    .eq("id", addressId)
    .eq("business_id", profile.business_id)
    .eq("is_primary", false);

  if (error) throw error;
}
