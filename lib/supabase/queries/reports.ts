import {
  addDays,
  differenceInCalendarDays,
  eachMonthOfInterval,
  endOfDay,
  endOfMonth,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfYear,
  subMonths,
  subYears,
} from "date-fns";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";

type DateRange = {
  start: Date | null;
  end: Date;
};

type NormalizedDateRange = {
  start: Date;
  end: Date;
};

export type ReportPeriod = "all" | "this_month" | "last_month" | "this_year" | "last_year" | "custom";

export type SectionKey = "overview" | "revenue" | "cashflow" | "leads" | "jobs";

export type SectionInput = {
  period?: ReportPeriod;
  customDate?: string | null;
};

export type ReportMetric = {
  label: string;
  value: string;
  deltaLabel: string;
  href: string;
};

export type RevenueMonth = {
  label: string;
  value: number;
};

export type NamedValue = {
  name: string;
  value: number;
};

export type QuoteValuePoint = {
  label: string;
  sent: number;
  converted: number;
};

export type JobScheduleValue = {
  label: string;
  value: number;
};

export type ReportsOverview = {
  metrics: ReportMetric[];
  revenueByMonth: RevenueMonth[];
  revenueByLeadSource: NamedValue[];
  revenueHeatmap: NamedValue[];
  cashflow: {
    receivables: number;
    clientsOwing: number;
    upcomingPayouts: number;
    projectedIncome: number;
    dueToday: number;
    dueUnderSevenDays: number;
    averagePaymentDays: number | null;
  };
  paymentMethods: NamedValue[];
  leadConversion: {
    leadConversionDays: number | null;
    quoteApprovalDays: number | null;
    quoteConversionRate: number;
    funnel: NamedValue[];
    quoteValue: QuoteValuePoint[];
  };
  jobs: {
    scheduledValue: JobScheduleValue[];
    recurringValue: number;
    oneOffValue: number;
    averageOneOffJobValue: number;
    averageRecurringJobValue: number;
    monthlyRecurringJobValue: number;
  };
};

const OPEN_INVOICE_STATUSES = ["draft", "sent", "upcoming", "past_due"];
const RECURRING_FREQUENCIES = ["weekly", "biweekly", "monthly", "quarterly", "yearly"];

function moneyValue(value: number | null | undefined) {
  return Number(value ?? 0);
}

function inRange(value: string | null | undefined, range: DateRange) {
  if (!value) return false;
  if (!range.start) return true;
  const date = new Date(value);
  return date >= range.start && date <= range.end;
}

function percent(numerator: number, denominator: number) {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

function averageMoney(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function isRecurringJob(job: { type: string; frequency: string | null }) {
  const type = job.type.toLowerCase();
  const frequency = job.frequency?.toLowerCase() ?? "";
  return type === "recurring" || RECURRING_FREQUENCIES.includes(frequency);
}

function addToMap(map: Map<string, number>, key: string, value: number) {
  map.set(key, (map.get(key) ?? 0) + value);
}

function toNamedValues(map: Map<string, number>, fallback: string, limit = 5) {
  const values = Array.from(map.entries())
    .map(([name, value]) => ({ name: name || fallback, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
  return values.length > 0 ? values : [{ name: fallback, value: 0 }];
}

function validCustomDate(value: string | null | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function normalizeRange(range: DateRange, fallbackDays = 28): NormalizedDateRange {
  const start = range.start ? startOfDay(range.start) : startOfDay(addDays(range.end, -(fallbackDays - 1)));
  return { start, end: endOfDay(range.end) };
}

function buildEqualBuckets(range: DateRange, count: number, fallbackDays = 28) {
  const normalized = normalizeRange(range, fallbackDays);
  const totalDays = Math.max(differenceInCalendarDays(normalized.end, normalized.start) + 1, 1);

  return Array.from({ length: count }, (_, index) => {
    const startOffset = Math.floor((index * totalDays) / count);
    const nextOffset = Math.floor(((index + 1) * totalDays) / count);
    const bucketStart = startOfDay(addDays(normalized.start, startOffset));
    const bucketEnd = endOfDay(addDays(normalized.start, Math.max(nextOffset - 1, startOffset)));
    const sameDay = differenceInCalendarDays(bucketEnd, bucketStart) === 0;

    return {
      label: sameDay
        ? format(bucketStart, "MMM d")
        : `${format(bucketStart, "MMM d")} - ${format(bucketEnd, "MMM d")}`,
      start: bucketStart,
      end: bucketEnd,
    };
  });
}

function inBucket(value: string | null | undefined, bucket: { start: Date; end: Date }) {
  if (!value) return false;
  const date = new Date(value);
  return date >= bucket.start && date <= bucket.end;
}

function getRevenueSeriesRange(range: DateRange) {
  return range.start ? range : { start: startOfMonth(addDays(range.end, -335)), end: range.end };
}

function computeReportRange(now: Date, input: SectionInput): DateRange {
  const period = input.period ?? "all";

  if (period === "all") return { start: null, end: now };

  if (period === "last_month") {
    const prev = subMonths(now, 1);
    return { start: startOfMonth(prev), end: endOfMonth(prev) };
  }

  if (period === "this_year") return { start: startOfYear(now), end: now };

  if (period === "last_year") {
    const prev = subYears(now, 1);
    return { start: startOfYear(prev), end: endOfYear(prev) };
  }

  if (period === "custom") {
    const date = validCustomDate(input.customDate);
    const selected = date ? new Date(`${date}T00:00:00`) : now;
    return { start: startOfDay(selected), end: endOfDay(selected) };
  }

  return { start: startOfMonth(now), end: endOfMonth(now) };
}

function computePreviousRange(range: DateRange): DateRange | null {
  if (!range.start) return null;
  const duration = range.end.getTime() - range.start.getTime();
  const prevEnd = new Date(range.start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - duration);
  return { start: prevStart, end: prevEnd };
}

function applySince<T extends { gte: (column: string, value: string) => T }>(
  query: T,
  column: string,
  date: Date | null | undefined
) {
  return date ? query.gte(column, date.toISOString()) : query;
}

export async function getReportsOverview(
  businessId: string,
  sections: Partial<Record<SectionKey, SectionInput>> = {}
): Promise<ReportsOverview> {
  const supabase = await createSupabaseClient();
  const now = new Date();

  const overviewRange = computeReportRange(now, sections.overview ?? {});
  const revenueRange = computeReportRange(now, sections.revenue ?? {});
  const cashflowRange = computeReportRange(now, sections.cashflow ?? {});
  const leadsRange = computeReportRange(now, sections.leads ?? {});
  const jobsRange = computeReportRange(now, sections.jobs ?? {});
  const overviewPrevious = computePreviousRange(overviewRange);

  // Minimum start date across all sections for DB-level fetch cutoff
  const sectionStarts = [
    overviewPrevious?.start,
    overviewRange.start,
    revenueRange.start,
    cashflowRange.start,
    leadsRange.start,
    jobsRange.start,
  ].filter((d): d is Date => d != null);
  const dbFetchSince = sectionStarts.length > 0
    ? new Date(Math.min(...sectionStarts.map((d) => d.getTime())))
    : null;

  const [
    clientsResult,
    requestsResult,
    quotesResult,
    jobsResult,
    invoicesResult,
    paymentsResult,
    visitsResult,
    addressesResult,
  ] = await Promise.all([
    applySince(
      supabase.from("clients").select("id, created_at").eq("business_id", businessId),
      "created_at",
      dbFetchSince
    ),
    applySince(
      supabase
        .from("requests")
        .select("id, source, created_at, converted_to_quote_id, converted_to_job_id")
        .eq("business_id", businessId),
      "created_at",
      dbFetchSince
    ),
    applySince(
      supabase
        .from("quotes")
        .select("id, total, status, sent_at, approved_at, created_at")
        .eq("business_id", businessId),
      "created_at",
      dbFetchSince
    ),
    applySince(
      supabase
        .from("jobs")
        .select("id, address_id, quote_id, total_price, total_cost, type, frequency, created_at, start_date, status")
        .eq("business_id", businessId),
      "created_at",
      dbFetchSince
    ),
    // No date filter on invoices — cashflow receivables needs all open invoices regardless of issue date
    supabase
      .from("invoices")
      .select("id, client_id, job_id, total, balance, amount_paid, issue_date, due_date, paid_at, payment_method, status")
      .eq("business_id", businessId),
    applySince(
      supabase
        .from("payments")
        .select("amount, method, paid_at, status, invoice_id")
        .eq("business_id", businessId)
        .eq("status", "succeeded"),
      "paid_at",
      dbFetchSince
    ),
    // Visits: always fetch next 28 days for scheduled value (independent of jobs period)
    supabase
      .from("job_visits")
      .select("job_id, scheduled_date")
      .eq("business_id", businessId)
      .gte("scheduled_date", format(now, "yyyy-MM-dd"))
      .lte("scheduled_date", format(addDays(now, 28), "yyyy-MM-dd")),
    supabase.from("client_addresses").select("id, city").eq("business_id", businessId),
  ]);

  if (clientsResult.error) throw clientsResult.error;
  if (requestsResult.error) throw requestsResult.error;
  if (quotesResult.error) throw quotesResult.error;
  if (jobsResult.error) throw jobsResult.error;
  if (invoicesResult.error) throw invoicesResult.error;
  if (paymentsResult.error) throw paymentsResult.error;
  if (visitsResult.error) throw visitsResult.error;
  if (addressesResult.error) throw addressesResult.error;

  const clients = clientsResult.data ?? [];
  const requests = requestsResult.data ?? [];
  const quotes = quotesResult.data ?? [];
  const jobs = jobsResult.data ?? [];
  const invoices = invoicesResult.data ?? [];
  const payments = paymentsResult.data ?? [];
  const visits = visitsResult.data ?? [];
  const addresses = addressesResult.data ?? [];

  // ── Overview ──────────────────────────────────────────────────────────
  const newLeads = clients.filter((c) => inRange(c.created_at, overviewRange)).length;
  const previousLeads = overviewPrevious
    ? clients.filter((c) => inRange(c.created_at, overviewPrevious)).length
    : 0;
  const newRequests = requests.filter((r) => inRange(r.created_at, overviewRange)).length;
  const previousRequests = overviewPrevious
    ? requests.filter((r) => inRange(r.created_at, overviewPrevious)).length
    : 0;
  const convertedQuotes = quotes.filter((q) => inRange(q.approved_at, overviewRange)).length;
  const newJobs = jobs.filter((j) => inRange(j.created_at, overviewRange));
  const newOneOffJobs = newJobs.filter((j) => !isRecurringJob(j)).length;
  const newRecurringJobs = newJobs.filter((j) => isRecurringJob(j)).length;
  const invoicedValue = invoices
    .filter((i) => inRange(i.issue_date, overviewRange))
    .reduce((sum, i) => sum + moneyValue(i.total), 0);
  const sentQuotesInOverview = quotes.filter((q) => inRange(q.sent_at, overviewRange));
  const overviewQuoteConversionRate = percent(convertedQuotes, Math.max(sentQuotesInOverview.length, 1));

  // ── Revenue ───────────────────────────────────────────────────────────
  const revenueSeriesRange = getRevenueSeriesRange(revenueRange);
  const revenueByMonth = eachMonthOfInterval({
    start: startOfMonth(revenueSeriesRange.start!),
    end: startOfMonth(revenueSeriesRange.end),
  }).map((monthDate) => ({
    label: format(monthDate, "MMM"),
    value: 0,
    monthKey: format(monthDate, "yyyy-MM"),
  }));
  const revenueSeriesIndex = new Map(revenueByMonth.map((point, index) => [point.monthKey, index]));

  for (const payment of payments.filter((entry) => inRange(entry.paid_at, revenueRange))) {
    if (!payment.paid_at) continue;
    const monthKey = format(new Date(payment.paid_at), "yyyy-MM");
    const index = revenueSeriesIndex.get(monthKey);
    if (index !== undefined) revenueByMonth[index].value += moneyValue(payment.amount);
  }

  const requestSourceByQuoteId = new Map<string, string>();
  const requestSourceByJobId = new Map<string, string>();
  for (const request of requests) {
    const source = request.source || "Unknown";
    if (request.converted_to_quote_id) requestSourceByQuoteId.set(request.converted_to_quote_id, source);
    if (request.converted_to_job_id) requestSourceByJobId.set(request.converted_to_job_id, source);
  }

  const jobsById = new Map(jobs.map((job) => [job.id, job]));
  const invoicesById = new Map(invoices.map((invoice) => [invoice.id, invoice]));
  const addressCities = new Map(addresses.map((address) => [address.id, address.city]));
  const sourceRevenue = new Map<string, number>();
  const cityRevenue = new Map<string, number>();

  for (const payment of payments.filter((entry) => inRange(entry.paid_at, revenueRange))) {
    const invoice = invoicesById.get(payment.invoice_id);
    const job = invoice?.job_id ? jobsById.get(invoice.job_id) : undefined;
    const source =
      (job?.quote_id ? requestSourceByQuoteId.get(job.quote_id) : undefined) ??
      (job ? requestSourceByJobId.get(job.id) : undefined) ??
      "Unknown";

    addToMap(sourceRevenue, source, moneyValue(payment.amount));

    if (job) {
      const city = addressCities.get(job.address_id ?? "") ?? "Unmapped";
      addToMap(cityRevenue, city, moneyValue(payment.amount));
    }
  }

  // ── Cashflow ──────────────────────────────────────────────────────────
  const openInvoices = invoices.filter((i) => OPEN_INVOICE_STATUSES.includes(i.status));
  const receivables = openInvoices.reduce((sum, i) => sum + moneyValue(i.balance), 0);
  const clientsOwing = new Set(
    openInvoices.filter((i) => moneyValue(i.balance) > 0).map((i) => i.client_id)
  ).size;
  const futureJobs = jobs.filter(
    (j) => j.start_date && new Date(j.start_date) >= now && j.status !== "cancelled"
  );
  const projectedIncome = futureJobs.reduce((sum, j) => sum + moneyValue(j.total_price), 0);
  const upcomingPayouts = futureJobs.reduce((sum, j) => sum + moneyValue(j.total_cost), 0);
  const dueToday = openInvoices
    .filter((i) => i.due_date === format(now, "yyyy-MM-dd"))
    .reduce((sum, i) => sum + moneyValue(i.balance), 0);
  const dueUnderSevenDays = openInvoices
    .filter((i) => {
      if (!i.due_date) return false;
      const days = differenceInCalendarDays(new Date(i.due_date), now);
      return days >= 0 && days < 7;
    })
    .reduce((sum, i) => sum + moneyValue(i.balance), 0);
  const paymentDelays = invoices
    .filter((i) => i.paid_at && i.issue_date && inRange(i.paid_at, cashflowRange))
    .map((i) => differenceInCalendarDays(new Date(i.paid_at!), new Date(i.issue_date)));
  const methodTotals = new Map<string, number>();
  for (const p of payments.filter((p) => inRange(p.paid_at, cashflowRange))) {
    addToMap(methodTotals, p.method || "Unknown", moneyValue(p.amount));
  }

  // ── Leads ─────────────────────────────────────────────────────────────
  const leadConversionDays = average(
    requests
      .filter((request) => inRange(request.created_at, leadsRange))
      .map((request) => {
        if (!request.created_at) return null;

        const quoteDate = request.converted_to_quote_id
          ? quotes.find((quote) => quote.id === request.converted_to_quote_id)?.created_at ?? null
          : null;
        const jobDate = request.converted_to_job_id
          ? jobsById.get(request.converted_to_job_id)?.created_at ?? null
          : null;
        const conversionDate = [quoteDate, jobDate]
          .filter((value): value is string => Boolean(value))
          .sort()[0];

        return conversionDate
          ? differenceInCalendarDays(new Date(conversionDate), new Date(request.created_at))
          : null;
      })
      .filter((value): value is number => value !== null)
  );
  const quoteApprovalDays = average(
    quotes
      .filter((q) => q.sent_at && q.approved_at && inRange(q.approved_at, leadsRange))
      .map((q) => differenceInCalendarDays(new Date(q.approved_at!), new Date(q.sent_at!)))
  );
  const convertedRequestsInLeads = requests.filter(
    (r) => inRange(r.created_at, leadsRange) && (r.converted_to_quote_id || r.converted_to_job_id)
  );
  const sentQuotesInLeads = quotes.filter((q) => inRange(q.sent_at, leadsRange));
  const approvedQuotesInLeads = quotes.filter((q) => inRange(q.approved_at, leadsRange));
  const leadsWithJob = jobs.filter((j) => inRange(j.created_at, leadsRange) && j.quote_id);
  const leadsQuoteConversionRate = percent(approvedQuotesInLeads.length, Math.max(sentQuotesInLeads.length, 1));

  const leadBuckets = buildEqualBuckets(leadsRange, 4);
  const quoteValue: QuoteValuePoint[] = leadBuckets.map((bucket) => ({
    label: bucket.label,
    sent: quotes
      .filter((quote) => inBucket(quote.sent_at, bucket))
      .reduce((sum, quote) => sum + moneyValue(quote.total), 0),
    converted: quotes
      .filter((quote) => inBucket(quote.approved_at, bucket))
      .reduce((sum, quote) => sum + moneyValue(quote.total), 0),
  }));

  // ── Jobs ──────────────────────────────────────────────────────────────
  const scheduledValue = buildEqualBuckets(
    { start: startOfDay(now), end: endOfDay(addDays(now, 27)) },
    4
  ).map((bucket) => {
    const value = visits
      .filter((v) => {
        if (!v.scheduled_date) return false;
        return inBucket(`${v.scheduled_date}T12:00:00`, bucket);
      })
      .reduce((sum, v) => sum + moneyValue(jobsById.get(v.job_id)?.total_price), 0);
    return { label: bucket.label, value };
  });

  const periodJobs = jobs.filter((j) => inRange(j.created_at, jobsRange));
  const recurringJobs = periodJobs.filter((j) => isRecurringJob(j));
  const oneOffJobs = periodJobs.filter((j) => !isRecurringJob(j));
  const recurringValue = recurringJobs.reduce((sum, j) => sum + moneyValue(j.total_price), 0);
  const oneOffValue = oneOffJobs.reduce((sum, j) => sum + moneyValue(j.total_price), 0);

  return {
    metrics: [
      { label: "New leads", value: String(newLeads), deltaLabel: `${percent(newLeads - previousLeads, Math.max(previousLeads, 1))}%`, href: "/clients" },
      { label: "New requests", value: String(newRequests), deltaLabel: `${percent(newRequests - previousRequests, Math.max(previousRequests, 1))}%`, href: "/requests" },
      { label: "Converted quotes", value: String(convertedQuotes), deltaLabel: `${overviewQuoteConversionRate}%`, href: "/quotes" },
      { label: "New one-off jobs", value: String(newOneOffJobs), deltaLabel: `${percent(newOneOffJobs, Math.max(newJobs.length, 1))}%`, href: "/jobs" },
      { label: "New recurring jobs", value: String(newRecurringJobs), deltaLabel: `${percent(newRecurringJobs, Math.max(newJobs.length, 1))}%`, href: "/jobs" },
      { label: "Invoiced value", value: `$${Math.round(invoicedValue).toLocaleString("en-US")}`, deltaLabel: "selected", href: "/invoices" },
    ],
    revenueByMonth: revenueByMonth.map(({ label, value }) => ({ label, value })),
    revenueByLeadSource: toNamedValues(sourceRevenue, "No attributed revenue", 6),
    revenueHeatmap: toNamedValues(cityRevenue, "No mapped revenue", 6),
    cashflow: {
      receivables,
      clientsOwing,
      upcomingPayouts,
      projectedIncome,
      dueToday,
      dueUnderSevenDays,
      averagePaymentDays: average(paymentDelays),
    },
    paymentMethods: toNamedValues(methodTotals, "No payments", 5),
    leadConversion: {
      leadConversionDays,
      quoteApprovalDays,
      quoteConversionRate: leadsQuoteConversionRate,
      funnel: [
        { name: "New leads", value: clients.filter((c) => inRange(c.created_at, leadsRange)).length },
        { name: "Requests converted", value: convertedRequestsInLeads.length },
        { name: "Leads with sent quote", value: sentQuotesInLeads.length },
        { name: "Leads with job created", value: leadsWithJob.length },
      ],
      quoteValue,
    },
    jobs: {
      scheduledValue,
      recurringValue,
      oneOffValue,
      averageOneOffJobValue: averageMoney(oneOffJobs.map((job) => moneyValue(job.total_price))),
      averageRecurringJobValue: averageMoney(recurringJobs.map((job) => moneyValue(job.total_price))),
      monthlyRecurringJobValue: recurringValue,
    },
  };
}
