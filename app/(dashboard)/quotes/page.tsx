import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getQuotes, type QuoteFilters, type QuoteListItem } from "@/lib/supabase/queries/quotes";
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
  const quotes = await getQuotes(profile.business_id, {
    search: params.q,
    status,
  });

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
