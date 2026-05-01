import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getJobs,
  updateJobAssignee,
  updateJobStatus,
  type JobFilters,
  type JobListItem,
  type JobStatus,
} from "@/lib/supabase/queries/jobs";
import { revalidatePath } from "next/cache";
import { buttonVariants } from "@/components/ui/button";
import { JobAssigneeSelect } from "@/components/jobs/JobAssigneeSelect";
import { JobsFilters } from "@/components/jobs/JobsFilters";
import { JobStatusSelect } from "@/components/jobs/JobStatusSelect";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface JobsPageProps {
  searchParams: Promise<{
    q?: string;
    status?: JobFilters["status"];
    assignedTo?: string;
    createdRange?: JobFilters["createdRange"];
    createdFrom?: string;
    createdTo?: string;
  }>;
}

function clientName(job: JobListItem) {
  if (!job.clients) return "No client";
  const name = `${job.clients.first_name} ${job.clients.last_name}`;
  return job.clients.company_name ? `${job.clients.company_name} (${name})` : name;
}

function formatCurrency(value: number | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value ?? 0);
}

function nextVisit(job: JobListItem) {
  const upcoming = job.job_visits
    .filter((visit) => visit.scheduled_date && visit.status !== "completed")
    .sort((a, b) => String(a.scheduled_date).localeCompare(String(b.scheduled_date)))[0];

  if (!upcoming?.scheduled_date) return "Not scheduled";

  const date = new Date(`${upcoming.scheduled_date}T00:00:00`);
  const formatted = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);

  return upcoming.start_time ? `${formatted} ${upcoming.start_time.slice(0, 5)}` : formatted;
}

function addressText(job: JobListItem) {
  const address = job.client_addresses;
  if (!address) return "No service address";
  return [address.street1, address.street2, address.city, address.state, address.zip]
    .filter(Boolean)
    .join(", ");
}

function primaryAssigneeId(job: JobListItem) {
  const sortedVisits = [...job.job_visits].sort((a, b) => {
    const aDate = a.scheduled_date ?? "";
    const bDate = b.scheduled_date ?? "";
    return String(aDate).localeCompare(String(bDate));
  });

  for (const visit of sortedVisits) {
    const assignedUser = (visit.visit_assignments ?? []).find((assignment) => assignment.users?.id)?.users;
    if (assignedUser?.id) return assignedUser.id;
  }

  return "unassigned";
}

function formatCreatedAt(value: string | null) {
  if (!value) return "Recently";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function JobsPage({ searchParams }: JobsPageProps) {
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
  const assignedTo = params.assignedTo ?? "all";
  const createdRange = params.createdRange ?? "all";
  const createdFrom = params.createdFrom ?? "";
  const createdTo = params.createdTo ?? "";
  const [{ data: teamMembers }, jobs] = await Promise.all([
    supabase
      .from("users")
      .select("id, first_name, last_name")
      .eq("business_id", profile.business_id)
      .eq("is_active", true)
      .order("first_name", { ascending: true }),
    getJobs(profile.business_id, {
      search: params.q,
      status,
      assignedTo,
      createdRange,
      createdFrom,
      createdTo,
    }),
  ]);

  async function updateStatusAction(jobId: string, nextStatus: JobStatus) {
    "use server";
    await updateJobStatus(jobId, nextStatus);
    revalidatePath("/jobs");
    revalidatePath(`/jobs/${jobId}`);
    revalidatePath("/home");
  }

  async function updateAssigneeAction(jobId: string, userId: string) {
    "use server";
    await updateJobAssignee(jobId, userId);
    revalidatePath("/jobs");
    revalidatePath(`/jobs/${jobId}`);
    revalidatePath("/home");
  }

  return (
    <div className="w-full max-w-none space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-sm text-muted-foreground">
            Track work orders, scheduled visits, service value, and client scope.
          </p>
        </div>
        <Link href="/jobs/new" className={buttonVariants()}>
          <Plus className="size-4" />
          New Job
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job Board</CardTitle>
          <CardDescription>
            Filter active work, review upcoming visits, and open full job records.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <JobsFilters
            teamMembers={teamMembers ?? []}
            initialValues={{
              q: params.q ?? "",
              status,
              assignedTo,
              createdRange,
              createdFrom,
              createdTo,
            }}
          />

          {jobs.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium text-gray-900">No jobs found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a job for a client or adjust the current filters.
              </p>
            </div>
          ) : (
            <Table className="min-w-[1120px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[14%]">Job</TableHead>
                  <TableHead className="w-[14%]">Client</TableHead>
                  <TableHead className="w-[18%]">Address</TableHead>
                  <TableHead className="w-[14%]">Assignee</TableHead>
                  <TableHead className="w-[14%]">Status</TableHead>
                  <TableHead className="w-[10%]">Created at</TableHead>
                  <TableHead className="w-[10%]">Next Visit</TableHead>
                  <TableHead className="w-[6%]">Total Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <Link href={`/jobs/${job.id}`} className="font-medium hover:text-brand">
                        {job.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">{job.job_number}</p>
                    </TableCell>
                    <TableCell>
                      <div className="truncate text-sm text-[#1a2d3d]" title={clientName(job)}>
                        {clientName(job)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="truncate text-sm text-[#4a6070]" title={addressText(job)}>
                        {addressText(job)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <JobAssigneeSelect
                        jobId={job.id}
                        assignedUserId={primaryAssigneeId(job)}
                        teamMembers={teamMembers ?? []}
                        disabled={job.job_visits.length === 0}
                        updateAction={updateAssigneeAction}
                      />
                    </TableCell>
                    <TableCell>
                      <JobStatusSelect
                        jobId={job.id}
                        status={job.status as JobStatus}
                        updateAction={updateStatusAction}
                      />
                    </TableCell>
                    <TableCell className="text-sm">{formatCreatedAt(job.created_at)}</TableCell>
                    <TableCell className="text-sm">{nextVisit(job)}</TableCell>
                    <TableCell className="text-sm">{formatCurrency(job.total_price)}</TableCell>
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
