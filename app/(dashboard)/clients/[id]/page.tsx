import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ArrowLeft, Edit, Mail, MapPin, Phone, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  addClientAddress,
  deleteClientAddress,
  getClient,
  updateClient,
} from "@/lib/supabase/queries/clients";
import { AddressForm, type AddressFormValues } from "@/components/clients/AddressForm";
import { ClientForm, type ClientFormValues } from "@/components/clients/ClientForm";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
}

function formatCurrency(value: number | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value ?? 0);
}

function addressText(address: {
  street1: string;
  street2: string | null;
  city: string;
  state: string;
  zip: string;
}) {
  return [address.street1, address.street2, address.city, address.state, address.zip]
    .filter(Boolean)
    .join(", ");
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  const date = value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatTime(value: string | null) {
  if (!value) return null;
  return value.slice(0, 5);
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

function userName(user: { first_name: string; last_name: string } | null | undefined) {
  if (!user) return null;
  return `${user.first_name} ${user.last_name}`.trim();
}

function jobSchedule(
  job: Awaited<ReturnType<typeof getClient>> extends infer T
    ? T extends { jobs: Array<infer J> }
      ? J
      : never
    : never
) {
  const datedVisits = job.job_visits
    .filter((visit) => visit.scheduled_date)
    .sort((a, b) => String(a.scheduled_date).localeCompare(String(b.scheduled_date)));
  const nextVisit = datedVisits[0];
  const date = nextVisit?.scheduled_date ?? job.start_date;
  const time = formatTime(nextVisit?.start_time ?? null);

  if (!date) return "Not scheduled";
  return time ? `${formatDate(date)} at ${time}` : formatDate(date);
}

function jobAssignedNames(
  job: Awaited<ReturnType<typeof getClient>> extends infer T
    ? T extends { jobs: Array<infer J> }
      ? J
      : never
    : never
) {
  const names = new Set<string>();
  for (const visit of job.job_visits) {
    for (const assignment of visit.visit_assignments) {
      const name = userName(assignment.users);
      if (name) names.add(name);
    }
  }

  return names.size > 0 ? Array.from(names).join(", ") : "Unassigned";
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
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

  const client = await getClient(id, profile.business_id);
  if (!client) notFound();

  const primaryAddress =
    client.client_addresses.find((address) => address.is_primary) ??
    client.client_addresses[0];

  const name = `${client.first_name} ${client.last_name}`;
  const formDefaults: ClientFormValues = {
    first_name: client.first_name,
    last_name: client.last_name,
    email: client.email ?? "",
    phone: client.phone ?? "",
    company_name: client.company_name ?? "",
    status: client.status as ClientFormValues["status"],
    type: client.type as ClientFormValues["type"],
    street: primaryAddress?.street1 ?? "",
    street2: primaryAddress?.street2 ?? "",
    city: primaryAddress?.city ?? "",
    state: primaryAddress?.state ?? "",
    zip: primaryAddress?.zip ?? "",
    notes: client.notes ?? "",
    tags: client.tags?.join(", ") ?? "",
  };

  async function updateAction(values: ClientFormValues) {
    "use server";

    try {
      await updateClient(id, values);
      revalidatePath(`/clients/${id}`);
      revalidatePath("/clients");
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Unable to update client.",
      };
    }
  }

  async function addAddressAction(values: AddressFormValues) {
    "use server";

    try {
      await addClientAddress(id, values);
      revalidatePath(`/clients/${id}`);
      revalidatePath("/clients");
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Unable to add address.",
      };
    }
  }

  async function deleteAddressAction(formData: FormData) {
    "use server";

    const addressId = String(formData.get("addressId") ?? "");
    if (!addressId) return;

    await deleteClientAddress(addressId);
    revalidatePath(`/clients/${id}`);
    revalidatePath("/clients");
  }

  return (
    <div className="max-w-6xl space-y-6">
      <Link href="/clients" className={buttonVariants({ variant: "ghost" })}>
        <ArrowLeft className="size-4" />
        Back to clients
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {client.company_name || name}
            </h1>
            <Badge>{client.status}</Badge>
          </div>
          {client.company_name && <p className="text-sm text-muted-foreground">{name}</p>}
          <p className="mt-1 text-sm text-muted-foreground">
            Balance {formatCurrency(client.balance)}
          </p>
        </div>
        <a href="#edit" className={buttonVariants({ variant: "outline" })}>
          <Edit className="size-4" />
          Edit
        </a>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="size-4 text-muted-foreground" />
                <span>{client.phone || "No phone"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-muted-foreground" />
                <span>{client.email || "No email"}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 text-muted-foreground" />
                <span>{primaryAddress ? addressText(primaryAddress) : "No address"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Addresses</CardTitle>
              <CardDescription>Primary addresses cannot be removed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {client.client_addresses.map((address) => (
                <div key={address.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">
                        {address.label || (address.is_primary ? "Primary" : "Service address")}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {addressText(address)}
                      </p>
                      <div className="mt-2 flex gap-2">
                        {address.is_primary && <Badge variant="secondary">Primary</Badge>}
                        {address.is_billing && <Badge variant="outline">Billing</Badge>}
                      </div>
                    </div>
                    {!address.is_primary && (
                      <form action={deleteAddressAction}>
                        <input type="hidden" name="addressId" value={address.id} />
                        <button
                          type="submit"
                          className={buttonVariants({ variant: "ghost", size: "icon" })}
                          aria-label="Remove address"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ))}

              <div className="rounded-lg border p-4">
                <AddressForm action={addAddressAction} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Tabs defaultValue="jobs">
            <TabsList className="h-auto flex-wrap justify-start">
              <TabsTrigger value="requests">Requests</TabsTrigger>
              <TabsTrigger value="quotes">Quotes</TabsTrigger>
              <TabsTrigger value="jobs">Jobs</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>
            <TabsContent value="requests">
              <Card>
                <CardHeader>
                  <CardTitle>Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  {client.requests.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No requests yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Request</TableHead>
                          <TableHead>Assigned</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Converted</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {client.requests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell>
                              <Link href={`/requests/${request.id}`} className="font-medium hover:text-brand">
                                {request.service_type || "Service request"}
                              </Link>
                              <p className="text-xs text-muted-foreground">
                                {[`${request.first_name} ${request.last_name}`, request.source].filter(Boolean).join(" - ")}
                              </p>
                            </TableCell>
                            <TableCell>{userName(request.users) ?? "Unassigned"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{formatStatus(request.status)}</Badge>
                            </TableCell>
                            <TableCell>{formatDate(request.created_at)}</TableCell>
                            <TableCell>
                              {request.converted_to_job_id
                                ? "Job"
                                : request.converted_to_quote_id
                                  ? "Quote"
                                  : "--"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="quotes">
              <Card>
                <CardHeader>
                  <CardTitle>Quotes</CardTitle>
                </CardHeader>
                <CardContent>
                  {client.quotes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No quotes yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Quote</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Sent</TableHead>
                          <TableHead>Valid Until</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {client.quotes.map((quote) => (
                          <TableRow key={quote.id}>
                            <TableCell>
                              <Link href={`/quotes/${quote.id}`} className="font-medium hover:text-brand">
                                {quote.title}
                              </Link>
                              <p className="text-xs text-muted-foreground">{quote.quote_number}</p>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{formatStatus(quote.status)}</Badge>
                            </TableCell>
                            <TableCell>{formatDate(quote.sent_at)}</TableCell>
                            <TableCell>{formatDate(quote.valid_until)}</TableCell>
                            <TableCell>{formatCurrency(quote.total)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="jobs">
              <Card>
                <CardHeader>
                  <CardTitle>Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                  {client.jobs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No jobs yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Job</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Assigned</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {client.jobs.map((job) => (
                          <TableRow key={job.id}>
                            <TableCell>
                              <Link href={`/jobs/${job.id}`} className="font-medium hover:text-brand">
                                {job.title}
                              </Link>
                              <p className="text-xs text-muted-foreground">
                                {[job.job_number, job.type, job.frequency].filter(Boolean).join(" - ")}
                              </p>
                            </TableCell>
                            <TableCell>{jobSchedule(job)}</TableCell>
                            <TableCell>{jobAssignedNames(job)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{formatStatus(job.status)}</Badge>
                            </TableCell>
                            <TableCell>{formatCurrency(job.total_price)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="invoices">
              <Card>
                <CardHeader>
                  <CardTitle>Invoices</CardTitle>
                </CardHeader>
                <CardContent>
                  {client.invoices.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No invoices yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Issued</TableHead>
                          <TableHead>Due</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {client.invoices.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell>
                              <Link
                                href={`/invoices/${invoice.id}`}
                                className="font-medium hover:text-brand"
                              >
                                {invoice.invoice_number}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{formatStatus(invoice.status)}</Badge>
                            </TableCell>
                            <TableCell>{formatDate(invoice.issue_date)}</TableCell>
                            <TableCell>{formatDate(invoice.due_date)}</TableCell>
                            <TableCell>{formatCurrency(invoice.total)}</TableCell>
                            <TableCell>{formatCurrency(invoice.balance)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="notes">
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {client.notes && <p className="text-sm text-gray-900">{client.notes}</p>}
                  {client.timeline_notes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No timeline notes yet.</p>
                  ) : (
                    client.timeline_notes.map((note) => (
                      <div key={note.id} className="rounded-lg border p-3 text-sm">
                        <p>{note.body}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{note.created_at}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card id="edit">
            <CardHeader>
              <CardTitle>Edit Client</CardTitle>
              <CardDescription>
                Updates the client record and current primary address.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ClientForm
                action={updateAction}
                defaultValues={formDefaults}
                submitLabel="Update client"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
