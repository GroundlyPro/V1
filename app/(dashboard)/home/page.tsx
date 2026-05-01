import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getRevenueSummary } from "@/lib/supabase/queries/insights";
import { addDays, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek, subDays, subMonths } from "date-fns";
import { redirect } from "next/navigation";

const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function fmtCurrency(value: number) {
  return MONEY.format(value);
}

function fmtCompactCurrency(value: number) {
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return fmtCurrency(value);
}

type AppointmentVisit = {
  id: string;
  scheduled_date: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string;
  job_id: string;
  jobs: {
    id: string;
    title: string;
    job_number: string;
    total_price: number | null;
    clients: {
      first_name: string;
      last_name: string;
      company_name: string | null;
    } | null;
    client_addresses: {
      street1: string;
      street2: string | null;
      city: string;
      state: string;
      zip: string;
    } | null;
  } | null;
  visit_assignments: {
    user_id: string;
    users: {
      id: string;
      first_name: string;
      last_name: string;
    } | null;
  }[];
};

type AppointmentJob = NonNullable<AppointmentVisit["jobs"]>;

type TeamMember = {
  id: string;
  first_name: string;
  last_name: string;
  role: string | null;
};

interface HomePageProps {
  searchParams: Promise<{
    date?: string;
    period?: string;
    team?: string;
  }>;
}

function validDateParam(value?: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

type Period =
  | "today"
  | "yesterday"
  | "tomorrow"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "custom";

const VALID_PERIODS = [
  "today",
  "yesterday",
  "tomorrow",
  "this_week",
  "last_week",
  "this_month",
  "last_month",
  "custom",
] as const;

function validPeriod(value?: string): Period {
  return (VALID_PERIODS as readonly string[]).includes(value ?? "")
    ? (value as Period)
    : "this_month";
}

function computeDateRange(
  period: Period,
  today: Date,
  customDate: string | null
): { start: string; end: string; label: string } {
  const todayIso = format(today, "yyyy-MM-dd");

  if (period === "yesterday") {
    const d = subDays(today, 1);
    const iso = format(d, "yyyy-MM-dd");
    return { start: iso, end: iso, label: format(d, "EEEE, MMMM d, yyyy") };
  }
  if (period === "tomorrow") {
    const d = addDays(today, 1);
    const iso = format(d, "yyyy-MM-dd");
    return { start: iso, end: iso, label: format(d, "EEEE, MMMM d, yyyy") };
  }
  if (period === "this_week") {
    const start = startOfWeek(today, { weekStartsOn: 0 });
    const end = endOfWeek(today, { weekStartsOn: 0 });
    return {
      start: format(start, "yyyy-MM-dd"),
      end: format(end, "yyyy-MM-dd"),
      label: `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`,
    };
  }
  if (period === "last_week") {
    const pivot = subDays(today, 7);
    const start = startOfWeek(pivot, { weekStartsOn: 0 });
    const end = endOfWeek(pivot, { weekStartsOn: 0 });
    return {
      start: format(start, "yyyy-MM-dd"),
      end: format(end, "yyyy-MM-dd"),
      label: `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`,
    };
  }
  if (period === "this_month") {
    const start = startOfMonth(today);
    const end = endOfMonth(today);
    return {
      start: format(start, "yyyy-MM-dd"),
      end: format(end, "yyyy-MM-dd"),
      label: format(today, "MMMM yyyy"),
    };
  }
  if (period === "last_month") {
    const prev = subMonths(today, 1);
    const start = startOfMonth(prev);
    const end = endOfMonth(prev);
    return {
      start: format(start, "yyyy-MM-dd"),
      end: format(end, "yyyy-MM-dd"),
      label: format(prev, "MMMM yyyy"),
    };
  }
  if (period === "custom") {
    const iso = customDate ?? todayIso;
    return {
      start: iso,
      end: iso,
      label: format(new Date(iso + "T00:00:00"), "EEEE, MMMM d, yyyy"),
    };
  }
  // today (default)
  return { start: todayIso, end: todayIso, label: format(today, "EEEE, MMMM d, yyyy") };
}

function customerName(client: AppointmentJob["clients"] | null | undefined) {
  if (!client) return "Customer";
  const name = `${client.first_name} ${client.last_name}`;
  return client.company_name ? `${client.company_name} (${name})` : name;
}

function addressText(address: AppointmentJob["client_addresses"] | null | undefined) {
  if (!address) return "No location recorded";
  return [address.street1, address.street2, address.city, address.state, address.zip]
    .filter(Boolean)
    .join(", ");
}

function assignedNames(assignments: AppointmentVisit["visit_assignments"]) {
  const names = assignments
    .map((assignment) => assignment.users)
    .filter((user): user is NonNullable<typeof user> => Boolean(user))
    .map((user) => `${user.first_name} ${user.last_name}`);

  return names.length > 0 ? names.join(", ") : "Unassigned";
}

function timeRange(visit: Pick<AppointmentVisit, "start_time" | "end_time">) {
  if (!visit.start_time) return "Anytime";
  const start = visit.start_time.slice(0, 5);
  const end = visit.end_time?.slice(0, 5);
  return end ? `${start} - ${end}` : start;
}

function uniqueJobTotal(visits: AppointmentVisit[]) {
  const totals = new Map<string, number>();
  for (const visit of visits) {
    const job = visit.jobs;
    if (!job?.id) continue;
    if (!totals.has(job.id)) {
      totals.set(job.id, Number(job.total_price ?? 0));
    }
  }
  return Array.from(totals.values()).reduce((sum, value) => sum + value, 0);
}

function uniqueJobTotalFromVisitRows(
  visits: Array<{ jobs: { id: string; total_price: number | null } | { id: string; total_price: number | null }[] | null }>
) {
  const totals = new Map<string, number>();
  for (const visit of visits) {
    const job = Array.isArray(visit.jobs) ? visit.jobs[0] : visit.jobs;
    if (!job?.id) continue;
    if (!totals.has(job.id)) {
      totals.set(job.id, Number(job.total_price ?? 0));
    }
  }
  return Array.from(totals.values()).reduce((sum, value) => sum + value, 0);
}

function invoiceBalance(invoice: { total: number | null; amount_paid: number | null }) {
  return Math.max(0, (invoice.total ?? 0) - (invoice.amount_paid ?? 0));
}

function filterVisitsByTeam(visits: AppointmentVisit[], teamMemberId: string) {
  if (teamMemberId === "all") return visits;
  return visits.filter((visit) =>
    visit.visit_assignments.some((assignment) => assignment.user_id === teamMemberId)
  );
}

const TONE_STYLES = {
  request: {
    bar: "from-[#ff9800] to-[#ffb74d]",
    tint: "rgba(255,152,0,0.05)",
    numColor: "#bf360c",
  },
  quote: {
    bar: "from-[#9c27b0] to-[#ce93d8]",
    tint: "rgba(156,39,176,0.05)",
    numColor: "#4a148c",
  },
  job: {
    bar: "from-[#007bb8] to-[#29b6f6]",
    tint: "rgba(0,123,184,0.05)",
    numColor: "#01579b",
  },
  invoice: {
    bar: "from-[#1565c0] to-[#1e88e5]",
    tint: "rgba(21,101,192,0.05)",
    numColor: "#0d47a1",
  },
} as const;

function WorkflowCard({
  tone,
  label,
  count,
  amount,
  status,
  rows,
}: {
  tone: "request" | "quote" | "job" | "invoice";
  label: string;
  count: string;
  amount?: string;
  status: string;
  rows: Array<{ label: string; value: string; danger?: boolean }>;
}) {
  const s = TONE_STYLES[tone];

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-[#e4ecf3] bg-white p-[18px] shadow-[0_1px_4px_rgba(0,20,40,0.05)] transition-all duration-300 hover:-translate-y-[3px] hover:shadow-[0_8px_28px_rgba(0,20,40,0.10)]"
      style={{
        backgroundImage: `linear-gradient(148deg, #ffffff 55%, ${s.tint} 100%)`,
      }}
    >
      {/* Gradient accent bar */}
      <div className={`absolute left-0 right-0 top-0 h-[3px] bg-gradient-to-r ${s.bar}`} />

      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.8px] text-[#9e9e9e]">
        {label}
      </div>
      <div
        className="text-[28px] font-bold leading-tight tracking-[-1px] tabular-nums"
        style={{ color: s.numColor }}
      >
        {count}
        {amount ? (
          <span className="ml-1 text-sm font-medium tracking-normal text-[#9e9e9e]">
            {amount}
          </span>
        ) : null}
      </div>
      <div className="mb-2 text-xs font-semibold text-[#757575]">{status}</div>
      <div className="space-y-[3px]">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between text-xs text-[#757575]">
            <span>{row.label}</span>
            <span
              className={
                row.danger
                  ? "font-semibold text-[#d32f2f]"
                  : "font-semibold text-[#424242]"
              }
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const supabase = await createClient();
  const today = new Date();
  const weekEnd = addDays(today, 6);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("first_name, business_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile) redirect("/onboarding");

  const todayIso = format(today, "yyyy-MM-dd");
  const params = await searchParams;
  const selectedPeriod = validPeriod(params.period);
  const customDate = validDateParam(params.date);
  const dateRange = computeDateRange(selectedPeriod, today, customDate);
  const selectedTeamMemberId = params.team?.trim() || "all";
  const firstName = profile.first_name || "there";

  const [
    requestsResult,
    quotesResult,
    jobsResult,
    invoicesResult,
    appointmentVisitsResult,
    overdueVisitsResult,
    upcomingVisitsResult,
    teamMembersResult,
    draftQuotesResult,
    changesRequestedQuotesResult,
    draftInvoicesResult,
    completedJobsResult,
    revenueSummary,
  ] = await Promise.all([
    supabase
      .from("requests")
      .select("status", { count: "exact" })
      .eq("business_id", profile.business_id)
      .is("converted_to_job_id", null)
      .is("converted_to_quote_id", null),
    supabase
      .from("quotes")
      .select("total", { count: "exact" })
      .eq("business_id", profile.business_id)
      .eq("status", "approved"),
    supabase
      .from("jobs")
      .select("total_price", { count: "exact" })
      .eq("business_id", profile.business_id)
      .in("status", ["active", "in_progress"]),
    supabase
      .from("invoices")
      .select("total, amount_paid, status, clients(id, first_name, last_name)")
      .eq("business_id", profile.business_id)
      .in("status", ["sent", "past_due", "upcoming"]),
    supabase
      .from("job_visits")
      .select(
        `
        id, scheduled_date, start_time, end_time, status, job_id,
        jobs(id, title, job_number, total_price, clients(first_name, last_name, company_name), client_addresses(street1, street2, city, state, zip)),
        visit_assignments(user_id, users(id, first_name, last_name))
      `
      )
      .eq("business_id", profile.business_id)
      .gte("scheduled_date", dateRange.start)
      .lte("scheduled_date", dateRange.end)
      .order("start_time", { ascending: true }),
    supabase
      .from("job_visits")
      .select(
        `
        id, scheduled_date, start_time, end_time, status, job_id,
        jobs(id, title, job_number, total_price, clients(first_name, last_name, company_name), client_addresses(street1, street2, city, state, zip)),
        visit_assignments(user_id, users(id, first_name, last_name))
      `
      )
      .eq("business_id", profile.business_id)
      .lt("scheduled_date", todayIso)
      .in("status", ["scheduled", "in_progress"]),
    supabase
      .from("job_visits")
      .select("jobs(total_price)")
      .eq("business_id", profile.business_id)
      .gte("scheduled_date", todayIso)
      .lte("scheduled_date", format(weekEnd, "yyyy-MM-dd"))
      .in("status", ["scheduled", "in_progress"]),
    supabase
      .from("users")
      .select("id, first_name, last_name, role")
      .eq("business_id", profile.business_id)
      .eq("is_active", true)
      .order("first_name", { ascending: true }),
    supabase
      .from("quotes")
      .select("total", { count: "exact" })
      .eq("business_id", profile.business_id)
      .eq("status", "draft"),
    supabase
      .from("quotes")
      .select("total", { count: "exact" })
      .eq("business_id", profile.business_id)
      .eq("status", "changes_requested"),
    supabase
      .from("invoices")
      .select("total", { count: "exact" })
      .eq("business_id", profile.business_id)
      .eq("status", "draft"),
    supabase
      .from("jobs")
      .select("total_price", { count: "exact" })
      .eq("business_id", profile.business_id)
      .eq("status", "completed"),
    getRevenueSummary(profile.business_id),
  ]);

  const approvedQuoteTotal = (quotesResult.data ?? []).reduce(
    (sum, quote) => sum + (quote.total ?? 0),
    0
  );
  const draftQuoteTotal = (draftQuotesResult.data ?? []).reduce(
    (sum, quote) => sum + (quote.total ?? 0),
    0
  );
  const changesRequestedQuoteTotal = (changesRequestedQuotesResult.data ?? []).reduce(
    (sum, quote) => sum + (quote.total ?? 0),
    0
  );
  const activeJobTotal = (jobsResult.data ?? []).reduce(
    (sum, job) => sum + (job.total_price ?? 0),
    0
  );
  const completedJobTotal = (completedJobsResult.data ?? []).reduce(
    (sum, job) => sum + (job.total_price ?? 0),
    0
  );
  const draftInvoiceTotal = (draftInvoicesResult.data ?? []).reduce(
    (sum, invoice) => sum + (invoice.total ?? 0),
    0
  );
  const openInvoices = invoicesResult.data ?? [];
  const receivables = openInvoices.reduce((sum, invoice) => sum + invoiceBalance(invoice), 0);
  const pastDue = openInvoices
    .filter((invoice) => invoice.status === "past_due")
    .reduce((sum, invoice) => sum + invoiceBalance(invoice), 0);
  const clientsOwing = new Set(
    openInvoices
      .map((invoice) => {
        const client = Array.isArray(invoice.clients) ? invoice.clients[0] : invoice.clients;
        return client?.id ?? null;
      })
      .filter(Boolean)
  ).size;
  const teamMembers = (teamMembersResult.data ?? []) as TeamMember[];
  const validSelectedTeamMemberId =
    selectedTeamMemberId === "all" || teamMembers.some((member) => member.id === selectedTeamMemberId)
      ? selectedTeamMemberId
      : "all";
  const appointmentVisits = filterVisitsByTeam(
    (appointmentVisitsResult.data ?? []) as AppointmentVisit[],
    validSelectedTeamMemberId
  );
  const overdueVisits = filterVisitsByTeam(
    (overdueVisitsResult.data ?? []) as AppointmentVisit[],
    validSelectedTeamMemberId
  );
  const activeVisits = appointmentVisits.filter((visit) =>
    ["scheduled", "in_progress"].includes(visit.status)
  );
  const completedVisits = appointmentVisits.filter((visit) => visit.status === "completed");
  const remainingVisits = appointmentVisits.filter((visit) => visit.status !== "completed");
  const overdueAppointmentVisits = appointmentVisits.filter(
    (v) =>
      ["scheduled", "in_progress"].includes(v.status) &&
      v.scheduled_date !== null &&
      v.scheduled_date < todayIso
  );
  const upcomingJobsTotal = uniqueJobTotalFromVisitRows(
    (upcomingVisitsResult.data ?? []) as Array<{
      jobs: { id: string; total_price: number | null } | { id: string; total_price: number | null }[] | null;
    }>
  );
  const appointmentSummary = [
    ["Total", fmtCurrency(uniqueJobTotal(appointmentVisits)), ""],
    ["Active", fmtCurrency(uniqueJobTotal(activeVisits)), ""],
    ["Completed", fmtCurrency(uniqueJobTotal(completedVisits)), "text-[#2e7d32]"],
    ["Overdue", fmtCurrency(uniqueJobTotal(overdueAppointmentVisits)), "text-[#d32f2f]"],
    ["Remaining", fmtCurrency(uniqueJobTotal(remainingVisits)), "text-[#757575]"],
  ];
  const openRequests = requestsResult.data ?? [];
  const newRequestCount = openRequests.filter((request) => request.status === "new").length;
  const inReviewRequestCount = openRequests.filter((request) => request.status === "in_review").length;

  const workflow = [
    {
      tone: "request" as const,
      label: "Requests",
      count: String(requestsResult.count ?? 0),
      status: "Open",
      rows: [
        { label: "New", value: String(newRequestCount) },
        { label: "In review", value: String(inReviewRequestCount) },
      ],
    },
    {
      tone: "quote" as const,
      label: "Quotes",
      count: String(quotesResult.count ?? 0),
      amount: fmtCurrency(approvedQuoteTotal),
      status: "Approved",
      rows: [
        { label: `Draft (${draftQuotesResult.count ?? 0})`, value: fmtCurrency(draftQuoteTotal) },
        {
          label: `Changes requested (${changesRequestedQuotesResult.count ?? 0})`,
          value: fmtCurrency(changesRequestedQuoteTotal),
        },
      ],
    },
    {
      tone: "job" as const,
      label: "Jobs",
      count: String(jobsResult.count ?? 0),
      amount: fmtCompactCurrency(activeJobTotal),
      status: "Requires invoicing",
      rows: [
        { label: `Active (${jobsResult.count ?? 0})`, value: fmtCompactCurrency(activeJobTotal) },
        {
          label: `Completed (${completedJobsResult.count ?? 0})`,
          value: fmtCompactCurrency(completedJobTotal),
        },
      ],
    },
    {
      tone: "invoice" as const,
      label: "Invoices",
      count: String(openInvoices.length),
      amount: fmtCurrency(receivables),
      status: "Awaiting payment",
      rows: [
        { label: `Draft (${draftInvoicesResult.count ?? 0})`, value: fmtCurrency(draftInvoiceTotal) },
        {
          label: `Past due (${openInvoices.filter((i) => i.status === "past_due").length})`,
          value: fmtCurrency(pastDue),
          danger: true,
        },
      ],
    },
  ];

  return (
    <div className="max-w-[1180px]">
      {/* Greeting */}
      <div
        className="animate-fade-in mb-1 text-[12.5px] text-[#8fa8bc]"
        style={{ animationDelay: "0ms" }}
      >
        {format(today, "EEEE, MMMM d, yyyy")}
      </div>
      <h1
        className="animate-fade-up mb-6 text-[28px] font-bold leading-tight tracking-[-0.5px] text-[#1a2d3d]"
        style={{ animationDelay: "40ms" }}
      >
        Good morning,{" "}
        <span
          className="bg-clip-text text-transparent"
          style={{ backgroundImage: "linear-gradient(135deg, #007bb8, #29b6f6)" }}
        >
          {firstName}
        </span>{" "}
        <span aria-hidden="true">&#128075;</span>
      </h1>

      {/* Workflow */}
      <div
        className="animate-fade-up mb-3 text-[14.5px] font-bold text-[#1a2d3d]"
        style={{ animationDelay: "80ms" }}
      >
        Workflow
      </div>
      <div className="mb-7 grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-4">
        {workflow.map((item, i) => (
          <div
            key={item.label}
            className="animate-fade-up"
            style={{ animationDelay: `${120 + i * 55}ms` }}
          >
            <WorkflowCard {...item} />
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_300px]">
        {/* Appointments */}
        <div
          className="animate-fade-up overflow-hidden rounded-2xl border border-[#e4ecf3] bg-white shadow-[0_1px_4px_rgba(0,20,40,0.05)]"
          style={{ animationDelay: "360ms" }}
        >
          <div className="flex flex-col gap-3 px-5 pb-3.5 pt-[18px] lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[15px] font-bold text-[#1a2d3d]">Appointments</div>
              <div className="mt-0.5 text-xs text-[#8fa8bc]">
                {dateRange.label}
              </div>
            </div>
            <form action="/home" className="flex flex-wrap items-end gap-2">
              <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.5px] text-[#7f94a6]">
                Date range
                <select
                  name="period"
                  defaultValue={selectedPeriod}
                  className="h-9 min-w-[140px] rounded-md border border-[#d8e3ed] bg-white px-2.5 text-[13px] font-medium normal-case tracking-normal text-[#1a2d3d] outline-none transition-colors focus:border-[#007bb8]"
                >
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="tomorrow">Tomorrow</option>
                  <option value="this_week">This week</option>
                  <option value="last_week">Last week</option>
                  <option value="this_month">This month</option>
                  <option value="last_month">Last month</option>
                  <option value="custom">Custom date…</option>
                </select>
              </label>
              {selectedPeriod === "custom" && (
                <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.5px] text-[#7f94a6]">
                  Date
                  <input
                    type="date"
                    name="date"
                    defaultValue={dateRange.start}
                    className="h-9 rounded-md border border-[#d8e3ed] bg-white px-2.5 text-[13px] font-medium normal-case tracking-normal text-[#1a2d3d] outline-none transition-colors focus:border-[#007bb8]"
                  />
                </label>
              )}
              <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.5px] text-[#7f94a6]">
                Team member
                <select
                  name="team"
                  defaultValue={validSelectedTeamMemberId}
                  className="h-9 min-w-[170px] rounded-md border border-[#d8e3ed] bg-white px-2.5 text-[13px] font-medium normal-case tracking-normal text-[#1a2d3d] outline-none transition-colors focus:border-[#007bb8]"
                >
                  <option value="all">All team members</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.first_name} {member.last_name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="h-9 rounded-md bg-[#007bb8] px-3 text-[13px] font-semibold text-white transition-colors hover:bg-[#006aa0]"
              >
                Apply
              </button>
            </form>
            <Link
              href="/schedule"
              className="text-[13px] font-semibold text-[#007bb8] transition-colors hover:text-[#005a8a] lg:ml-2"
            >
              View Schedule &rarr;
            </Link>
          </div>
          <div className="flex flex-wrap gap-6 border-b border-[#e8f0f7] bg-[#f6f9fc] px-5 py-3.5">
            {appointmentSummary.map(([label, value, tone]) => (
              <div key={label}>
                <label className="text-[11px] uppercase tracking-[0.5px] text-[#9baab8]">
                  {label}
                </label>
                <div className={`mt-px text-xl font-bold tabular-nums text-[#1a2d3d] ${tone}`}>
                  {value}
                </div>
              </div>
            ))}
          </div>
          {appointmentVisits.length > 0 ? (
            <AppointmentSection label={`${appointmentVisits.length} Appointments`}>
              {appointmentVisits.map((visit) => (
                <AppointmentItem key={visit.id} visit={visit} />
              ))}
            </AppointmentSection>
          ) : (
            <div className="px-[18px] py-10 text-center text-[13px] text-[#9baab8]">
              No appointments scheduled for this date
            </div>
          )}
        </div>

        {/* Side cards */}
        <div className="space-y-3.5">
          <div className="animate-fade-up" style={{ animationDelay: "420ms" }}>
            <SideCard title="Reminders">
              {overdueVisits.length > 0 ? (
                <div className="flex items-center gap-2.5 px-[18px] py-3">
                  <div className="h-2 w-2 shrink-0 rounded-full bg-[#d32f2f]" />
                  <div className="flex-1 text-[13px] text-[#4a6070]">
                    {overdueVisits.length} overdue scheduled{" "}
                    {overdueVisits.length === 1 ? "visit" : "visits"}
                  </div>
                  <span className="text-[#c0cdd8]">&#8250;</span>
                </div>
              ) : (
                <div className="px-[18px] py-3 text-[13px] text-[#9baab8]">
                  No reminders due
                </div>
              )}
            </SideCard>
          </div>

          <div className="animate-fade-up" style={{ animationDelay: "480ms" }}>
            <SideCard title="Receivables" chevron>
              <div className="px-[18px] pb-1 pt-2.5 text-2xl font-bold tabular-nums tracking-[-0.5px] text-[#1a2d3d]">
                {fmtCurrency(receivables)}
              </div>
              <div className="px-[18px] pb-2 text-[11.5px] text-[#9baab8]">
                {clientsOwing || 0} clients owe you
              </div>
              <table className="mb-2 w-full">
                <tbody>
                  {openInvoices.slice(0, 3).map((invoice, index) => {
                    const client = Array.isArray(invoice.clients)
                      ? invoice.clients[0]
                      : invoice.clients;
                    const name = client
                      ? `${client.first_name} ${client.last_name}`
                      : "Client";
                    const balance = invoiceBalance(invoice);
                    return (
                      <tr key={`${name}-${index}`}>
                        <td className="px-[18px] py-1 text-xs text-[#4a6070]">{name}</td>
                        <td className="px-[18px] py-1 text-right text-xs font-semibold tabular-nums text-[#4a6070]">
                          {fmtCurrency(balance)}
                        </td>
                        <td className="px-[18px] py-1 text-right text-xs font-semibold tabular-nums text-[#d32f2f]">
                          {invoice.status === "past_due" ? fmtCurrency(balance) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {openInvoices.length === 0 ? (
                    <tr>
                      <td className="px-[18px] py-2 text-xs text-[#9baab8]">No open invoices</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </SideCard>
          </div>

          <div className="animate-fade-up" style={{ animationDelay: "540ms" }}>
            <SideCard title="Upcoming Jobs" chevron>
              <div className="px-[18px] pb-0.5 pt-1 text-[11px] text-[#9baab8]">
                This week ({format(today, "MMM d")} - {format(weekEnd, "MMM d")})
              </div>
              <div className="px-[18px] pb-1 pt-2 text-2xl font-bold tabular-nums tracking-[-0.5px] text-[#1a2d3d]">
                {fmtCompactCurrency(upcomingJobsTotal)}
              </div>
              <div className="px-[18px] pb-3 text-[11.5px] text-[#9baab8]">
                Scheduled job value
              </div>
            </SideCard>
          </div>

          <div className="animate-fade-up" style={{ animationDelay: "600ms" }}>
            <SideCard title="Revenue" chevron>
              <div className="px-[18px] pb-0.5 pt-1 text-[11px] text-[#9baab8]">
                This month so far
              </div>
              <div className="px-[18px] pb-1 pt-2 text-2xl font-bold tabular-nums tracking-[-0.5px] text-[#1a2d3d]">
                {fmtCurrency(revenueSummary.thisMonth)}
              </div>
              <div className="px-[18px] pb-3 text-[11.5px] text-[#9baab8]">
                {revenueSummary.thisMonth > 0
                  ? `${fmtCurrency(revenueSummary.ytd)} year to date`
                  : "No invoices paid yet this month"}
              </div>
            </SideCard>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppointmentSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="px-5 pb-1 pt-2.5 text-[10.5px] font-bold uppercase tracking-[0.8px] text-[#b0bfc9]">
        {label}
      </div>
      {children}
    </>
  );
}

function AppointmentItem({ visit }: { visit: AppointmentVisit }) {
  const job = visit.jobs;
  const color =
    visit.status === "completed" ? "#2e7d32" : visit.status === "in_progress" ? "#f57c00" : "#007bb8";

  return (
    <Link
      href={`/jobs/${visit.job_id}`}
      className="group flex cursor-pointer items-center gap-3 border-b border-[#f0f5fa] px-5 py-[11px] transition-colors duration-150 hover:bg-[#f6f9fc]"
    >
      <div
        className="h-[38px] w-[3px] shrink-0 rounded-full transition-all duration-150 group-hover:h-[44px]"
        style={{ background: color }}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-[#1a2d3d]">
          {customerName(job?.clients)} - {job?.title ?? "Scheduled visit"}
        </div>
        <div className="mt-px text-xs text-[#9baab8]">
          {visit.scheduled_date ? format(new Date(`${visit.scheduled_date}T00:00:00`), "MMM d") : "No date"}{" "}
          - {timeRange(visit)}
        </div>
        <div className="mt-1 grid gap-1 text-[11.5px] text-[#6d8190] sm:grid-cols-3">
          <span className="truncate">Assigned: {assignedNames(visit.visit_assignments)}</span>
          <span className="truncate sm:col-span-2">Location: {addressText(job?.client_addresses)}</span>
        </div>
      </div>
      <div className="ml-auto text-[13px] font-bold tabular-nums text-[#2d4a5e]">
        {fmtCurrency(Number(job?.total_price ?? 0))}
      </div>
    </Link>
  );
}

function SideCard({
  title,
  children,
  chevron = false,
}: {
  title: string;
  children: React.ReactNode;
  chevron?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e4ecf3] bg-white shadow-[0_1px_4px_rgba(0,20,40,0.05)]">
      <div className="flex items-center justify-between border-b border-[#edf3f8] px-[18px] py-3.5">
        <h3 className="text-[13px] font-bold text-[#1a2d3d]">{title}</h3>
        {chevron ? <span className="text-[#b0bfc9] text-sm">&#8250;</span> : null}
      </div>
      {children}
    </div>
  );
}
