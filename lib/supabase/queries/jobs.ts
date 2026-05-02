import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type ClientRow = Database["public"]["Tables"]["clients"]["Row"];
type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];
type AddressRow = Database["public"]["Tables"]["client_addresses"]["Row"];
type AddressInsert = Database["public"]["Tables"]["client_addresses"]["Insert"];
type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
type JobInsert = Database["public"]["Tables"]["jobs"]["Insert"];
type JobUpdate = Database["public"]["Tables"]["jobs"]["Update"];
type QuoteRow = Database["public"]["Tables"]["quotes"]["Row"];
type LineItemRow = Database["public"]["Tables"]["job_line_items"]["Row"];
type LineItemInsert = Database["public"]["Tables"]["job_line_items"]["Insert"];
type VisitRow = Database["public"]["Tables"]["job_visits"]["Row"];
type VisitInsert = Database["public"]["Tables"]["job_visits"]["Insert"];
type VisitUpdate = Database["public"]["Tables"]["job_visits"]["Update"];
type UserRow = Database["public"]["Tables"]["users"]["Row"];
type ServiceRow = Database["public"]["Tables"]["services"]["Row"];

export type JobStatus = "active" | "in_progress" | "completed" | "closed" | "cancelled";

export interface JobReportStats {
  overview: Record<JobStatus, number>;
  open: {
    count: number;
    value: number;
  };
  scheduled: {
    count: number;
    next7Days: number;
  };
  unassigned: {
    count: number;
  };
  completed: {
    count: number;
    value: number;
  };
}

export type JobListItem = JobRow & {
  clients: Pick<ClientRow, "id" | "first_name" | "last_name" | "company_name"> | null;
  client_addresses: Pick<
    AddressRow,
    "id" | "label" | "street1" | "street2" | "city" | "state" | "zip"
  > | null;
  job_visits: (Pick<VisitRow, "id" | "scheduled_date" | "start_time" | "status"> & {
    visit_assignments: {
      id: string;
      users: Pick<UserRow, "id" | "first_name" | "last_name"> | null;
    }[];
  })[];
};

export type JobDetail = JobRow & {
  clients: Pick<ClientRow, "id" | "first_name" | "last_name" | "company_name" | "phone" | "email"> | null;
  client_addresses: AddressRow | null;
  quotes: Pick<QuoteRow, "id" | "quote_number" | "title" | "status"> | null;
  job_line_items: LineItemRow[];
  job_visits: (VisitRow & {
    visit_assignments: {
      id: string;
      users: Pick<UserRow, "id" | "first_name" | "last_name" | "role"> | null;
    }[];
  })[];
};

export interface JobFilters {
  status?: "all" | JobStatus;
  search?: string;
  assignedTo?: string;
  createdRange?: "all" | "today" | "this_week" | "this_month" | "custom";
  createdFrom?: string;
  createdTo?: string;
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function toLocalDateString(date: Date) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function startOfWeek(date: Date) {
  const nextDate = new Date(date);
  const dayOfWeek = nextDate.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  nextDate.setDate(nextDate.getDate() + diffToMonday);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

export interface JobFormInput {
  customer_mode?: "existing" | "new";
  client_id?: string;
  address_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  zip?: string;
  title: string;
  type: "one_off" | "recurring";
  status: JobStatus;
  frequency?: "none" | "one_time" | "weekly" | "biweekly" | "monthly";
  start_date?: string;
  end_date?: string;
  billing_type: "on_completion" | "on_visit" | "custom";
  service_id?: string;
  service_name?: string;
  service_description?: string;
  quantity?: number;
  unit_cost?: number;
  unit_price?: number;
  wage_percentage?: number;
  schedule_visit?: boolean;
  visit_title?: string;
  scheduled_date?: string;
  start_time?: string;
  end_time?: string;
  assigned_user_id?: string;
  instructions?: string;
  internal_notes?: string;
  customer_note?: string;
}

export interface LineItemInput {
  name: string;
  description?: string;
  quantity: number;
  unit_cost: number;
  unit_price: number;
}

export interface VisitInput {
  title: string;
  scheduled_date?: string;
  start_time?: string;
  end_time?: string;
  instructions?: string;
  assigned_user_id?: string;
}

export type JobConfirmationAudience = "client" | "cleaner";

async function getMyProfile() {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: profile, error } = await supabase
    .from("users")
    .select("id, business_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!profile) throw new Error("Business profile not found");

  return { supabase, profile };
}

function buildReminderAt(
  scheduledDate: string | null | undefined,
  startTime: string | null | undefined,
  hoursBefore: number
) {
  if (!scheduledDate) return null;
  const normalizedTime = startTime && startTime.trim() ? startTime : "09:00:00";
  const visitAt = new Date(`${scheduledDate}T${normalizedTime}`);
  if (Number.isNaN(visitAt.getTime())) return null;
  return new Date(visitAt.getTime() - hoursBefore * 60 * 60 * 1000);
}

function formatReminderTime(scheduledDate: string | null | undefined, startTime: string | null | undefined) {
  if (!scheduledDate) return "the scheduled visit";
  return startTime ? `${scheduledDate} at ${startTime.slice(0, 5)}` : scheduledDate;
}

function clean(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toMoney(value: number | null | undefined) {
  return Number(value ?? 0);
}

async function recalculateJobTotals(
  supabase: Awaited<ReturnType<typeof createSupabaseClient>>,
  jobId: string,
  businessId: string
) {
  const { data: lineItems, error } = await supabase
    .from("job_line_items")
    .select("quantity, unit_cost, total")
    .eq("job_id", jobId)
    .eq("business_id", businessId);

  if (error) throw error;

  const totalPrice = (lineItems ?? []).reduce((sum, item) => sum + toMoney(item.total), 0);
  const totalCost = (lineItems ?? []).reduce(
    (sum, item) => sum + toMoney(item.quantity) * toMoney(item.unit_cost),
    0
  );
  const profit = totalPrice - totalCost;
  const profitMargin = totalPrice > 0 ? (profit / totalPrice) * 100 : 0;

  const { error: updateError } = await supabase
    .from("jobs")
    .update({
      total_price: totalPrice,
      total_cost: totalCost,
      profit,
      profit_margin: profitMargin,
    })
    .eq("id", jobId)
    .eq("business_id", businessId);

  if (updateError) throw updateError;
}

export async function getJobs(
  businessId: string,
  filters: JobFilters = {}
): Promise<JobListItem[]> {
  const supabase = await createSupabaseClient();
  let query = supabase
    .from("jobs")
    .select(
      `
      *,
      clients(id, first_name, last_name, company_name),
      client_addresses(id, label, street1, street2, city, state, zip),
      job_visits(id, scheduled_date, start_time, status, visit_assignments(id, users(id, first_name, last_name)))
    `
    )
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.search) {
    const search = filters.search.replaceAll("%", "").trim();
    if (search) {
      query = query.or(`title.ilike.%${search}%,job_number.ilike.%${search}%`);
    }
  }

  const { data, error } = await query;
  if (error) throw error;

  const jobs = (data ?? []) as JobListItem[];

  return jobs.filter((job) => {
    if (filters.assignedTo && filters.assignedTo !== "all") {
      const assignedUserIds = job.job_visits.flatMap((visit) =>
        (visit.visit_assignments ?? [])
          .map((assignment) => assignment.users?.id)
          .filter((value): value is string => Boolean(value))
      );

      if (filters.assignedTo === "unassigned") {
        if (assignedUserIds.length > 0) return false;
      } else if (!assignedUserIds.includes(filters.assignedTo)) {
        return false;
      }
    }

    if (filters.createdRange && filters.createdRange !== "all") {
      const createdDate = typeof job.created_at === "string" ? job.created_at.slice(0, 10) : "";
      const now = new Date();
      const today = toLocalDateString(now);
      const createdAtDate = createdDate ? new Date(`${createdDate}T00:00:00`) : null;

      if (filters.createdRange === "today" && createdDate !== today) return false;

      if (filters.createdRange === "this_week") {
        if (!createdAtDate) return false;
        const weekStart = startOfWeek(now);
        const endOfWeek = new Date(weekStart);
        endOfWeek.setDate(weekStart.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        if (createdAtDate < weekStart || createdAtDate > endOfWeek) return false;
      }

      if (filters.createdRange === "this_month") {
        if (!createdAtDate) return false;

        if (
          createdAtDate.getFullYear() !== now.getFullYear() ||
          createdAtDate.getMonth() !== now.getMonth()
        ) {
          return false;
        }
      }

      if (filters.createdRange === "custom") {
        if (!createdAtDate) return false;

        if (filters.createdFrom) {
          const fromDate = new Date(`${filters.createdFrom}T00:00:00`);
          if (createdAtDate < fromDate) return false;
        }

        if (filters.createdTo) {
          const toDate = new Date(`${filters.createdTo}T23:59:59.999`);
          if (createdAtDate > toDate) return false;
        }
      }
    }

    return true;
  });
}

export async function getJobReportStats(businessId: string): Promise<JobReportStats> {
  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("jobs")
    .select(
      `
      id,
      status,
      total_price,
      job_visits(id, scheduled_date, status, visit_assignments(id, users(id)))
    `
    )
    .eq("business_id", businessId);

  if (error) throw error;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  const stats: JobReportStats = {
    overview: {
      active: 0,
      in_progress: 0,
      completed: 0,
      closed: 0,
      cancelled: 0,
    },
    open: { count: 0, value: 0 },
    scheduled: { count: 0, next7Days: 0 },
    unassigned: { count: 0 },
    completed: { count: 0, value: 0 },
  };

  for (const job of data ?? []) {
    const status = job.status as JobStatus;
    const totalPrice = toMoney(job.total_price);
    const visits = job.job_visits ?? [];

    if (status in stats.overview) {
      stats.overview[status] += 1;
    }

    if (status === "active" || status === "in_progress") {
      stats.open.count += 1;
      stats.open.value += totalPrice;
    }

    if (status === "completed") {
      stats.completed.count += 1;
      stats.completed.value += totalPrice;
    }

    const scheduledVisits = visits.filter((visit) => visit.scheduled_date && visit.status !== "completed");
    if (scheduledVisits.length > 0) {
      stats.scheduled.count += 1;
    }

    if (
      scheduledVisits.some((visit) => {
        if (!visit.scheduled_date) return false;
        const scheduledDate = new Date(`${visit.scheduled_date}T00:00:00`);
        return scheduledDate >= today && scheduledDate <= nextWeek;
      })
    ) {
      stats.scheduled.next7Days += 1;
    }

    const assignedUserIds = visits.flatMap((visit) =>
      (visit.visit_assignments ?? [])
        .map((assignment) => assignment.users?.id)
        .filter((value): value is string => Boolean(value))
    );

    if ((status === "active" || status === "in_progress") && assignedUserIds.length === 0) {
      stats.unassigned.count += 1;
    }
  }

  return stats;
}

export async function getJob(id: string, businessId?: string): Promise<JobDetail | null> {
  const supabase = await createSupabaseClient();
  let query = supabase
    .from("jobs")
    .select(
      `
      *,
      clients(id, first_name, last_name, company_name, phone, email),
      client_addresses(*),
      quotes(id, quote_number, title, status),
      job_line_items(*),
      job_visits(*, visit_assignments(id, users(id, first_name, last_name, role)))
    `
    )
    .eq("id", id);

  if (businessId) {
    query = query.eq("business_id", businessId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;

  return data as JobDetail | null;
}

export async function getJobFormOptions(businessId: string) {
  const supabase = await createSupabaseClient();

  const [clientsResult, usersResult, servicesResult] = await Promise.all([
    supabase
      .from("clients")
      .select("id, first_name, last_name, company_name, client_addresses(*)")
      .eq("business_id", businessId)
      .order("last_name", { ascending: true }),
    supabase
      .from("users")
      .select("id, first_name, last_name, role")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .order("first_name", { ascending: true }),
    supabase
      .from("services")
      .select("id, name, description, category, unit_price, unit_cost, unit, is_active")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .order("name", { ascending: true }),
  ]);

  if (clientsResult.error) throw clientsResult.error;
  if (usersResult.error) throw usersResult.error;
  if (servicesResult.error) throw servicesResult.error;

  return {
    clients: clientsResult.data ?? [],
    teamMembers: usersResult.data ?? [],
    services: (servicesResult.data ?? []) as Pick<
      ServiceRow,
      "id" | "name" | "description" | "category" | "unit_price" | "unit_cost" | "unit" | "is_active"
    >[],
  };
}

export async function createJob(input: JobFormInput) {
  const { supabase, profile } = await getMyProfile();
  const businessId = profile.business_id;
  let clientId = input.client_id ?? "";
  let addressId = clean(input.address_id);

  if (input.customer_mode === "new") {
    const clientPayload: ClientInsert = {
      business_id: businessId,
      first_name: input.first_name?.trim() ?? "",
      last_name: input.last_name?.trim() ?? "",
      email: clean(input.email),
      phone: clean(input.phone),
      status: "active",
      type: "residential",
      notes: clean(input.customer_note),
    };

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .insert(clientPayload)
      .select("id")
      .single();

    if (clientError) throw clientError;
    clientId = client.id;

    const addressPayload: AddressInsert = {
      business_id: businessId,
      client_id: clientId,
      label: "Primary",
      street1: input.street1?.trim() ?? "",
      street2: clean(input.street2),
      city: input.city?.trim() ?? "",
      state: input.state?.trim() ?? "",
      zip: input.zip?.trim() ?? "",
      country: "US",
      is_primary: true,
      is_billing: true,
    };

    const { data: address, error: addressError } = await supabase
      .from("client_addresses")
      .insert(addressPayload)
      .select("id")
      .single();

    if (addressError) throw addressError;
    addressId = address.id;
  }

  const payload: JobInsert = {
    business_id: businessId,
    client_id: clientId,
    address_id: addressId,
    title: input.title.trim(),
    type: input.type,
    status: input.status,
    frequency: input.frequency && input.frequency !== "none" ? input.frequency : null,
    start_date: clean(input.start_date),
    end_date: clean(input.end_date),
    billing_type: input.billing_type,
    instructions: clean(input.instructions),
    internal_notes: clean(input.internal_notes),
    created_by: profile.id,
  };

  const { data, error } = await supabase.from("jobs").insert(payload).select().single();
  if (error) throw error;

  if (input.service_name?.trim()) {
    const quantity = Number(input.quantity || 1);
    const unitPrice = Number(input.unit_price || 0);
    const lineItemPayload: LineItemInsert = {
      job_id: data.id,
      business_id: businessId,
      service_id: clean(input.service_id),
      name: input.service_name.trim(),
      description: clean(input.service_description),
      quantity,
      unit_cost: Number(input.unit_cost || 0),
      unit_price: unitPrice,
      total: quantity * unitPrice,
      sort_order: 0,
    };

    const { error: lineItemError } = await supabase
      .from("job_line_items")
      .insert(lineItemPayload);

    if (lineItemError) throw lineItemError;
    await recalculateJobTotals(supabase, data.id, businessId);
  }

  if (input.schedule_visit && input.scheduled_date) {
    const visitPayload: VisitInsert = {
      job_id: data.id,
      business_id: businessId,
      title: input.visit_title?.trim() || input.title.trim(),
      instructions: clean(input.instructions),
      scheduled_date: clean(input.scheduled_date),
      start_time: clean(input.start_time),
      end_time: clean(input.end_time),
      status: "scheduled",
    };

    const { data: visit, error: visitError } = await supabase
      .from("job_visits")
      .insert(visitPayload)
      .select("id")
      .single();

    if (visitError) throw visitError;

    if (input.assigned_user_id && input.assigned_user_id !== "unassigned") {
      const { error: assignmentError } = await supabase.from("visit_assignments").insert({
        business_id: businessId,
        visit_id: visit.id,
        user_id: input.assigned_user_id,
      });

      if (assignmentError) throw assignmentError;
    }
  }

  return data;
}

export async function updateJob(id: string, input: JobFormInput) {
  const { supabase, profile } = await getMyProfile();

  const payload: JobUpdate = {
    client_id: input.client_id ?? "",
    address_id: clean(input.address_id),
    title: input.title.trim(),
    type: input.type,
    status: input.status,
    frequency: input.frequency && input.frequency !== "none" ? input.frequency : null,
    start_date: clean(input.start_date),
    end_date: clean(input.end_date),
    billing_type: input.billing_type,
    instructions: clean(input.instructions),
    internal_notes: clean(input.internal_notes),
  };

  const { error } = await supabase
    .from("jobs")
    .update(payload)
    .eq("id", id)
    .eq("business_id", profile.business_id);

  if (error) throw error;
}

export async function updateJobStatus(id: string, status: JobStatus) {
  const { supabase, profile } = await getMyProfile();

  const { error } = await supabase
    .from("jobs")
    .update({ status })
    .eq("id", id)
    .eq("business_id", profile.business_id);

  if (error) throw error;
}

export async function updateJobAssignee(id: string, userId: string) {
  const { supabase, profile } = await getMyProfile();

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, job_visits(id, scheduled_date, created_at)")
    .eq("id", id)
    .eq("business_id", profile.business_id)
    .maybeSingle();

  if (jobError) throw jobError;
  if (!job) throw new Error("Job not found");

  const primaryVisit = [...(job.job_visits ?? [])].sort((a, b) => {
    const aDate = a.scheduled_date ?? a.created_at ?? "";
    const bDate = b.scheduled_date ?? b.created_at ?? "";
    return String(aDate).localeCompare(String(bDate));
  })[0];

  if (!primaryVisit) {
    throw new Error("Schedule a visit before assigning this job.");
  }

  const { error: deleteError } = await supabase
    .from("visit_assignments")
    .delete()
    .eq("visit_id", primaryVisit.id)
    .eq("business_id", profile.business_id);

  if (deleteError) throw deleteError;

  if (userId && userId !== "unassigned") {
    const { error: insertError } = await supabase.from("visit_assignments").insert({
      business_id: profile.business_id,
      visit_id: primaryVisit.id,
      user_id: userId,
    });

    if (insertError) throw insertError;
  }
}

export async function addLineItem(jobId: string, input: LineItemInput) {
  const { supabase, profile } = await getMyProfile();
  const quantity = Number(input.quantity || 0);
  const unitPrice = Number(input.unit_price || 0);

  const payload: LineItemInsert = {
    job_id: jobId,
    business_id: profile.business_id,
    name: input.name.trim(),
    description: clean(input.description),
    quantity,
    unit_cost: Number(input.unit_cost || 0),
    unit_price: unitPrice,
    total: quantity * unitPrice,
  };

  const { error } = await supabase.from("job_line_items").insert(payload);
  if (error) throw error;

  await recalculateJobTotals(supabase, jobId, profile.business_id);
}

export async function removeLineItem(lineItemId: string) {
  const { supabase, profile } = await getMyProfile();

  const { data: lineItem, error: lookupError } = await supabase
    .from("job_line_items")
    .select("job_id")
    .eq("id", lineItemId)
    .eq("business_id", profile.business_id)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (!lineItem) return;

  const { error } = await supabase
    .from("job_line_items")
    .delete()
    .eq("id", lineItemId)
    .eq("business_id", profile.business_id);

  if (error) throw error;

  await recalculateJobTotals(supabase, lineItem.job_id, profile.business_id);
}

export async function createVisit(jobId: string, input: VisitInput) {
  const { supabase, profile } = await getMyProfile();

  const payload: VisitInsert = {
    job_id: jobId,
    business_id: profile.business_id,
    title: input.title.trim(),
    instructions: clean(input.instructions),
    scheduled_date: clean(input.scheduled_date),
    start_time: clean(input.start_time),
    end_time: clean(input.end_time),
    status: "scheduled",
  };

  const { data: visit, error } = await supabase
    .from("job_visits")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;

  if (input.assigned_user_id) {
    const { error: assignmentError } = await supabase.from("visit_assignments").insert({
      business_id: profile.business_id,
      visit_id: visit.id,
      user_id: input.assigned_user_id,
    });

    if (assignmentError) throw assignmentError;
  }

  return visit;
}

export async function updateVisit(visitId: string, input: Partial<VisitInput> & { status?: string }) {
  const { supabase, profile } = await getMyProfile();

  const payload: VisitUpdate = {
    title: input.title?.trim(),
    instructions: clean(input.instructions),
    scheduled_date: clean(input.scheduled_date),
    start_time: clean(input.start_time),
    end_time: clean(input.end_time),
    status: input.status,
  };

  const { error } = await supabase
    .from("job_visits")
    .update(payload)
    .eq("id", visitId)
    .eq("business_id", profile.business_id);

  if (error) throw error;
}

export async function deleteVisit(visitId: string) {
  const { supabase, profile } = await getMyProfile();
  const { error } = await supabase
    .from("job_visits")
    .delete()
    .eq("id", visitId)
    .eq("business_id", profile.business_id);
  if (error) throw error;
}

export async function sendJobConfirmation(jobId: string, audience: JobConfirmationAudience) {
  const { supabase, profile } = await getMyProfile();

  const [{ data: business, error: businessError }, { data: job, error: jobError }] = await Promise.all([
    supabase
      .from("businesses")
      .select("name, job_reminders_enabled, job_reminder_24h, job_reminder_1h")
      .eq("id", profile.business_id)
      .single(),
    supabase
      .from("jobs")
      .select(
        `
        id,
        title,
        client_id,
        clients(first_name, last_name, company_name, phone, email),
        job_visits(id, title, scheduled_date, start_time, visit_assignments(id, users(id, first_name, last_name, role)))
      `
      )
      .eq("id", jobId)
      .eq("business_id", profile.business_id)
      .single(),
  ]);

  if (businessError) throw businessError;
  if (jobError) throw jobError;

  const visitList = [...(job.job_visits ?? [])]
    .filter((visit) => Boolean(visit.scheduled_date))
    .sort((a, b) => String(a.scheduled_date ?? "").localeCompare(String(b.scheduled_date ?? "")));

  const firstVisit = visitList[0] ?? null;
  const assignedCleaner = visitList
    .flatMap((visit) => visit.visit_assignments ?? [])
    .map((assignment) => assignment.users)
    .find(Boolean);

  if (audience === "cleaner" && !assignedCleaner) {
    throw new Error("Assign a cleaner to a scheduled visit before sending the cleaner confirmation.");
  }

  const sentAt = new Date().toISOString();
  const sentColumn =
    audience === "client" ? "client_confirmation_sent_at" : "cleaner_confirmation_sent_at";

  const updatePayload = { [sentColumn]: sentAt } as Database["public"]["Tables"]["jobs"]["Update"];
  const { error: updateError } = await supabase
    .from("jobs")
    .update(updatePayload)
    .eq("id", jobId)
    .eq("business_id", profile.business_id);

  if (updateError) throw updateError;

  const recipientName =
    audience === "client"
      ? [job.clients?.first_name, job.clients?.last_name].filter(Boolean).join(" ").trim() || "Client"
      : [assignedCleaner?.first_name, assignedCleaner?.last_name].filter(Boolean).join(" ").trim() || "Cleaner";

  const confirmationBody =
    audience === "client"
      ? `Job booking confirmation prepared for ${recipientName} on ${formatReminderTime(firstVisit?.scheduled_date, firstVisit?.start_time)}.`
      : `Cleaner confirmation prepared for ${recipientName} on ${formatReminderTime(firstVisit?.scheduled_date, firstVisit?.start_time)}.`;

  const { error: notificationError } = await supabase.from("notifications").insert({
    business_id: profile.business_id,
    user_id: profile.id,
    type: audience === "client" ? "job_confirmation_client" : "job_confirmation_cleaner",
    title: audience === "client" ? "Client confirmation queued" : "Cleaner confirmation queued",
    body: confirmationBody,
    link: `/jobs/${jobId}`,
  });

  if (notificationError) throw notificationError;

  const remindersEnabled = business.job_reminders_enabled ?? true;
  if (!remindersEnabled || visitList.length === 0) return;

  const reminderRows: Database["public"]["Tables"]["reminders"]["Insert"][] = [];
  const now = Date.now();

  for (const visit of visitList) {
    const visitLabel = formatReminderTime(visit.scheduled_date, visit.start_time);
    const intervals = [
      { enabled: business.job_reminder_24h ?? true, hoursBefore: 24, label: "24-hour" },
      { enabled: business.job_reminder_1h ?? true, hoursBefore: 1, label: "1-hour" },
    ];

    for (const interval of intervals) {
      if (!interval.enabled) continue;
      const remindAt = buildReminderAt(visit.scheduled_date, visit.start_time, interval.hoursBefore);
      if (!remindAt || remindAt.getTime() <= now) continue;

      reminderRows.push({
        business_id: profile.business_id,
        entity_type: "job",
        entity_id: jobId,
        channel: "sms",
        remind_at: remindAt.toISOString(),
        message:
          audience === "client"
            ? `${interval.label} client reminder for ${job.title} on ${visitLabel}.`
            : `${interval.label} cleaner reminder for ${job.title} on ${visitLabel}.`,
      });
    }
  }

  if (reminderRows.length > 0) {
    const { error: reminderError } = await supabase.from("reminders").insert(reminderRows);
    if (reminderError) throw reminderError;
  }
}
