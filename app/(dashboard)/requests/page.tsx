import Link from "next/link";
import { redirect } from "next/navigation";
import { Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getRequests, type RequestFilter } from "@/lib/supabase/queries/requests";
import { RequestCard } from "@/components/requests/RequestCard";
import { buttonVariants } from "@/components/ui/button";

interface RequestsPageProps {
  searchParams: Promise<{ status?: string }>;
}

const filters: Array<{ label: string; value: RequestFilter }> = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "In review", value: "in_review" },
  { label: "Converted", value: "converted" },
  { label: "Declined", value: "declined" },
];

function validStatus(value?: string): RequestFilter {
  return filters.some((filter) => filter.value === value) ? (value as RequestFilter) : "all";
}

export default async function RequestsPage({ searchParams }: RequestsPageProps) {
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
  const status = validStatus(params.status);
  const requests = await getRequests(profile.business_id, { status });

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review new booking widget leads and convert qualified requests into quotes.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/requests/new" className={buttonVariants()}>
            New Request
          </Link>
          <Link href="/booking/plum-landscaping" className={buttonVariants({ variant: "outline" })}>
            View booking widget
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Link
            key={filter.value}
            href={filter.value === "all" ? "/requests" : `/requests?status=${filter.value}`}
            className={buttonVariants({
              variant: status === filter.value ? "default" : "outline",
              size: "sm",
            })}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {requests.length > 0 ? (
        <div className="space-y-3">
          {requests.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      ) : (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed bg-white p-8 text-center">
          <Inbox className="size-10 text-muted-foreground" />
          <h2 className="mt-3 font-semibold text-gray-900">No requests found</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Requests submitted through the booking widget will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
