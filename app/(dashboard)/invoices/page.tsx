import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getInvoices,
  type InvoiceFilter,
  type InvoiceListItem,
} from "@/lib/supabase/queries/invoices";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

function tabHref(status: InvoiceFilter, q?: string) {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (q) params.set("q", q);
  const query = params.toString();
  return query ? `/invoices?${query}` : "/invoices";
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
  const invoices = await getInvoices(profile.business_id, {
    search: params.q,
    status,
  });

  return (
    <div className="max-w-6xl space-y-6">
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
