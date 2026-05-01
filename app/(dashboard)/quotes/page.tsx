import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpRight, CircleHelp, Plus, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getQuoteReportStats,
  getQuotes,
  type QuoteFilters,
  type QuoteListItem,
  type QuoteReportStats,
} from "@/lib/supabase/queries/quotes";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface QuotesPageProps {
  searchParams: Promise<{
    q?: string;
    status?: QuoteFilters["status"];
  }>;
}

function clientName(quote: QuoteListItem) {
  if (!quote.clients) return "No client";
  const name = `${quote.clients.first_name} ${quote.clients.last_name}`;
  return quote.clients.company_name ? `${quote.clients.company_name} (${name})` : name;
}

function formatCurrency(value: number | null) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value ?? 0);
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

const statusClasses: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  expired: "bg-orange-100 text-orange-700",
  changes_requested: "bg-yellow-100 text-yellow-700",
};

function DeltaPill({ value, suffix = "" }: { value: number; suffix?: string }) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const Icon = isPositive ? ArrowUp : ArrowDown;
  const label = `${Math.abs(value)}${suffix}`;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
        isPositive
          ? "bg-green-50 text-green-700"
          : isNegative
            ? "bg-red-50 text-red-700"
            : "bg-gray-100 text-gray-600"
      }`}
    >
      {value === 0 ? null : <Icon className="size-3" />}
      {label}
    </span>
  );
}

function QuoteReportCards({ report }: { report: QuoteReportStats }) {
  const overviewItems = [
    { label: "Draft", value: report.overview.draft, color: "bg-[#486778]" },
    { label: "Awaiting response", value: report.overview.sent, color: "bg-[#d6b420]" },
    { label: "Changes requested", value: report.overview.changes_requested, color: "bg-[#d34a35]" },
    { label: "Approved", value: report.overview.approved, color: "bg-[#3f8f2f]" },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Card className="rounded-lg border-[#d6e0e7] shadow-none">
        <CardHeader className="pb-0">
          <CardTitle className="text-lg font-bold text-[#063044]">Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {overviewItems.map((item) => (
              <Link
                key={item.label}
                href={`/quotes?status=${item.label === "Awaiting response" ? "sent" : item.label.toLowerCase().replaceAll(" ", "_")}`}
                className="flex items-center gap-2 text-sm text-[#12384a] hover:text-brand"
              >
                <span className={`size-2.5 rounded-full ${item.color}`} />
                <span>
                  {item.label} ({item.value})
                </span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg border-[#d6e0e7] shadow-none">
        <CardHeader className="pb-0">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="max-w-36 text-lg font-bold leading-tight text-[#063044]">
              Conversion rate
            </CardTitle>
            <div className="flex items-center gap-3 text-[#12384a]">
              <CircleHelp className="size-4" aria-label="Converted quote jobs divided by sent quotes" />
              <Link href="/reports" aria-label="Open reports">
                <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </div>
          <CardDescription className="text-sm text-[#365c6e]">Past 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold tabular-nums text-[#063044]">
              {report.conversionRate.value}%
            </span>
            <DeltaPill value={report.conversionRate.delta} suffix="%" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg border-[#d6e0e7] shadow-none">
        <CardHeader className="pb-0">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-lg font-bold text-[#063044]">Sent</CardTitle>
            <Link href="/quotes?status=sent" aria-label="Open sent quotes" className="text-[#12384a]">
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
          <CardDescription className="text-sm text-[#365c6e]">Past 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold tabular-nums text-[#063044]">{report.sent.count}</span>
            <DeltaPill value={report.sent.delta} />
          </div>
          <p className="mt-1 text-sm text-[#365c6e]">{formatCompactCurrency(report.sent.value)}</p>
        </CardContent>
      </Card>

      <Card className="rounded-lg border-[#d6e0e7] shadow-none">
        <CardHeader className="pb-0">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-lg font-bold text-[#063044]">Converted</CardTitle>
            <Link href="/jobs" aria-label="Open converted jobs" className="text-[#12384a]">
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
          <CardDescription className="text-sm text-[#365c6e]">Past 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold tabular-nums text-[#063044]">{report.converted.count}</span>
            <DeltaPill value={report.converted.delta} />
          </div>
          <p className="mt-1 text-sm text-[#365c6e]">{formatCompactCurrency(report.converted.value)}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function QuotesPage({ searchParams }: QuotesPageProps) {
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

  const params = await searchParams;
  const status = params.status ?? "all";
  const [quotes, report] = await Promise.all([
    getQuotes(profile.business_id, {
      search: params.q,
      status,
    }),
    getQuoteReportStats(profile.business_id),
  ]);

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
          <p className="text-sm text-muted-foreground">
            Build and send quotes, get client approval, and convert to jobs.
          </p>
        </div>
        <Link href="/quotes/new" className={buttonVariants()}>
          <Plus className="size-4" />
          New Quote
        </Link>
      </div>

      <QuoteReportCards report={report} />

      <Card>
        <CardHeader>
          <CardTitle>Quote Pipeline</CardTitle>
          <CardDescription>
            Track quote status from draft through approval and job conversion.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="flex flex-col gap-3 sm:flex-row" action="/quotes">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="Search title or quote number"
                className="pl-8"
              />
            </div>
            <Select name="status" defaultValue={status}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="changes_requested">Changes requested</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <button className={buttonVariants({ variant: "outline" })} type="submit">
              Filter
            </button>
          </form>

          {quotes.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium text-gray-900">No quotes found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a quote for a client or adjust the current filters.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell>
                      <Link
                        href={`/quotes/${quote.id}`}
                        className="font-medium hover:text-brand"
                      >
                        {quote.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">{quote.quote_number}</p>
                    </TableCell>
                    <TableCell>{clientName(quote)}</TableCell>
                    <TableCell>
                      <Badge className={statusClasses[quote.status] ?? statusClasses.draft}>
                        {quote.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(quote.valid_until)}</TableCell>
                    <TableCell>{formatCurrency(quote.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
