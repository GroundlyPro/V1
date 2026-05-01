import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type ClientRow = Database["public"]["Tables"]["clients"]["Row"];
type AddressRow = Database["public"]["Tables"]["client_addresses"]["Row"];
type QuoteRow = Database["public"]["Tables"]["quotes"]["Row"];
type QuoteInsert = Database["public"]["Tables"]["quotes"]["Insert"];
type QuoteUpdate = Database["public"]["Tables"]["quotes"]["Update"];
type QuoteLineItemRow = Database["public"]["Tables"]["quote_line_items"]["Row"];
type QuoteLineItemInsert = Database["public"]["Tables"]["quote_line_items"]["Insert"];
type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
type JobInsert = Database["public"]["Tables"]["jobs"]["Insert"];
type JobLineItemInsert = Database["public"]["Tables"]["job_line_items"]["Insert"];

export type QuoteStatus =
  | "draft"
  | "sent"
  | "approved"
  | "changes_requested"
  | "expired"
  | "declined";

export type QuoteCreatedRange = "all" | "today" | "this_week" | "this_month" | "custom";

export type QuoteListItem = QuoteRow & {
  clients: Pick<ClientRow, "id" | "first_name" | "last_name" | "company_name"> | null;
  client_addresses: AddressRow | null;
};

export type QuoteDetail = QuoteRow & {
  clients: Pick<
    ClientRow,
    "id" | "first_name" | "last_name" | "company_name" | "phone" | "email"
  > | null;
  client_addresses: AddressRow | null;
  quote_line_items: QuoteLineItemRow[];
};

export interface QuoteFilters {
  status?: "all" | QuoteStatus;
  search?: string;
  assignedTo?: string;
  createdRange?: QuoteCreatedRange;
  createdFrom?: string;
  createdTo?: string;
}

export type QuoteReportStats = {
  overview: {
    draft: number;
    sent: number;
    changes_requested: number;
    approved: number;
  };
  conversionRate: {
    value: number;
    delta: number;
  };
  sent: {
    count: number;
    value: number;
    delta: number;
  };
  converted: {
    count: number;
    value: number;
    delta: number;
  };
};

export interface QuoteFormInput {
  client_id: string;
  address_id?: string;
  title: string;
  status?: QuoteStatus;
  frequency?: "none" | "one_time" | "weekly" | "biweekly" | "monthly";
  valid_until?: string;
  message_to_client?: string;
  internal_notes?: string;
  line_item_name?: string;
  line_item_description?: string;
  quantity?: number;
  unit_cost?: number;
  unit_price?: number;
}

export interface QuoteLineItemInput {
  name: string;
  description?: string;
  quantity: number;
  unit_cost: number;
  unit_price: number;
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

function toMoney(value: number | null | undefined) {
  return Number(value ?? 0);
}

function percent(numerator: number, denominator: number) {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function toLocalDateString(date: Date) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function startOfWeek(date: Date) {
  const nextDate = new Date(date);
  const dayOfWeek = nextDate.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  nextDate.setDate(nextDate.getDate() + diffToMonday);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

async function recalculateQuoteTotals(
  supabase: Awaited<ReturnType<typeof createSupabaseClient>>,
  quoteId: string,
  businessId: string
) {
  const { data: lineItems, error } = await supabase
    .from("quote_line_items")
    .select("total")
    .eq("quote_id", quoteId)
    .eq("business_id", businessId);

  if (error) throw error;

  const subtotal = (lineItems ?? []).reduce((sum, item) => sum + toMoney(item.total), 0);

  const { error: updateError } = await supabase
    .from("quotes")
    .update({ subtotal, total: subtotal })
    .eq("id", quoteId)
    .eq("business_id", businessId);

  if (updateError) throw updateError;
}

export async function getQuotes(
  businessId: string,
  filters: QuoteFilters = {}
): Promise<QuoteListItem[]> {
  const supabase = await createSupabaseClient();
  let query = supabase
    .from("quotes")
    .select("*, clients(id, first_name, last_name, company_name), client_addresses(*)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.search) {
    const search = filters.search.replaceAll("%", "").trim();
    if (search) {
      query = query.or(`title.ilike.%${search}%,quote_number.ilike.%${search}%`);
    }
  }

  const { data, error } = await query;
  if (error) throw error;

  let quotes = (data ?? []) as QuoteListItem[];

  if (filters.assignedTo && filters.assignedTo !== "all") {
    quotes = quotes.filter((quote) => {
      const assignedUserId = decodeTeamFromNotes(quote.internal_notes).assignedUserId;
      if (filters.assignedTo === "unassigned") return !assignedUserId;
      return assignedUserId === filters.assignedTo;
    });
  }

  if (filters.createdRange && filters.createdRange !== "all") {
    quotes = quotes.filter((quote) => {
      const createdDate = typeof quote.created_at === "string" ? quote.created_at.slice(0, 10) : "";
      const now = new Date();
      const today = toLocalDateString(now);
      const createdAtDate = createdDate ? new Date(`${createdDate}T00:00:00`) : null;

      if (filters.createdRange === "today") return createdDate === today;

      if (filters.createdRange === "this_week") {
        if (!createdAtDate) return false;
        const weekStart = startOfWeek(now);
        const endOfWeek = new Date(weekStart);
        endOfWeek.setDate(weekStart.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        return createdAtDate >= weekStart && createdAtDate <= endOfWeek;
      }

      if (filters.createdRange === "this_month") {
        if (!createdAtDate) return false;
        return (
          createdAtDate.getFullYear() === now.getFullYear() &&
          createdAtDate.getMonth() === now.getMonth()
        );
      }

      if (filters.createdRange === "custom") {
        if (!createdAtDate) return false;
        if (filters.createdFrom) {
          const fromDate = new Date(`${filters.createdFrom}T00:00:00`);
          if (createdAtDate < fromDate) return false;
        }
        if (filters.createdTo) {
          const toDate = new Date(`${filters.createdTo}T23:59:59.999`);
          if (createdAtDate > toDate) return false;
        }
      }

      return true;
    });
  }

  return quotes;
}

export async function getQuoteReportStats(businessId: string): Promise<QuoteReportStats> {
  const supabase = await createSupabaseClient();
  const now = new Date();
  const currentStart = new Date(now);
  currentStart.setDate(currentStart.getDate() - 30);
  const previousStart = new Date(currentStart);
  previousStart.setDate(previousStart.getDate() - 30);

  const [quotesResult, jobsResult] = await Promise.all([
    supabase
      .from("quotes")
      .select("id, status, total, sent_at, approved_at, created_at")
      .eq("business_id", businessId),
    supabase
      .from("jobs")
      .select("id, quote_id, total_price, created_at")
      .eq("business_id", businessId)
      .not("quote_id", "is", null)
      .gte("created_at", previousStart.toISOString()),
  ]);

  if (quotesResult.error) throw quotesResult.error;
  if (jobsResult.error) throw jobsResult.error;

  const quotes = quotesResult.data ?? [];
  const jobs = (jobsResult.data ?? []) as Pick<JobRow, "id" | "quote_id" | "total_price" | "created_at">[];
  const currentStartTime = currentStart.getTime();
  const previousStartTime = previousStart.getTime();

  const inCurrent = (value: string | null | undefined) => {
    if (!value) return false;
    const time = new Date(value).getTime();
    return time >= currentStartTime && time <= now.getTime();
  };

  const inPrevious = (value: string | null | undefined) => {
    if (!value) return false;
    const time = new Date(value).getTime();
    return time >= previousStartTime && time < currentStartTime;
  };

  const sentCurrent = quotes.filter((quote) => inCurrent(quote.sent_at));
  const sentPrevious = quotes.filter((quote) => inPrevious(quote.sent_at));
  const convertedCurrent = jobs.filter((job) => inCurrent(job.created_at));
  const convertedPrevious = jobs.filter((job) => inPrevious(job.created_at));
  const currentConversionRate = percent(convertedCurrent.length, sentCurrent.length);
  const previousConversionRate = percent(convertedPrevious.length, sentPrevious.length);

  return {
    overview: {
      draft: quotes.filter((quote) => quote.status === "draft").length,
      sent: quotes.filter((quote) => quote.status === "sent").length,
      changes_requested: quotes.filter((quote) => quote.status === "changes_requested").length,
      approved: quotes.filter((quote) => quote.status === "approved").length,
    },
    conversionRate: {
      value: currentConversionRate,
      delta: currentConversionRate - previousConversionRate,
    },
    sent: {
      count: sentCurrent.length,
      value: sentCurrent.reduce((sum, quote) => sum + toMoney(quote.total), 0),
      delta: sentCurrent.length - sentPrevious.length,
    },
    converted: {
      count: convertedCurrent.length,
      value: convertedCurrent.reduce((sum, job) => sum + toMoney(job.total_price), 0),
      delta: convertedCurrent.length - convertedPrevious.length,
    },
  };
}

export async function getQuote(id: string, businessId?: string): Promise<QuoteDetail | null> {
  const supabase = await createSupabaseClient();
  let query = supabase
    .from("quotes")
    .select(
      `
      *,
      clients(id, first_name, last_name, company_name, phone, email),
      client_addresses(*),
      quote_line_items(*)
    `
    )
    .eq("id", id);

  if (businessId) {
    query = query.eq("business_id", businessId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;

  return data as QuoteDetail | null;
}

export async function getQuoteFormOptions(businessId: string) {
  const supabase = await createSupabaseClient();

  const [clientsResult, membersResult] = await Promise.all([
    supabase
      .from("clients")
      .select("id, first_name, last_name, company_name, client_addresses(*)")
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

  return { clients: clientsResult.data ?? [], teamMembers: membersResult.data ?? [] };
}

const TEAM_MARKER = "__team__:";

export function encodeTeamInNotes(
  notes: string | undefined,
  userId: string | undefined,
  wage: number | undefined,
  wageType: string | undefined
): string | undefined {
  const cleanNotes = notes?.trim();
  if (!userId) return cleanNotes || undefined;
  const prefix = `${TEAM_MARKER}${JSON.stringify({ id: userId, wage: wage ?? 0, wageType: wageType ?? "percent" })}`;
  return cleanNotes ? `${prefix}\n${cleanNotes}` : prefix;
}

export function decodeTeamFromNotes(notes: string | null | undefined): {
  assignedUserId?: string;
  assignedWage?: number;
  assignedWageType?: "percent" | "flat";
  actualNotes?: string;
} {
  if (!notes?.startsWith(TEAM_MARKER)) return { actualNotes: notes ?? undefined };
  const newlineIdx = notes.indexOf("\n");
  const jsonPart = newlineIdx === -1 ? notes.slice(TEAM_MARKER.length) : notes.slice(TEAM_MARKER.length, newlineIdx);
  const rest = newlineIdx === -1 ? undefined : notes.slice(newlineIdx + 1) || undefined;
  try {
    const parsed = JSON.parse(jsonPart) as { id: string; wage: number; wageType: string };
    return {
      assignedUserId: parsed.id || undefined,
      assignedWage: parsed.wage,
      assignedWageType: (parsed.wageType as "percent" | "flat") ?? "percent",
      actualNotes: rest,
    };
  } catch {
    return { actualNotes: notes };
  }
}

export async function createQuote(input: QuoteFormInput) {
  const { supabase, profile } = await getMyProfile();

  const payload: QuoteInsert = {
    business_id: profile.business_id,
    client_id: input.client_id,
    address_id: clean(input.address_id),
    title: input.title.trim(),
    status: input.status ?? "draft",
    frequency: input.frequency && input.frequency !== "none" ? input.frequency : null,
    valid_until: clean(input.valid_until),
    message_to_client: clean(input.message_to_client),
    internal_notes: clean(input.internal_notes),
    created_by: profile.id,
  };

  const { data, error } = await supabase.from("quotes").insert(payload).select().single();
  if (error) throw error;

  const quantity = Number(input.quantity || 0);
  const unitPrice = Number(input.unit_price || 0);
  const shouldCreateInitialLineItem =
    quantity > 0 && (unitPrice > 0 || Number(input.unit_cost || 0) > 0 || Boolean(input.line_item_name?.trim()));

  if (shouldCreateInitialLineItem) {
    const lineItemPayload: QuoteLineItemInsert = {
      quote_id: data.id,
      business_id: profile.business_id,
      name: input.line_item_name?.trim() || input.title.trim(),
      description: clean(input.line_item_description),
      quantity,
      unit_cost: Number(input.unit_cost || 0),
      unit_price: unitPrice,
      total: quantity * unitPrice,
    };

    const { error: lineItemError } = await supabase.from("quote_line_items").insert(lineItemPayload);
    if (lineItemError) throw lineItemError;

    await recalculateQuoteTotals(supabase, data.id, profile.business_id);
  }

  return data;
}

export async function updateQuote(id: string, input: QuoteFormInput) {
  const { supabase, profile } = await getMyProfile();

  const payload: QuoteUpdate = {
    client_id: input.client_id,
    address_id: clean(input.address_id),
    title: input.title.trim(),
    frequency: input.frequency && input.frequency !== "none" ? input.frequency : null,
    valid_until: clean(input.valid_until),
    message_to_client: clean(input.message_to_client),
    internal_notes: clean(input.internal_notes),
  };

  const { error } = await supabase
    .from("quotes")
    .update(payload)
    .eq("id", id)
    .eq("business_id", profile.business_id);

  if (error) throw error;
}

export async function updateQuoteStatus(id: string, status: QuoteStatus) {
  const { supabase, profile } = await getMyProfile();

  const extra: Partial<QuoteUpdate> = {};
  if (status === "sent") extra.sent_at = new Date().toISOString();
  if (status === "approved") extra.approved_at = new Date().toISOString();

  const { error } = await supabase
    .from("quotes")
    .update({ status, ...extra })
    .eq("id", id)
    .eq("business_id", profile.business_id);

  if (error) throw error;
}

export async function addQuoteLineItem(quoteId: string, input: QuoteLineItemInput) {
  const { supabase, profile } = await getMyProfile();
  const quantity = Number(input.quantity || 0);
  const unitPrice = Number(input.unit_price || 0);

  const payload: QuoteLineItemInsert = {
    quote_id: quoteId,
    business_id: profile.business_id,
    name: input.name.trim(),
    description: clean(input.description),
    quantity,
    unit_cost: Number(input.unit_cost || 0),
    unit_price: unitPrice,
    total: quantity * unitPrice,
  };

  const { error } = await supabase.from("quote_line_items").insert(payload);
  if (error) throw error;

  await recalculateQuoteTotals(supabase, quoteId, profile.business_id);
}

export async function removeQuoteLineItem(lineItemId: string) {
  const { supabase, profile } = await getMyProfile();

  const { data: lineItem, error: lookupError } = await supabase
    .from("quote_line_items")
    .select("quote_id")
    .eq("id", lineItemId)
    .eq("business_id", profile.business_id)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (!lineItem) return;

  const { error } = await supabase
    .from("quote_line_items")
    .delete()
    .eq("id", lineItemId)
    .eq("business_id", profile.business_id);

  if (error) throw error;

  await recalculateQuoteTotals(supabase, lineItem.quote_id, profile.business_id);
}

export async function convertQuoteToJob(quoteId: string) {
  const { supabase, profile } = await getMyProfile();
  const businessId = profile.business_id;

  const { data: existingJob, error: existingJobError } = await supabase
    .from("jobs")
    .select("*")
    .eq("quote_id", quoteId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (existingJobError) throw existingJobError;
  if (existingJob) return existingJob;

  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select("*, quote_line_items(*)")
    .eq("id", quoteId)
    .eq("business_id", businessId)
    .single();

  if (quoteError) throw quoteError;

  const frequency = quote.frequency as "one_time" | "weekly" | "biweekly" | "monthly" | null;
  const isRecurring = !!frequency && frequency !== "one_time";

  const jobPayload: JobInsert = {
    business_id: businessId,
    client_id: quote.client_id,
    address_id: quote.address_id,
    title: quote.title,
    type: isRecurring ? "recurring" : "one_off",
    status: "active",
    frequency: isRecurring ? frequency : null,
    billing_type: "on_completion",
    internal_notes: quote.internal_notes,
    quote_id: quoteId,
    created_by: profile.id,
  };

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .insert(jobPayload)
    .select()
    .single();

  if (jobError) throw jobError;

  const lineItems = (quote.quote_line_items ?? []) as QuoteLineItemRow[];
  if (lineItems.length > 0) {
    const jobLineItems: JobLineItemInsert[] = lineItems.map((item, index) => ({
      job_id: job.id,
      business_id: businessId,
      name: item.name,
      description: item.description,
      quantity: toMoney(item.quantity),
      unit_cost: toMoney(item.unit_cost),
      unit_price: toMoney(item.unit_price),
      total: toMoney(item.total),
      sort_order: index,
    }));

    const { error: lineItemsError } = await supabase.from("job_line_items").insert(jobLineItems);
    if (lineItemsError) throw lineItemsError;

    const totalPrice = jobLineItems.reduce((sum, i) => sum + toMoney(i.total), 0);
    const totalCost = jobLineItems.reduce(
      (sum, i) => sum + toMoney(i.quantity) * toMoney(i.unit_cost),
      0
    );
    const profit = totalPrice - totalCost;
    const profitMargin = totalPrice > 0 ? (profit / totalPrice) * 100 : 0;

    await supabase
      .from("jobs")
      .update({ total_price: totalPrice, total_cost: totalCost, profit, profit_margin: profitMargin })
      .eq("id", job.id)
      .eq("business_id", businessId);
  }

  await supabase
    .from("quotes")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("id", quoteId)
    .eq("business_id", businessId);

  return job;
}
