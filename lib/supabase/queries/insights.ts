import { endOfMonth, format, startOfMonth, startOfYear, subMonths } from "date-fns";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";

export interface RevenuePeriodSummary {
  thisMonth: number;
  lastMonth: number;
  ytd: number;
  averageInvoiceValue: number;
}

export interface RevenueByMonth {
  month: string;
  revenue: number;
}

export interface JobStatusSummary {
  status: string;
  count: number;
}

export interface JobSummary {
  activeJobs: number;
  completedThisMonth: number;
  jobsByStatus: JobStatusSummary[];
}

export interface TopClientRevenue {
  clientId: string;
  name: string;
  revenue: number;
}

export interface ProfitabilitySummary {
  laborCost: number;
  expenseCost: number;
  jobRevenue: number;
  grossProfit: number;
}

function toMoney(value: number | null | undefined) {
  return Number(value ?? 0);
}

function isoDate(value: Date) {
  return format(value, "yyyy-MM-dd");
}

function clientName(client: {
  first_name: string;
  last_name: string;
  company_name: string | null;
}) {
  const name = `${client.first_name} ${client.last_name}`;
  return client.company_name ? `${client.company_name} (${name})` : name;
}

export async function getRevenueByMonth(
  businessId: string,
  year = new Date().getFullYear()
): Promise<RevenueByMonth[]> {
  const supabase = await createSupabaseClient();
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);

  const { data, error } = await supabase
    .from("payments")
    .select("amount, paid_at")
    .eq("business_id", businessId)
    .eq("status", "succeeded")
    .gte("paid_at", start.toISOString())
    .lte("paid_at", end.toISOString());

  if (error) throw error;

  const months = Array.from({ length: 12 }, (_, index) => ({
    month: format(new Date(year, index, 1), "MMM"),
    revenue: 0,
  }));

  for (const payment of data ?? []) {
    if (!payment.paid_at) continue;
    const monthIndex = new Date(payment.paid_at).getMonth();
    months[monthIndex].revenue += toMoney(payment.amount);
  }

  return months;
}

export async function getOutstandingBalance(businessId: string) {
  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("balance")
    .eq("business_id", businessId)
    .in("status", ["draft", "sent", "upcoming", "past_due"]);

  if (error) throw error;
  return (data ?? []).reduce((sum, invoice) => sum + toMoney(invoice.balance), 0);
}

export async function getRevenueSummary(businessId: string): Promise<RevenuePeriodSummary> {
  const supabase = await createSupabaseClient();
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(lastMonthStart);
  const yearStart = startOfYear(now);

  const { data: payments, error: paymentsError } = await supabase
    .from("payments")
    .select("amount, paid_at")
    .eq("business_id", businessId)
    .eq("status", "succeeded")
    .gte("paid_at", yearStart.toISOString());

  if (paymentsError) throw paymentsError;

  const { data: paidInvoices, error: invoicesError } = await supabase
    .from("invoices")
    .select("total")
    .eq("business_id", businessId)
    .eq("status", "paid")
    .gte("paid_at", yearStart.toISOString());

  if (invoicesError) throw invoicesError;

  let thisMonth = 0;
  let lastMonth = 0;
  let ytd = 0;

  for (const payment of payments ?? []) {
    if (!payment.paid_at) continue;
    const paidAt = new Date(payment.paid_at);
    const amount = toMoney(payment.amount);
    ytd += amount;
    if (paidAt >= thisMonthStart) thisMonth += amount;
    if (paidAt >= lastMonthStart && paidAt <= lastMonthEnd) lastMonth += amount;
  }

  const invoiceTotals = paidInvoices ?? [];
  const averageInvoiceValue =
    invoiceTotals.length > 0
      ? invoiceTotals.reduce((sum, invoice) => sum + toMoney(invoice.total), 0) /
        invoiceTotals.length
      : 0;

  return { thisMonth, lastMonth, ytd, averageInvoiceValue };
}

export async function getJobSummary(
  businessId: string,
  dateRange = {
    start: isoDate(startOfMonth(new Date())),
    end: isoDate(endOfMonth(new Date())),
  }
): Promise<JobSummary> {
  const supabase = await createSupabaseClient();

  const { data, error } = await supabase
    .from("jobs")
    .select("status, updated_at")
    .eq("business_id", businessId);

  if (error) throw error;

  const jobs = data ?? [];
  const byStatus = new Map<string, number>();
  let activeJobs = 0;
  let completedThisMonth = 0;

  for (const job of jobs) {
    byStatus.set(job.status, (byStatus.get(job.status) ?? 0) + 1);
    if (["active", "in_progress"].includes(job.status)) activeJobs += 1;
    if (
      job.status === "completed" &&
      job.updated_at &&
      job.updated_at >= dateRange.start &&
      job.updated_at <= `${dateRange.end}T23:59:59`
    ) {
      completedThisMonth += 1;
    }
  }

  return {
    activeJobs,
    completedThisMonth,
    jobsByStatus: Array.from(byStatus.entries()).map(([status, count]) => ({ status, count })),
  };
}

export async function getTopClients(
  businessId: string,
  limit = 5
): Promise<TopClientRevenue[]> {
  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("payments")
    .select("amount, client_id, clients(first_name, last_name, company_name)")
    .eq("business_id", businessId)
    .eq("status", "succeeded");

  if (error) throw error;

  const totals = new Map<string, TopClientRevenue>();
  for (const payment of data ?? []) {
    const client = Array.isArray(payment.clients) ? payment.clients[0] : payment.clients;
    if (!client) continue;

    const existing = totals.get(payment.client_id) ?? {
      clientId: payment.client_id,
      name: clientName(client),
      revenue: 0,
    };
    existing.revenue += toMoney(payment.amount);
    totals.set(payment.client_id, existing);
  }

  return Array.from(totals.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export async function getProfitabilitySummary(businessId: string): Promise<ProfitabilitySummary> {
  const supabase = await createSupabaseClient();
  const [jobsResult, laborResult, expensesResult] = await Promise.all([
    supabase
      .from("jobs")
      .select("total_price")
      .eq("business_id", businessId)
      .neq("status", "cancelled"),
    supabase.from("labor_entries").select("total_cost").eq("business_id", businessId),
    supabase.from("expenses").select("amount").eq("business_id", businessId),
  ]);

  if (jobsResult.error) throw jobsResult.error;
  if (laborResult.error) throw laborResult.error;
  if (expensesResult.error) throw expensesResult.error;

  const jobRevenue = (jobsResult.data ?? []).reduce((sum, job) => sum + toMoney(job.total_price), 0);
  const laborCost = (laborResult.data ?? []).reduce(
    (sum, entry) => sum + toMoney(entry.total_cost),
    0
  );
  const expenseCost = (expensesResult.data ?? []).reduce(
    (sum, expense) => sum + toMoney(expense.amount),
    0
  );

  return {
    jobRevenue,
    laborCost,
    expenseCost,
    grossProfit: jobRevenue - laborCost - expenseCost,
  };
}

export async function getInsightsOverview(businessId: string) {
  const year = new Date().getFullYear();
  const [revenue, outstandingBalance, jobSummary, topClients, revenueByMonth, profitability] =
    await Promise.all([
      getRevenueSummary(businessId),
      getOutstandingBalance(businessId),
      getJobSummary(businessId),
      getTopClients(businessId, 5),
      getRevenueByMonth(businessId, year),
      getProfitabilitySummary(businessId),
    ]);

  return {
    revenue,
    outstandingBalance,
    jobSummary,
    topClients,
    revenueByMonth,
    profitability,
  };
}
