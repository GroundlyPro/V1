import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, BriefcaseBusiness, CalendarClock, CircleHelp, Plus, UserRoundX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getJobReportStats,
  getJobs,
  updateJobAssignee,
  updateJobStatus,
  type JobFilters,
  type JobListItem,
  type JobReportStats,
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

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
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

function JobReportCards({ report }: { report: JobReportStats }) {
  const overviewItems: { label: string; status: JobStatus; value: number; color: string }[] = [
    { label: "Active", status: "active", value: report.overview.active, color: "bg-[#3f8f2f]" },
    {
      label: "In progress",
      status: "in_progress",
      value: report.overview.in_progress,
      color: "bg-[#007bb8]",
    },
    { label: "Completed", status: "completed", value: report.overview.completed, color: "bg-[#486778]" },
    { label: "Closed", status: "closed", value: report.overview.closed, color: "bg-[#6b7280]" },
    { label: "Cancelled", status: "cancelled", value: report.overview.cancelled, color: "bg-[#d34a35]" },
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
                key={item.status}
                href={`/jobs?status=${item.status}`}
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
            <CardTitle className="text-lg font-bold text-[#063044]">Open work</CardTitle>
            <div className="flex items-center gap-3 text-[#12384a]">
              <CircleHelp className="size-4" aria-label="Active and in-progress jobs" />
              <Link href="/jobs?status=active" aria-label="Open active jobs">
                <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </div>
          <CardDescription className="text-sm text-[#365c6e]">Active + in progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <BriefcaseBusiness className="size-5 text-[#007bb8]" />
            <span className="text-3xl font-bold tabular-nums text-[#063044]">{report.open.count}</span>
          </div>
          <p className="mt-1 text-sm text-[#365c6e]">{formatCompactCurrency(report.open.value)}</p>
        </CardContent>
      </Card>

      <Card className="rounded-lg border-[#d6e0e7] shadow-none">
        <CardHeader className="pb-0">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-lg font-bold text-[#063044]">Scheduled</CardTitle>
            <Link href="/schedule" aria-label="Open schedule" className="text-[#12384a]">
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
          <CardDescription className="text-sm text-[#365c6e]">Jobs with upcoming visits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <CalendarClock className="size-5 text-[#007bb8]" />
            <span className="text-3xl font-bold tabular-nums text-[#063044]">{report.scheduled.count}</span>
          </div>
          <p className="mt-1 text-sm text-[#365c6e]">{report.scheduled.next7Days} in next 7 days</p>
        </CardContent>
      </Card>

      <Card className="rounded-lg border-[#d6e0e7] shadow-none">
        <CardHeader className="pb-0">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-lg font-bold text-[#063044]">Needs assignment</CardTitle>
            <Link href="/jobs?assignedTo=unassigned" aria-label="Open unassigned jobs" className="text-[#12384a]">
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
          <CardDescription className="text-sm text-[#365c6e]">Open jobs without a team member</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <UserRoundX className="size-5 text-[#d34a35]" />
            <span className="text-3xl font-bold tabular-nums text-[#063044]">{report.unassigned.count}</span>
          </div>
          <p className="mt-1 text-sm text-[#365c6e]">
            {report.completed.count} completed, {formatCompactCurrency(report.completed.value)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
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
  const [{ data: teamMembers }, jobs, report] = await Promise.all([
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
    getJobReportStats(profile.business_id),
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

      <JobReportCards report={report} />

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
            <div className="overflow-x-auto">
              <Table className="min-w-[1440px] table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[190px]">Job</TableHead>
                    <TableHead className="w-[220px]">Client</TableHead>
                    <TableHead className="w-[320px]">Address</TableHead>
                    <TableHead className="w-[180px]">Assignee</TableHead>
                    <TableHead className="w-[170px]">Status</TableHead>
                    <TableHead className="w-[150px]">Created at</TableHead>
                    <TableHead className="w-[160px]">Next Visit</TableHead>
                    <TableHead className="w-[150px] text-right">Total Value</TableHead>
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
                        <div className="break-words text-sm text-[#1a2d3d]" title={clientName(job)}>
                          {clientName(job)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="line-clamp-2 break-words text-sm leading-5 text-[#4a6070]" title={addressText(job)}>
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
                      <TableCell className="text-right text-sm tabular-nums">
                        {formatCurrency(job.total_price)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
