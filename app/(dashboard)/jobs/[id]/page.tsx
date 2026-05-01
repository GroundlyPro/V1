import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ArrowLeft, Edit, MapPin, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  addLineItem,
  createVisit,
  getJob,
  getJobFormOptions,
  removeLineItem,
  sendJobConfirmation,
  updateJob,
} from "@/lib/supabase/queries/jobs";
import { getLaborEntries, logTime, deleteLabor } from "@/lib/supabase/queries/labor";
import { getExpenses, addExpense, deleteExpense } from "@/lib/supabase/queries/expenses";
import { JobForm, type JobFormValues } from "@/components/jobs/JobForm";
import { LineItemsEditor, type LineItemFormValues } from "@/components/jobs/LineItemsEditor";
import { VisitCard } from "@/components/jobs/VisitCard";
import { VisitForm, type VisitFormValues } from "@/components/jobs/VisitForm";
import { LaborTab } from "@/components/jobs/LaborTab";
import { ExpensesTab } from "@/components/jobs/ExpensesTab";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LogTimeFormValues } from "@/components/jobs/LogTimeModal";
import type { AddExpenseFormValues } from "@/components/jobs/AddExpenseModal";
import { SendMessageModal } from "@/components/shared/SendMessageModal";

interface JobDetailPageProps {
  params: Promise<{ id: string }>;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function clientName(job: Awaited<ReturnType<typeof getJob>>) {
  if (!job?.clients) return "No client";
  const name = `${job.clients.first_name} ${job.clients.last_name}`;
  return job.clients.company_name ? `${job.clients.company_name} (${name})` : name;
}

function addressText(address: NonNullable<Awaited<ReturnType<typeof getJob>>>["client_addresses"]) {
  if (!address) return "No service address";
  return [address.street1, address.street2, address.city, address.state, address.zip]
    .filter(Boolean)
    .join(", ");
}

function formatDateTime(date: string | null | undefined, time: string | null | undefined) {
  if (!date) return "the scheduled visit";
  return time ? `${date} at ${time.slice(0, 5)}` : date;
}

const statusClasses: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-gray-100 text-gray-700",
  closed: "bg-slate-100 text-slate-700",
  cancelled: "bg-red-100 text-red-700",
};

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = await params;
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

  const [job, options, laborEntries, expenses] = await Promise.all([
    getJob(id, profile.business_id),
    getJobFormOptions(profile.business_id),
    getLaborEntries(id, profile.business_id),
    getExpenses(id, profile.business_id),
  ]);

  if (!job) notFound();

  const revenue = job.total_price ?? 0;
  const laborCost = laborEntries.reduce((sum, e) => sum + (e.total_cost ?? 0), 0);
  const materialCost = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const grossProfit = revenue - laborCost - materialCost;
  const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  const formDefaults: JobFormValues = {
    customer_mode: "existing",
    client_id: job.client_id,
    address_id: job.address_id ?? "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    street1: "",
    street2: "",
    city: "",
    state: "",
    zip: "",
    title: job.title,
    type: job.type as JobFormValues["type"],
    status: job.status as JobFormValues["status"],
    frequency: (job.frequency as JobFormValues["frequency"] | null) ?? "none",
    start_date: job.start_date ?? "",
    end_date: job.end_date ?? "",
    billing_type: (job.billing_type as JobFormValues["billing_type"] | null) ?? "on_completion",
    service_id: "",
    service_name: job.title,
    service_description: "",
    quantity: 1,
    unit_cost: 0,
    unit_price: 0,
    wage_percentage: 0,
    schedule_visit: false,
    visit_title: "",
    scheduled_date: "",
    start_time: "",
    end_time: "",
    assigned_user_id: "unassigned",
    instructions: job.instructions ?? "",
    internal_notes: job.internal_notes ?? "",
    customer_note: "",
  };

  async function updateAction(values: JobFormValues) {
    "use server";
    try {
      await updateJob(id, values);
      revalidatePath(`/jobs/${id}`);
      revalidatePath("/jobs");
      revalidatePath("/home");
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to update job." };
    }
  }

  async function addLineItemAction(values: LineItemFormValues) {
    "use server";
    try {
      await addLineItem(id, values);
      revalidatePath(`/jobs/${id}`);
      revalidatePath("/jobs");
      revalidatePath("/home");
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to add line item." };
    }
  }

  async function removeLineItemAction(formData: FormData) {
    "use server";
    const lineItemId = String(formData.get("lineItemId") ?? "");
    if (!lineItemId) return;
    await removeLineItem(lineItemId);
    revalidatePath(`/jobs/${id}`);
    revalidatePath("/jobs");
    revalidatePath("/home");
  }

  async function createVisitAction(values: VisitFormValues) {
    "use server";
    try {
      await createVisit(id, values);
      revalidatePath(`/jobs/${id}`);
      revalidatePath("/jobs");
      revalidatePath("/home");
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to schedule visit." };
    }
  }

  async function logTimeAction(values: LogTimeFormValues) {
    "use server";
    try {
      await logTime(id, values);
      revalidatePath(`/jobs/${id}`);
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to log time." };
    }
  }

  async function deleteLaborAction(formData: FormData) {
    "use server";
    const laborId = String(formData.get("laborId") ?? "");
    if (!laborId) return;
    await deleteLabor(laborId);
    revalidatePath(`/jobs/${id}`);
  }

  async function addExpenseAction(
    values: AddExpenseFormValues & { receipt_url?: string | null }
  ) {
    "use server";
    try {
      await addExpense(id, values);
      revalidatePath(`/jobs/${id}`);
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to add expense." };
    }
  }

  async function deleteExpenseAction(formData: FormData) {
    "use server";
    const expenseId = String(formData.get("expenseId") ?? "");
    if (!expenseId) return;
    await deleteExpense(expenseId);
    revalidatePath(`/jobs/${id}`);
  }

  const sortedVisits = [...job.job_visits].sort((a, b) =>
    String(a.scheduled_date ?? "").localeCompare(String(b.scheduled_date ?? ""))
  );
  const sortedLineItems = [...job.job_line_items].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );
  const firstScheduledVisit = sortedVisits.find((visit) => Boolean(visit.scheduled_date)) ?? null;
  const assignedCleaner = sortedVisits
    .flatMap((visit) => visit.visit_assignments ?? [])
    .map((assignment) => assignment.users)
    .find(Boolean);
  const clientDisplayName = clientName(job);
  const cleanerDisplayName = assignedCleaner
    ? `${assignedCleaner.first_name} ${assignedCleaner.last_name}`.trim()
    : "No cleaner assigned";

  async function sendToClientAction() {
    "use server";
    try {
      await sendJobConfirmation(id, "client");
      revalidatePath(`/jobs/${id}`);
      revalidatePath("/settings");
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to queue the client confirmation." };
    }
  }

  async function sendToCleanerAction() {
    "use server";
    try {
      await sendJobConfirmation(id, "cleaner");
      revalidatePath(`/jobs/${id}`);
      revalidatePath("/settings");
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to queue the cleaner confirmation." };
    }
  }

  return (
    <div className="max-w-6xl space-y-6">
      <Link href="/jobs" className={buttonVariants({ variant: "ghost" })}>
        <ArrowLeft className="size-4" />
        Back to jobs
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-[#1a2d3d]">{job.title}</h1>
            <Badge className={statusClasses[job.status] ?? statusClasses.active}>
              {job.status.replace("_", " ")}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-[#9baab8]">{job.job_number}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SendMessageModal
            recipientLabel="Client"
            recipientName={clientDisplayName}
            title="Send to Client"
            description="This is the booking confirmation structure for the customer. Delivery wiring can be connected later."
            messagePreview={`Booking confirmed for ${job.title} on ${formatDateTime(firstScheduledVisit?.scheduled_date, firstScheduledVisit?.start_time)}. If job reminders are enabled, 24-hour and 1-hour reminders will be queued automatically.`}
            action={sendToClientAction}
            label="Send to Client"
          />
          <SendMessageModal
            recipientLabel="Cleaner"
            recipientName={cleanerDisplayName}
            title="Send to Cleaner"
            description="This is the booking confirmation structure for the assigned cleaner. Delivery wiring can be connected later."
            messagePreview={`New job assigned: ${job.title} on ${formatDateTime(firstScheduledVisit?.scheduled_date, firstScheduledVisit?.start_time)}. If job reminders are enabled, 24-hour and 1-hour reminders will be queued automatically.`}
            action={sendToCleanerAction}
            label="Send to Cleaner"
          />
          <a href="#edit" className={buttonVariants({ variant: "outline" })}>
            <Edit className="size-4" />
            Edit
          </a>
        </div>
      </div>

      {/* Profitability summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="rounded-2xl border border-[#e4ecf3] bg-white shadow-[0_1px_4px_rgba(0,20,40,0.05)]">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#9baab8]">
              Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold tabular-nums text-[#1a2d3d]">
              {formatCurrency(revenue)}
            </p>
            <p className="mt-0.5 text-xs text-[#9baab8]">From line items</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-[#e4ecf3] bg-white shadow-[0_1px_4px_rgba(0,20,40,0.05)]">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#9baab8]">
              Labor
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold tabular-nums text-[#1a2d3d]">
              {formatCurrency(laborCost)}
            </p>
            <p className="mt-0.5 text-xs text-[#9baab8]">
              {laborEntries.reduce((s, e) => s + (e.hours ?? 0), 0)} hrs logged
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-[#e4ecf3] bg-white shadow-[0_1px_4px_rgba(0,20,40,0.05)]">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#9baab8]">
              Materials
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold tabular-nums text-[#1a2d3d]">
              {formatCurrency(materialCost)}
            </p>
            <p className="mt-0.5 text-xs text-[#9baab8]">
              {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-[#e4ecf3] bg-white shadow-[0_1px_4px_rgba(0,20,40,0.05)]">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#9baab8]">
              Gross Profit
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p
              className={`text-2xl font-bold tabular-nums ${grossProfit >= 0 ? "text-[#1a2d3d]" : "text-[#d32f2f]"}`}
            >
              {formatCurrency(grossProfit)}
            </p>
            <p className="mt-0.5 text-xs text-[#9baab8]">Revenue − labor − materials</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-[#e4ecf3] bg-white shadow-[0_1px_4px_rgba(0,20,40,0.05)]">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#9baab8]">
              Margin
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p
              className={`text-2xl font-bold tabular-nums ${margin >= 0 ? "text-[#1a2d3d]" : "text-[#d32f2f]"}`}
            >
              {margin.toFixed(1)}%
            </p>
            <p className="mt-0.5 text-xs text-[#9baab8]">Gross margin</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Job Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <UserRound className="size-4 text-[#9baab8]" />
                <Link href={`/clients/${job.client_id}`} className="font-medium hover:text-[#007bb8]">
                  {clientName(job)}
                </Link>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 text-[#9baab8]" />
                <span className="text-[#4a6070]">{addressText(job.client_addresses)}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <p className="text-[#9baab8]">Type</p>
                  <p className="font-medium text-[#1a2d3d]">{job.type.replace("_", "-")}</p>
                </div>
                <div>
                  <p className="text-[#9baab8]">Billing</p>
                  <p className="font-medium text-[#1a2d3d]">
                    {(job.billing_type ?? "on_completion").replace("_", " ")}
                  </p>
                </div>
                <div>
                  <p className="text-[#9baab8]">Start</p>
                  <p className="font-medium text-[#1a2d3d]">{job.start_date ?? "Not set"}</p>
                </div>
                <div>
                  <p className="text-[#9baab8]">Frequency</p>
                  <p className="font-medium text-[#1a2d3d]">
                    {(job.frequency ?? "none").replace("_", " ")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Visits</CardTitle>
              <CardDescription>Scheduled appointments for this job.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sortedVisits.length === 0 ? (
                <p className="text-sm text-[#9baab8]">No visits scheduled yet.</p>
              ) : (
                sortedVisits.map((visit) => <VisitCard key={visit.id} visit={visit} />)
              )}
              <VisitForm teamMembers={options.teamMembers} action={createVisitAction} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Tabs defaultValue="line-items">
            <TabsList>
              <TabsTrigger value="line-items">Line Items</TabsTrigger>
              <TabsTrigger value="labor">Labor</TabsTrigger>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="line-items">
              <Card>
                <CardHeader>
                  <CardTitle>Line Items</CardTitle>
                  <CardDescription>
                    Add services and materials to calculate job value and profit.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LineItemsEditor
                    items={sortedLineItems}
                    addAction={addLineItemAction}
                    removeAction={removeLineItemAction}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="labor">
              <LaborTab
                entries={laborEntries}
                teamMembers={options.teamMembers}
                logTimeAction={logTimeAction}
                deleteAction={deleteLaborAction}
              />
            </TabsContent>

            <TabsContent value="expenses">
              <ExpensesTab
                jobId={id}
                expenses={expenses}
                addAction={addExpenseAction}
                deleteAction={deleteExpenseAction}
              />
            </TabsContent>

            <TabsContent value="notes">
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <p className="font-medium text-[#1a2d3d]">Field instructions</p>
                    <p className="mt-1 text-[#4a6070]">
                      {job.instructions || "No field instructions."}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-[#1a2d3d]">Internal notes</p>
                    <p className="mt-1 text-[#4a6070]">
                      {job.internal_notes || "No internal notes."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card id="edit">
            <CardHeader>
              <CardTitle>Edit Job</CardTitle>
              <CardDescription>Update scope, status, address, and scheduling rules.</CardDescription>
            </CardHeader>
            <CardContent>
              <JobForm
                clients={options.clients}
                teamMembers={options.teamMembers}
                services={options.services}
                defaultValues={formDefaults}
                variant="compact"
                action={updateAction}
                submitLabel="Update job"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
