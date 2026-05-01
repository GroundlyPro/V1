import Link from "next/link";
import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { globalSearch } from "@/lib/supabase/queries/search";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

const typeLabels = {
  client: "Client",
  job: "Job",
  quote: "Quote",
  invoice: "Invoice",
  request: "Request",
} as const;

const typeClasses = {
  client: "bg-slate-100 text-slate-700",
  job: "bg-blue-100 text-blue-700",
  quote: "bg-purple-100 text-purple-700",
  invoice: "bg-cyan-100 text-cyan-700",
  request: "bg-orange-100 text-orange-700",
} as const;

export default async function SearchPage({ searchParams }: SearchPageProps) {
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
  const query = params.q?.trim() ?? "";
  const results = query ? await globalSearch(profile.business_id, query) : [];

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Search</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {query ? `Results for "${query}"` : "Search clients, jobs, quotes, invoices, and requests."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="size-5 text-muted-foreground" />
            Global Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!query ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Type a search term in the top bar and press Enter.
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium text-gray-900">No results found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a client name, job number, invoice number, quote title, or request service.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {results.map((result) => (
                <Link
                  key={`${result.type}-${result.id}`}
                  href={result.href}
                  className="flex flex-col gap-2 py-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 px-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={typeClasses[result.type]}>
                        {typeLabels[result.type]}
                      </Badge>
                      {result.status ? (
                        <span className="text-xs text-muted-foreground">
                          {result.status.replace("_", " ")}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 font-medium text-gray-900">{result.title}</p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {result.subtitle || typeLabels[result.type]}
                    </p>
                  </div>
                  <span className="px-2 text-sm font-medium text-primary">Open</span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
