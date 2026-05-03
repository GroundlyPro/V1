import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ArrowUpRight, CircleHelp, Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getRequestDashboardStats,
  getRequestFormOptions,
  getRequests,
  type RequestDashboardStats,
  type RequestDateFilter,
  type RequestFilter,
  type RequestStatus,
  updateRequestAssignee,
  updateRequestStatus,
} from "@/lib/supabase/queries/requests";
import { RequestCard } from "@/components/requests/RequestCard";
import { RequestsFilters } from "@/components/requests/RequestsFilters";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface RequestsPageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    assignedTo?: string;
    createdRange?: string;
    createdFrom?: string;
    createdTo?: string;
  }>;
}

function validStatus(value?: string): RequestFilter {
  return ["all", "open", "new", "in_review", "converted", "declined"].includes(value ?? "")
    ? ((value ?? "all") as RequestFilter)
    : "all";
}

function validDate(value?: string): RequestDateFilter {
  return ["all", "today", "this_week", "this_month", "past_30_days", "custom"].includes(value ?? "")
    ? ((value ?? "all") as RequestDateFilter)
    : "all";
}

function requestsHref(
  overrides: Partial<{
    q: string;
    status: RequestFilter;
    assignedTo: string;
    createdRange: RequestDateFilter;
    createdFrom: string;
    createdTo: string;
  }>
) {
  const params = new URLSearchParams();
  const values = {
    q: "",
    status: "all" as RequestFilter,
    assignedTo: "all",
    createdRange: "all" as RequestDateFilter,
    createdFrom: "",
    createdTo: "",
    ...overrides,
  };

  if (values.q.trim()) params.set("q", values.q.trim());
  if (values.status !== "all") params.set("status", values.status);
  if (values.assignedTo !== "all") params.set("assignedTo", values.assignedTo);
  if (values.createdRange !== "all") params.set("createdRange", values.createdRange);
  if (values.createdRange === "custom") {
    if (values.createdFrom) params.set("createdFrom", values.createdFrom);
    if (values.createdTo) params.set("createdTo", values.createdTo);
  }

  const query = params.toString();
  return query ? `/requests?${query}` : "/requests";
}

function DeltaPill({ value, suffix = "" }: { value: number; suffix?: string }) {
  const positive = value > 0;
  const negative = value < 0;
  return (
    <span
      className={`rounded-full px-3 py-1 text-sm font-medium ${
        positive
          ? "bg-[#e7f3e1] text-[#1f6f2a]"
          : negative
            ? "bg-[#fde9e6] text-[#b42318]"
            : "bg-[#eef3f6] text-[#063044]"
      }`}
    >
      {positive ? "↑ " : negative ? "↓ " : ""}
      {Math.abs(value)}
      {suffix}
    </span>
  );
}

function RequestDashboardCards({ stats }: { stats: RequestDashboardStats }) {
  const overviewItems = [
    { label: "New", value: stats.overview.new, status: "new" as const, color: "bg-[#3b9bdd]" },
    { label: "In review", value: stats.overview.in_review, status: "in_review" as const, color: "bg-[#2f7d32]" },
    { label: "Converted", value: stats.overview.converted, status: "converted" as const, color: "bg-[#d8ad22]" },
    { label: "Declined", value: stats.overview.declined, status: "declined" as const, color: "bg-[#d34a35]" },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Card className="rounded-lg border-[#d6e0e7] shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold text-[#063044]">Overview</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-1.5 text-sm text-[#063044]">
            {overviewItems.map((item) => (
              <Link
                key={item.label}
                href={requestsHref({ status: item.status })}
                className="flex items-center gap-2 hover:text-brand"
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
            <CardTitle className="text-lg font-bold text-[#063044]">New requests</CardTitle>
            <Link
              href={requestsHref({ createdRange: "past_30_days" })}
              aria-label="Open requests created in the past 30 days"
              className="text-[#12384a]"
            >
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
          <CardDescription className="text-sm text-[#365c6e]">Past 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold tabular-nums text-[#063044]">
              {stats.newRequests.count}
            </span>
            <DeltaPill value={stats.newRequests.delta} suffix="%" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg border-[#d6e0e7] shadow-none">
        <CardHeader className="pb-0">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg font-bold text-[#063044]">Conversion rate</CardTitle>
            <CircleHelp className="mt-0.5 size-4 text-[#12384a]" aria-label="Converted requests divided by requests created in the past 30 days" />
          </div>
          <CardDescription className="text-sm text-[#365c6e]">Past 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold tabular-nums text-[#063044]">
              {stats.conversionRate.value}%
            </span>
            <DeltaPill value={stats.conversionRate.delta} suffix="%" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg border-[#d6e0e7] shadow-none">
        <CardHeader className="pb-0">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-lg font-bold text-[#063044]">Needs follow-up</CardTitle>
            <Link
              href={requestsHref({ status: "open", assignedTo: "unassigned" })}
              aria-label="Open unassigned requests"
              className="text-[#12384a]"
            >
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
          <CardDescription className="text-sm text-[#365c6e]">Unassigned open requests</CardDescription>
        </CardHeader>
        <CardContent>
          <span className="text-3xl font-bold tabular-nums text-[#063044]">{stats.unassignedOpen}</span>
        </CardContent>
      </Card>
    </div>
  );
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
  const createdRange = validDate(params.createdRange);
  const assignedTo = params.assignedTo?.trim() ? params.assignedTo : "all";
  const createdFrom = params.createdFrom ?? "";
  const createdTo = params.createdTo ?? "";
  const [{ teamMembers }, requests, stats] = await Promise.all([
    getRequestFormOptions(profile.business_id),
    getRequests(profile.business_id, {
      search: params.q,
      status,
      assignedTo,
      createdRange,
      createdFrom,
      createdTo,
    }),
    getRequestDashboardStats(profile.business_id),
  ]);

  async function updateStatusAction(id: string, nextStatus: RequestStatus) {
    "use server";

    await updateRequestStatus(id, nextStatus);
    revalidatePath("/requests");
    revalidatePath(`/requests/${id}`);
  }

  async function updateAssigneeAction(id: string, assignedTo: string) {
    "use server";

    await updateRequestAssignee(id, assignedTo);
    revalidatePath("/requests");
    revalidatePath(`/requests/${id}`);
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-normal text-[#063044]">Requests</h1>
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

      <RequestDashboardCards stats={stats} />

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-[#063044]">
            All requests{" "}
            <span className="text-base font-normal text-[#365c6e]">
              ({requests.length} {requests.length === 1 ? "result" : "results"})
            </span>
          </CardTitle>
          <CardDescription className="text-sm text-[#365c6e]">
            Review incoming requests, assign follow-up, and move them through the pipeline.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RequestsFilters
            teamMembers={teamMembers}
            initialValues={{
              q: params.q ?? "",
              status,
              assignedTo,
              createdRange,
              createdFrom,
              createdTo,
            }}
          />

          {requests.length > 0 ? (
            <Table className="min-w-[1040px] table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[22%]">Client</TableHead>
                  <TableHead className="w-[25%]">Address</TableHead>
                  <TableHead className="w-[12%] whitespace-nowrap">Created</TableHead>
                  <TableHead className="w-[16%]">Status</TableHead>
                  <TableHead className="w-[18%]">Assignee</TableHead>
                  <TableHead className="w-[7%] min-w-24 whitespace-nowrap text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    teamMembers={teamMembers}
                    updateStatusAction={updateStatusAction}
                    updateAssigneeAction={updateAssigneeAction}
                  />
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed bg-white p-8 text-center">
              <Inbox className="size-10 text-muted-foreground" />
              <h2 className="mt-3 font-semibold text-gray-900">No requests found</h2>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Adjust the current filters or wait for new requests to appear.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
