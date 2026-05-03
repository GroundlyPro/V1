import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, CircleDollarSign, FileText, Plus, Search, Send, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getInvoices,
  type InvoiceStatus,
  type InvoiceFilter,
  type InvoiceListItem,
} from "@/lib/supabase/queries/invoices";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvoiceRowActions } from "@/components/invoices/InvoiceRowActions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface InvoicesPageProps {
  searchParams: Promise<{
    q?: string;
    status?: InvoiceFilter;
  }>;
}

function clientName(invoice: InvoiceListItem) {
  if (!invoice.clients) return "No client";
  const name = `${invoice.clients.first_name} ${invoice.clients.last_name}`;
  return invoice.clients.company_name ? `${invoice.clients.company_name} (${name})` : name;
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
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

const statusClasses: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  upcoming: "bg-cyan-100 text-cyan-700",
  past_due: "bg-red-100 text-red-700",
  paid: "bg-green-100 text-green-700",
  void: "bg-slate-100 text-slate-700",
};

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function parseDate(value: string | null) {
  return value ? new Date(`${value}T00:00:00`) : null;
}

function isOpenInvoice(invoice: InvoiceListItem) {
  return ["draft", "sent", "upcoming", "past_due"].includes(invoice.status);
}

function tabHref(status: InvoiceFilter, q?: string) {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (q) params.set("q", q);
  const query = params.toString();
  return query ? `/invoices?${query}` : "/invoices";
}

function InvoiceReportCards({ invoices }: { invoices: InvoiceListItem[] }) {
  const today = startOfToday();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  const overviewItems: { label: string; status: InvoiceStatus; color: string }[] = [
    { label: "Draft", status: "draft", color: "bg-[#6b7280]" },
    { label: "Sent", status: "sent", color: "bg-[#007bb8]" },
    { label: "Upcoming", status: "upcoming", color: "bg-[#0ea5b7]" },
    { label: "Past due", status: "past_due", color: "bg-[#d34a35]" },
    { label: "Paid", status: "paid", color: "bg-[#3f8f2f]" },
    { label: "Void", status: "void", color: "bg-[#94a3b8]" },
  ];

  const openInvoices = invoices.filter(isOpenInvoice);
  const openBalance = openInvoices.reduce((sum, invoice) => sum + Number(invoice.balance ?? 0), 0);

  const dueSoon = openInvoices.filter((invoice) => {
    const dueDate = parseDate(invoice.due_date);
    return dueDate && dueDate >= today && dueDate <= nextWeek;
  });
  const dueSoonBalance = dueSoon.reduce((sum, invoice) => sum + Number(invoice.balance ?? 0), 0);

  const pastDue = invoices.filter((invoice) => invoice.status === "past_due");
  const pastDueBalance = pastDue.reduce((sum, invoice) => sum + Number(invoice.balance ?? 0), 0);

  const drafts = invoices.filter((invoice) => invoice.status === "draft");
  const draftValue = drafts.reduce((sum, invoice) => sum + Number(invoice.total ?? 0), 0);

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Card className="rounded-lg border-[#d6e0e7] shadow-none">
        <CardHeader className="pb-0">
          <CardTitle className="text-lg font-bold text-[#063044]">Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {overviewItems.map((item) => {
              const count = invoices.filter((invoice) => invoice.status === item.status).length;
              return (
                <Link
                  key={item.status}
                  href={tabHref(item.status)}
                  className="flex items-center gap-2 text-sm text-[#12384a] hover:text-brand"
                >
                  <span className={`size-2.5 rounded-full ${item.color}`} />
                  <span>
                    {item.label} ({count})
                  </span>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg border-[#d6e0e7] shadow-none">
        <CardHeader className="pb-0">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-lg font-bold text-[#063044]">Open receivables</CardTitle>
            <Link href={tabHref("unpaid")} aria-label="Open unpaid invoices" className="text-[#12384a]">
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
          <CardDescription className="text-sm text-[#365c6e]">Draft, sent, upcoming, and past due</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <CircleDollarSign className="size-5 text-[#007bb8]" />
            <span className="text-3xl font-bold tabular-nums text-[#063044]">{openInvoices.length}</span>
          </div>
          <p className="mt-1 text-sm text-[#365c6e]">{formatCompactCurrency(openBalance)}</p>
        </CardContent>
      </Card>

      <Card className="rounded-lg border-[#d6e0e7] shadow-none">
        <CardHeader className="pb-0">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-lg font-bold text-[#063044]">Due soon</CardTitle>
            <Link href={tabHref("unpaid")} aria-label="Open unpaid invoices due soon" className="text-[#12384a]">
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
          <CardDescription className="text-sm text-[#365c6e]">Balances due in the next 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <FileText className="size-5 text-[#007bb8]" />
            <span className="text-3xl font-bold tabular-nums text-[#063044]">{dueSoon.length}</span>
          </div>
          <p className="mt-1 text-sm text-[#365c6e]">{formatCompactCurrency(dueSoonBalance)}</p>
        </CardContent>
      </Card>

      <Card className="rounded-lg border-[#d6e0e7] shadow-none">
        <CardHeader className="pb-0">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-lg font-bold text-[#063044]">Needs attention</CardTitle>
            <Link href={tabHref("past_due")} aria-label="Open past due invoices" className="text-[#12384a]">
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
          <CardDescription className="text-sm text-[#365c6e]">Past due balances and drafts to send</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-3">
            <TriangleAlert className="size-5 text-[#d34a35]" />
            <span className="text-3xl font-bold tabular-nums text-[#063044]">{pastDue.length}</span>
          </div>
          <p className="text-sm text-[#365c6e]">{formatCompactCurrency(pastDueBalance)} past due</p>
          <div className="flex items-center gap-2 text-sm text-[#365c6e]">
            <Send className="size-4 text-[#007bb8]" />
            <span>
              {drafts.length} drafts, {formatCompactCurrency(draftValue)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
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
  const [invoices, allInvoices] = await Promise.all([
    getInvoices(profile.business_id, {
      search: params.q,
      status,
    }),
    getInvoices(profile.business_id),
  ]);

  return (
    <div className="w-full max-w-none space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Create invoices, track balances, and record manual payments.
          </p>
        </div>
        <Link href="/invoices/new" className={buttonVariants()}>
          <Plus className="size-4" />
          New Invoice
        </Link>
      </div>

      <InvoiceReportCards invoices={allInvoices} />

      <Card>
        <CardHeader>
          <CardTitle>Invoice Ledger</CardTitle>
          <CardDescription>
            Review unpaid, past due, and paid invoices across your active clients.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={status}>
            <TabsList>
              <TabsTrigger
                value="all"
                nativeButton={false}
                render={<Link href={tabHref("all", params.q)} />}
              >
                All
              </TabsTrigger>
              <TabsTrigger
                value="unpaid"
                nativeButton={false}
                render={<Link href={tabHref("unpaid", params.q)} />}
              >
                Unpaid
              </TabsTrigger>
              <TabsTrigger
                value="past_due"
                nativeButton={false}
                render={<Link href={tabHref("past_due", params.q)} />}
              >
                Past due
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <form className="flex flex-col gap-3 sm:flex-row" action="/invoices">
            <input type="hidden" name="status" value={status} />
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="Search invoice number"
                className="pl-8"
              />
            </div>
            <button className={buttonVariants({ variant: "outline" })} type="submit">
              Filter
            </button>
          </form>

          {invoices.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium text-gray-900">No invoices found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create an invoice or adjust the current filters.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Send</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <Link href={`/invoices/${invoice.id}`} className="font-medium hover:text-brand">
                        {invoice.invoice_number}
                      </Link>
                    </TableCell>
                    <TableCell>{clientName(invoice)}</TableCell>
                    <TableCell>{formatCurrency(invoice.total)}</TableCell>
                    <TableCell>{formatCurrency(invoice.amount_paid)}</TableCell>
                    <TableCell>{formatCurrency(invoice.balance)}</TableCell>
                    <TableCell>
                      <Badge className={statusClasses[invoice.status] ?? statusClasses.draft}>
                        {invoice.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(invoice.due_date)}</TableCell>
                    <TableCell className="text-right">
                      <InvoiceRowActions
                        invoiceId={invoice.id}
                        invoiceNumber={invoice.invoice_number}
                        clientId={invoice.clients?.id}
                        clientName={clientName(invoice)}
                        clientEmail={invoice.clients?.email}
                        clientPhone={invoice.clients?.phone}
                        total={invoice.total}
                        dueDate={invoice.due_date}
                      />
                    </TableCell>
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
