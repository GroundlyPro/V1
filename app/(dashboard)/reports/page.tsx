import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getReportsOverview,
  type NamedValue,
  type ReportPeriod,
  type ReportsOverview,
} from "@/lib/supabase/queries/reports";
import { cn } from "@/lib/utils";
import { DateBadge } from "./DateBadge";

const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function money(value: number) {
  return MONEY.format(value);
}

type ReportsPageProps = {
  searchParams: Promise<{
    op?: string; op_d?: string; // overview
    rp?: string; rp_d?: string; // revenue
    cp?: string; cp_d?: string; // cashflow
    lp?: string; lp_d?: string; // leads
    jp?: string; jp_d?: string; // jobs
  }>;
};

const VALID_PERIODS: readonly string[] = ["all", "this_month", "last_month", "this_year", "last_year", "custom"];

function validPeriod(value?: string): ReportPeriod {
  return VALID_PERIODS.includes(value ?? "") ? (value as ReportPeriod) : "all";
}

function validDate(value?: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function ReportCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg border border-[#e4ecf3] bg-white shadow-[0_1px_4px_rgba(0,20,40,0.05)]", className)}>
      {children}
    </section>
  );
}

function CardHeader({
  title,
  period,
  paramKey,
  customDate,
  href,
}: {
  title: string;
  period?: ReportPeriod;
  paramKey?: string;
  customDate?: string | null;
  href?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 pt-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-bold text-[#12384a] underline decoration-[#9fb6c3] decoration-dotted underline-offset-4">
            {title}
          </h3>
          {period !== undefined && paramKey ? (
            <DateBadge paramKey={paramKey} period={period} customDate={customDate} />
          ) : null}
        </div>
      </div>
      {href ? (
        <Link href={href} className="rounded-md p-1 text-[#285366] hover:bg-[#edf6fa]" aria-label={`Open ${title}`}>
          <ArrowUpRight className="size-4" />
        </Link>
      ) : (
        <ArrowUpRight className="size-4 text-[#285366]" />
      )}
    </div>
  );
}

function EmptyText({ children }: { children: ReactNode }) {
  return <p className="text-xs font-medium text-[#9baab8]">{children}</p>;
}

function OverviewMetrics({
  report,
  period,
  customDate,
}: {
  report: ReportsOverview;
  period: ReportPeriod;
  customDate?: string | null;
}) {
  return (
    <ReportCard>
      <div className="px-4 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold text-[#12384a]">Overview</h2>
          <DateBadge paramKey="op" period={period} customDate={customDate} />
        </div>
      </div>
      <div className="grid divide-y divide-[#e4ecf3] px-4 py-3 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-6">
        {report.metrics.map((metric) => (
          <Link key={metric.label} href={metric.href} className="group min-w-0 px-3 py-2 first:pl-0">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-xs font-bold text-[#12384a]">{metric.label}</p>
              <ArrowUpRight className="size-3.5 shrink-0 text-[#285366] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xl font-bold tabular-nums text-[#0b3345]">{metric.value}</span>
              <span className="rounded-full bg-[#edf2f4] px-2 py-0.5 text-[11px] font-bold text-[#5f7380]">
                {metric.deltaLabel}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </ReportCard>
  );
}

function RevenueBars({ data }: { data: ReportsOverview["revenueByMonth"] }) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="px-5 pb-5 pt-3">
      <div className="relative h-44 border-b border-[#e7edf2]">
        <div className="absolute inset-x-0 top-1/3 border-t border-[#eef3f6]" />
        <div className="absolute inset-x-0 top-2/3 border-t border-[#eef3f6]" />
        <div className="relative flex h-full items-end gap-3 px-4">
          {data.map((item) => {
            const height = item.value > 0 ? Math.max((item.value / max) * 100, 8) : 3;
            return (
              <div key={item.month} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                <div
                  className="rounded-t bg-[#5d3fc2]"
                  style={{ height: `${height}%`, opacity: item.value > 0 ? 1 : 0.08 }}
                  title={`${item.month}: ${money(item.value)}`}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-12 gap-2 px-4 text-center text-[11px] font-medium text-[#9baab8]">
        {data.map((item) => (
          <span key={item.month}>{item.month}</span>
        ))}
      </div>
    </div>
  );
}

function Donut({
  total,
  data,
  colors = ["#5d3fc2", "#22a9bd", "#a996ef", "#dfe8f0", "#89d9e4"],
}: {
  total: string;
  data: NamedValue[];
  colors?: string[];
}) {
  const sum = data.reduce((value, item) => value + item.value, 0);
  const gradient = data
    .reduce(
      (result, item, index) => {
        const size = sum > 0 ? (item.value / sum) * 100 : 100 / data.length;
        const segment = `${colors[index % colors.length]} ${result.cursor}% ${result.cursor + size}%`;
        return { cursor: result.cursor + size, segments: [...result.segments, segment] };
      },
      { cursor: 0, segments: [] as string[] }
    )
    .segments.join(", ");

  return (
    <div className="flex items-center justify-center gap-8 px-6 pb-6 pt-8">
      <div className="grid size-36 place-items-center rounded-full" style={{ background: `conic-gradient(${gradient})` }}>
        <div className="grid size-24 place-items-center rounded-full bg-white text-center">
          <div>
            <div className="text-xl font-bold text-[#12384a]">{total}</div>
            <div className="text-xs font-medium text-[#6e8190]">Total</div>
          </div>
        </div>
      </div>
      {sum > 0 ? (
        <div className="hidden min-w-36 space-y-2 sm:block">
          {data.map((item, index) => (
            <div key={item.name} className="flex items-center justify-between gap-4 text-xs">
              <span className="inline-flex min-w-0 items-center gap-2 text-[#4a6070]">
                <span className="size-2 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                <span className="truncate">{item.name}</span>
              </span>
              <span className="font-bold tabular-nums text-[#12384a]">{item.value}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Heatmap({ data }: { data: NamedValue[] }) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="px-4 pb-4 pt-3">
      <div className="grid min-h-56 grid-cols-2 gap-2 rounded-lg bg-[#e8f6ef] p-3 sm:grid-cols-3">
        {data.map((item, index) => {
          const intensity = item.value > 0 ? 0.18 + (item.value / max) * 0.7 : 0.08;
          return (
            <div
              key={`${item.name}-${index}`}
              className="flex min-h-20 flex-col justify-between rounded-md border border-white/70 p-3"
              style={{ backgroundColor: `rgba(93, 63, 194, ${intensity})` }}
            >
              <span className="text-xs font-bold text-[#12384a]">{item.name}</span>
              <span className="text-sm font-bold tabular-nums text-[#12384a]">{money(item.value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MiniBarChart({ data, moneyLabels = false }: { data: NamedValue[]; moneyLabels?: boolean }) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="space-y-3 px-4 pb-4 pt-3">
      {data.map((item) => (
        <div key={item.name} className="grid grid-cols-[120px_1fr_auto] items-center gap-3 text-xs">
          <span className="truncate font-semibold text-[#4a6070]">{item.name}</span>
          <div className="h-2 rounded-full bg-[#edf2f4]">
            <div
              className="h-full rounded-full bg-[#5d3fc2]"
              style={{ width: `${Math.max((item.value / max) * 100, item.value > 0 ? 4 : 0)}%` }}
            />
          </div>
          <span className="font-bold tabular-nums text-[#12384a]">{moneyLabels ? money(item.value) : item.value}</span>
        </div>
      ))}
    </div>
  );
}

function Cashflow({
  report,
  period,
  customDate,
}: {
  report: ReportsOverview;
  period: ReportPeriod;
  customDate?: string | null;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <ReportCard className="min-h-32">
        <CardHeader title="Receivables" period={period} paramKey="cp" customDate={customDate} href="/invoices" />
        <div className="px-4 pb-4 pt-3">
          <div className="text-2xl font-bold text-[#12384a]">{money(report.cashflow.receivables)}</div>
          <EmptyText>{report.cashflow.clientsOwing} clients owe you</EmptyText>
        </div>
      </ReportCard>
      <ReportCard className="min-h-32">
        <CardHeader title="Upcoming payouts" period={period} paramKey="cp" customDate={customDate} />
        <div className="px-4 pb-4 pt-3">
          <div className="text-2xl font-bold text-[#12384a]">{money(report.cashflow.upcomingPayouts)}</div>
          <EmptyText>Upcoming payouts appear after payments settle</EmptyText>
        </div>
      </ReportCard>
      <ReportCard className="min-h-32">
        <CardHeader title="Projected income" period={period} paramKey="cp" customDate={customDate} href="/jobs" />
        <div className="space-y-2 px-4 pb-4 pt-3">
          <div>
            <div className="text-lg font-bold text-[#12384a]">{money(report.cashflow.dueToday)}</div>
            <EmptyText>Due today</EmptyText>
          </div>
          <div>
            <div className="text-lg font-bold text-[#12384a]">{money(report.cashflow.dueUnderSevenDays)}</div>
            <EmptyText>Due in &lt;7 days</EmptyText>
          </div>
        </div>
      </ReportCard>
      <ReportCard className="min-h-32">
        <CardHeader title="Invoice payment time" period={period} paramKey="cp" customDate={customDate} href="/invoices" />
        <div className="px-4 pb-4 pt-3">
          <div className="text-2xl font-bold text-[#12384a]">
            {report.cashflow.averagePaymentDays === null ? "--" : report.cashflow.averagePaymentDays} days
          </div>
          <EmptyText>Average paid invoice</EmptyText>
        </div>
      </ReportCard>
    </div>
  );
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("business_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile) redirect("/onboarding");

  const p = await searchParams;
  const overviewPeriod = validPeriod(p.op);
  const revenuePeriod = validPeriod(p.rp);
  const cashflowPeriod = validPeriod(p.cp);
  const leadsPeriod = validPeriod(p.lp);
  const jobsPeriod = validPeriod(p.jp);
  const overviewDate = validDate(p.op_d);
  const revenueDate = validDate(p.rp_d);
  const cashflowDate = validDate(p.cp_d);
  const leadsDate = validDate(p.lp_d);
  const jobsDate = validDate(p.jp_d);

  const report = await getReportsOverview(profile.business_id, {
    overview: { period: overviewPeriod, customDate: overviewDate },
    revenue: { period: revenuePeriod, customDate: revenueDate },
    cashflow: { period: cashflowPeriod, customDate: cashflowDate },
    leads: { period: leadsPeriod, customDate: leadsDate },
    jobs: { period: jobsPeriod, customDate: jobsDate },
  });

  const recurringVsOneOff = [
    { name: "Recurring", value: report.jobs.recurringValue },
    { name: "One-off", value: report.jobs.oneOffValue },
  ];

  return (
    <div className="max-w-[1280px] space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-[-0.02em] text-[#0b3345]">Report</h1>
          <p className="mt-1 text-sm font-medium text-[#6e8190]">
            Lead, revenue, cashflow, conversion, and job performance.
          </p>
        </div>
        <Link
          href="/settings"
          className="rounded-lg border border-[#dbe8ef] bg-white px-4 py-2 text-sm font-bold text-[#2c7a32] shadow-[0_1px_4px_rgba(0,20,40,0.04)] hover:bg-[#f7fbf8]"
        >
          Give Feedback
        </Link>
      </div>

      <OverviewMetrics report={report} period={overviewPeriod} customDate={overviewDate} />

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-[#12384a]">Revenue</h2>
        <ReportCard>
          <CardHeader title="Revenue" period={revenuePeriod} paramKey="rp" customDate={revenueDate} />
          <RevenueBars data={report.revenueByMonth} />
        </ReportCard>
        <div className="grid gap-4 xl:grid-cols-[0.8fr_1.3fr]">
          <ReportCard>
            <CardHeader title="Revenue by Lead Source" period={revenuePeriod} paramKey="rp" customDate={revenueDate} href="/requests" />
            <Donut
              total={money(report.revenueByLeadSource.reduce((sum, item) => sum + item.value, 0))}
              data={report.revenueByLeadSource}
            />
          </ReportCard>
          <ReportCard>
            <CardHeader title="Revenue heatmap" period={revenuePeriod} paramKey="rp" customDate={revenueDate} href="/jobs" />
            <Heatmap data={report.revenueHeatmap} />
          </ReportCard>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-[#12384a]">Cashflow</h2>
        <Cashflow report={report} period={cashflowPeriod} customDate={cashflowDate} />
        <ReportCard className="max-w-2xl">
          <CardHeader title="Payment methods" period={cashflowPeriod} paramKey="cp" customDate={cashflowDate} />
          <Donut
            total={money(report.paymentMethods.reduce((sum, item) => sum + item.value, 0))}
            data={report.paymentMethods}
          />
        </ReportCard>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-[#12384a]">Lead conversion</h2>
        <div className="grid gap-4 xl:grid-cols-[0.7fr_1.4fr]">
          <div className="space-y-4">
            <ReportCard>
              <CardHeader title="Lead conversion time" period={leadsPeriod} paramKey="lp" customDate={leadsDate} />
              <div className="px-4 pb-4 pt-8">
                <div className="text-2xl font-bold text-[#12384a]">
                  {report.leadConversion.leadConversionDays ?? 0} days
                </div>
              </div>
            </ReportCard>
            <ReportCard>
              <CardHeader title="Quote approval time" period={leadsPeriod} paramKey="lp" customDate={leadsDate} />
              <div className="px-4 pb-4 pt-8">
                <div className="text-2xl font-bold text-[#12384a]">
                  {report.leadConversion.quoteApprovalDays === null ? "--" : report.leadConversion.quoteApprovalDays} days
                </div>
              </div>
            </ReportCard>
          </div>
          <ReportCard>
            <div className="flex items-start justify-between gap-4">
              <CardHeader title="Lead funnel" period={leadsPeriod} paramKey="lp" customDate={leadsDate} />
              <Link
                href="/search?q=leads"
                className="mr-4 mt-4 inline-flex items-center gap-2 rounded-lg border border-[#dbe8ef] px-3 py-2 text-xs font-bold text-[#007bb8] hover:bg-[#f4fbfe]"
              >
                <Sparkles className="size-4" />
                Ask Growndly AI
              </Link>
            </div>
            <MiniBarChart data={report.leadConversion.funnel} />
          </ReportCard>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <ReportCard>
            <CardHeader title="Quote conversion rate" period={leadsPeriod} paramKey="lp" customDate={leadsDate} href="/quotes" />
            <div className="px-4 pb-4 pt-10">
              <div className="text-2xl font-bold text-[#12384a]">{report.leadConversion.quoteConversionRate}%</div>
              <div className="mt-12 h-1 rounded-full bg-[#5d3fc2]" />
            </div>
          </ReportCard>
          <ReportCard>
            <CardHeader title="Quote value" period={leadsPeriod} paramKey="lp" customDate={leadsDate} href="/quotes" />
            <div className="grid gap-4 px-4 pb-4 pt-4 sm:grid-cols-2">
              <MiniBarChart
                data={report.leadConversion.quoteValue.map((item) => ({ name: `${item.label} sent`, value: item.sent }))}
                moneyLabels
              />
              <MiniBarChart
                data={report.leadConversion.quoteValue.map((item) => ({ name: `${item.label} converted`, value: item.converted }))}
                moneyLabels
              />
            </div>
          </ReportCard>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-[#12384a]">Jobs</h2>
        <div className="grid gap-4 xl:grid-cols-2">
          <ReportCard>
            <CardHeader title="Scheduled job value" period={jobsPeriod} paramKey="jp" customDate={jobsDate} href="/schedule" />
            <MiniBarChart
              data={report.jobs.scheduledValue.map((item) => ({ name: item.label, value: item.value }))}
              moneyLabels
            />
          </ReportCard>
          <ReportCard>
            <CardHeader title="Recurring vs One-off" period={jobsPeriod} paramKey="jp" customDate={jobsDate} href="/jobs" />
            <Donut
              total={money(report.jobs.recurringValue + report.jobs.oneOffValue)}
              data={recurringVsOneOff}
              colors={["#22a9bd", "#5d3fc2"]}
            />
          </ReportCard>
          <ReportCard>
            <CardHeader title="Average job value" period={jobsPeriod} paramKey="jp" customDate={jobsDate} href="/jobs" />
            <div className="grid gap-6 px-4 pb-4 pt-4 sm:grid-cols-2">
              <div>
                <div className="text-2xl font-bold text-[#12384a]">{money(report.jobs.averageOneOffJobValue)}</div>
                <EmptyText>One-off jobs</EmptyText>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#12384a]">{money(report.jobs.averageRecurringJobValue)}</div>
                <EmptyText>Recurring jobs</EmptyText>
              </div>
            </div>
          </ReportCard>
          <ReportCard>
            <CardHeader title="Monthly recurring job value" period={jobsPeriod} paramKey="jp" customDate={jobsDate} href="/jobs" />
            <div className="px-4 pb-4 pt-4">
              <div className="text-2xl font-bold text-[#12384a]">{money(report.jobs.monthlyRecurringJobValue)}</div>
              <EmptyText>Recurring jobs created this month</EmptyText>
            </div>
          </ReportCard>
        </div>
      </section>
    </div>
  );
}
