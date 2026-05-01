import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getRequestFormOptions,
  getRequests,
  type RequestDateFilter,
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

function validStatus(value?: string): "all" | RequestStatus {
  return ["all", "new", "in_review", "converted", "declined"].includes(value ?? "")
    ? ((value ?? "all") as "all" | RequestStatus)
    : "all";
}

function validDate(value?: string): RequestDateFilter {
  return ["all", "today", "this_week", "this_month", "custom"].includes(value ?? "")
    ? ((value ?? "all") as RequestDateFilter)
    : "all";
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
  const { teamMembers } = await getRequestFormOptions(profile.business_id);
  const createdRange = validDate(params.createdRange);
  const assignedTo = params.assignedTo?.trim() ? params.assignedTo : "all";
  const createdFrom = params.createdFrom ?? "";
  const createdTo = params.createdTo ?? "";
  const requests = await getRequests(profile.business_id, {
    search: params.q,
    status,
    assignedTo,
    createdRange,
    createdFrom,
    createdTo,
  });

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

      <Card>
        <CardHeader>
          <CardTitle>Request Pipeline</CardTitle>
          <CardDescription>
            Review incoming requests, assign follow-up, and move them through the pipeline.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
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
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f8fbfd] hover:bg-[#f8fbfd]">
                  <TableHead className="px-4">Client</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead className="px-4 text-right">Details</TableHead>
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
