import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getJobs, type JobFilters, type JobListItem } from "@/lib/supabase/queries/jobs";
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

interface JobsPageProps {
  searchParams: Promise<{
    q?: string;
    status?: JobFilters["status"];
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

const statusClasses: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-gray-100 text-gray-700",
  closed: "bg-slate-100 text-slate-700",
  cancelled: "bg-red-100 text-red-700",
};

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
  const jobs = await getJobs(profile.business_id, {
    search: params.q,
    status,
  });

  return (
    <div className="max-w-6xl space-y-6">
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
          <form className="flex flex-col gap-3 sm:flex-row" action="/jobs">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="Search job title or number"
                className="pl-8"
              />
            </div>
            <Select name="status" defaultValue={status}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <button className={buttonVariants({ variant: "outline" })} type="submit">
              Filter
            </button>
          </form>

          {jobs.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium text-gray-900">No jobs found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a job for a client or adjust the current filters.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Next Visit</TableHead>
                  <TableHead>Total Value</TableHead>
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
                    <TableCell>{clientName(job)}</TableCell>
                    <TableCell>
                      <Badge className={statusClasses[job.status] ?? statusClasses.active}>
                        {job.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{nextVisit(job)}</TableCell>
                    <TableCell>{formatCurrency(job.total_price)}</TableCell>
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
