import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, Plus, Search, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getClients, type ClientFilters } from "@/lib/supabase/queries/clients";
import { ClientCard } from "@/components/clients/ClientCard";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ClientsPageProps {
  searchParams: Promise<{
    q?: string;
    status?: ClientFilters["status"];
  }>;
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
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
  const exportParams = new URLSearchParams();
  if (params.q) exportParams.set("q", params.q);
  if (status && status !== "all") exportParams.set("status", status);
  const clients = await getClients(profile.business_id, {
    search: params.q,
    status,
  });

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-muted-foreground">
            Manage customer records, addresses, and service history.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/clients/import" className={buttonVariants({ variant: "outline" })}>
            <Upload className="size-4" />
            Import
          </Link>
          <Link
            href={`/api/clients/export${exportParams.size > 0 ? `?${exportParams.toString()}` : ""}`}
            className={buttonVariants({ variant: "outline" })}
          >
            <Download className="size-4" />
            Export
          </Link>
          <Link href="/clients/new" className={buttonVariants()}>
            <Plus className="size-4" />
            New Client
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client Directory</CardTitle>
          <CardDescription>
            Search by name, company, or email and filter by current relationship.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="flex flex-col gap-3 sm:flex-row" action="/clients">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="Search clients"
                className="pl-8"
              />
            </div>
            <select
              name="status"
              defaultValue={status}
              className="h-8 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-44"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="lead">Lead</option>
              <option value="inactive">Inactive</option>
            </select>
            <button className={buttonVariants({ variant: "outline" })} type="submit">
              Filter
            </button>
          </form>

          {clients.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium text-gray-900">No clients found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add your first client or adjust the current filters.
              </p>
            </div>
          ) : (
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[20%]">Name</TableHead>
                  <TableHead className="w-[24%]">Contact</TableHead>
                  <TableHead className="w-[28%]">Primary Address</TableHead>
                  <TableHead className="w-[12%]">Created at</TableHead>
                  <TableHead className="w-[12%]">Status</TableHead>
                  <TableHead className="w-[4%]">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <ClientCard key={client.id} client={client} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
