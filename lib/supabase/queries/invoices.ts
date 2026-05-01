import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type ClientRow = Database["public"]["Tables"]["clients"]["Row"];
type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];
type InvoiceInsert = Database["public"]["Tables"]["invoices"]["Insert"];
type InvoiceUpdate = Database["public"]["Tables"]["invoices"]["Update"];
type InvoiceLineItemRow = Database["public"]["Tables"]["invoice_line_items"]["Row"];
type InvoiceLineItemInsert = Database["public"]["Tables"]["invoice_line_items"]["Insert"];
type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];
type PaymentInsert = Database["public"]["Tables"]["payments"]["Insert"];

export type InvoiceStatus = "draft" | "sent" | "upcoming" | "past_due" | "paid" | "void";
export type InvoiceFilter = "all" | "unpaid" | "past_due" | InvoiceStatus;
export type PaymentMethod = "cash" | "check" | "ach";

export type InvoiceListItem = InvoiceRow & {
  clients: Pick<ClientRow, "id" | "first_name" | "last_name" | "company_name"> | null;
};

export type InvoiceDetail = InvoiceRow & {
  clients: Pick<
    ClientRow,
    "id" | "first_name" | "last_name" | "company_name" | "phone" | "email"
  > | null;
  jobs: Pick<JobRow, "id" | "title" | "job_number"> | null;
  invoice_line_items: InvoiceLineItemRow[];
  payments: PaymentRow[];
};

export interface InvoiceFilters {
  status?: InvoiceFilter;
  search?: string;
}

export interface InvoiceLineItemInput {
  name: string;
  description?: string;
  quantity: number;
  unit_price: number;
}

export interface InvoiceFormInput {
  client_id: string;
  job_id?: string;
  issue_date: string;
  due_date: string;
  notes?: string;
  line_items: InvoiceLineItemInput[];
}

export interface PaymentInput {
  amount: number;
  method: PaymentMethod;
  paid_at: string;
  notes?: string;
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

function invoiceStatus(total: number, amountPaid: number, dueDate: string): InvoiceStatus {
  if (amountPaid >= total && total > 0) return "paid";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);
  return due < today ? "past_due" : "sent";
}

async function recalculateInvoiceTotals(
  supabase: Awaited<ReturnType<typeof createSupabaseClient>>,
  invoiceId: string,
  businessId: string
) {
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("due_date, amount_paid, discount_amount, tax_amount, status")
    .eq("id", invoiceId)
    .eq("business_id", businessId)
    .single();

  if (invoiceError) throw invoiceError;

  const { data: lineItems, error } = await supabase
    .from("invoice_line_items")
    .select("total")
    .eq("invoice_id", invoiceId)
    .eq("business_id", businessId);

  if (error) throw error;

  const subtotal = (lineItems ?? []).reduce((sum, item) => sum + toMoney(item.total), 0);
  const total = Math.max(
    subtotal - toMoney(invoice.discount_amount) + toMoney(invoice.tax_amount),
    0
  );
  const amountPaid = toMoney(invoice.amount_paid);
  const balance = Math.max(total - amountPaid, 0);
  const status =
    invoice.status === "draft" || invoice.status === "void"
      ? invoice.status
      : invoiceStatus(total, amountPaid, invoice.due_date);

  const { error: updateError } = await supabase
    .from("invoices")
    .update({
      subtotal,
      total,
      balance,
      status,
      paid_at: balance === 0 && total > 0 ? new Date().toISOString() : null,
    })
    .eq("id", invoiceId)
    .eq("business_id", businessId);

  if (updateError) throw updateError;
}

export async function getInvoices(
  businessId: string,
  filters: InvoiceFilters = {}
): Promise<InvoiceListItem[]> {
  const supabase = await createSupabaseClient();
  let query = supabase
    .from("invoices")
    .select("*, clients(id, first_name, last_name, company_name)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (filters.status && filters.status !== "all") {
    if (filters.status === "unpaid") {
      query = query.in("status", ["draft", "sent", "upcoming", "past_due"]);
    } else {
      query = query.eq("status", filters.status);
    }
  }

  if (filters.search) {
    const search = filters.search.replaceAll("%", "").trim();
    if (search) {
      query = query.or(`invoice_number.ilike.%${search}%`);
    }
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []) as InvoiceListItem[];
}

export async function getInvoice(id: string, businessId?: string): Promise<InvoiceDetail | null> {
  const supabase = await createSupabaseClient();
  let query = supabase
    .from("invoices")
    .select(
      `
      *,
      clients(id, first_name, last_name, company_name, phone, email),
      jobs(id, title, job_number),
      invoice_line_items(*),
      payments(*)
    `
    )
    .eq("id", id);

  if (businessId) {
    query = query.eq("business_id", businessId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;

  return data as InvoiceDetail | null;
}

export async function getInvoiceFormOptions(businessId: string) {
  const supabase = await createSupabaseClient();

  const [clientsResult, jobsResult] = await Promise.all([
    supabase
      .from("clients")
      .select("id, first_name, last_name, company_name")
      .eq("business_id", businessId)
      .order("last_name", { ascending: true }),
    supabase
      .from("jobs")
      .select("id, client_id, title, job_number, total_price")
      .eq("business_id", businessId)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false }),
  ]);

  if (clientsResult.error) throw clientsResult.error;
  if (jobsResult.error) throw jobsResult.error;

  return {
    clients: clientsResult.data ?? [],
    jobs: jobsResult.data ?? [],
  };
}

export async function createInvoice(input: InvoiceFormInput) {
  const { supabase, profile } = await getMyProfile();
  const businessId = profile.business_id;

  const lineItems = input.line_items.map((item, index) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unit_price || 0);
    return {
      business_id: businessId,
      name: item.name.trim(),
      description: clean(item.description),
      quantity,
      unit_price: unitPrice,
      total: quantity * unitPrice,
      sort_order: index,
    };
  });
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);

  const payload: InvoiceInsert = {
    business_id: businessId,
    client_id: input.client_id,
    job_id: clean(input.job_id),
    issue_date: input.issue_date,
    due_date: input.due_date,
    notes: clean(input.notes),
    subtotal,
    total: subtotal,
    balance: subtotal,
  };

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;

  if (lineItems.length > 0) {
    const rows: InvoiceLineItemInsert[] = lineItems.map((item) => ({
      ...item,
      invoice_id: invoice.id,
    }));
    const { error: lineItemsError } = await supabase.from("invoice_line_items").insert(rows);
    if (lineItemsError) throw lineItemsError;
  }

  await recalculateInvoiceTotals(supabase, invoice.id, businessId);
  return invoice;
}

export async function recordPayment(invoiceId: string, paymentData: PaymentInput) {
  const { supabase, profile } = await getMyProfile();
  const businessId = profile.business_id;

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("client_id, total, amount_paid, due_date")
    .eq("id", invoiceId)
    .eq("business_id", businessId)
    .single();

  if (invoiceError) throw invoiceError;

  const payment: PaymentInsert = {
    business_id: businessId,
    invoice_id: invoiceId,
    client_id: invoice.client_id,
    amount: Number(paymentData.amount || 0),
    method: paymentData.method,
    paid_at: new Date(`${paymentData.paid_at}T12:00:00`).toISOString(),
    notes: clean(paymentData.notes),
    status: "succeeded",
  };

  const { error: paymentError } = await supabase.from("payments").insert(payment);
  if (paymentError) throw paymentError;

  const amountPaid = toMoney(invoice.amount_paid) + payment.amount;
  const total = toMoney(invoice.total);
  const balance = Math.max(total - amountPaid, 0);
  const status = invoiceStatus(total, amountPaid, invoice.due_date);

  const update: InvoiceUpdate = {
    amount_paid: amountPaid,
    balance,
    status,
    payment_method: payment.method,
    paid_at: status === "paid" ? payment.paid_at : null,
  };

  const { error: updateError } = await supabase
    .from("invoices")
    .update(update)
    .eq("id", invoiceId)
    .eq("business_id", businessId);

  if (updateError) throw updateError;
}

export async function sendInvoice(id: string) {
  const { supabase, profile } = await getMyProfile();

  const update: InvoiceUpdate = {
    status: "sent",
    sent_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("invoices")
    .update(update)
    .eq("id", id)
    .eq("business_id", profile.business_id);

  if (error) throw error;
}
