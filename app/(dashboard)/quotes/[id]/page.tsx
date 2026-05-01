import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ArrowLeft, CheckCircle, MapPin, UserRound, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getResend, getFromAddress, quoteEmailHtml } from "@/lib/resend";
import { SendEmailModal } from "@/components/shared/SendEmailModal";
import {
  addQuoteLineItem,
  convertQuoteToJob,
  decodeTeamFromNotes,
  encodeTeamInNotes,
  getQuote,
  getQuoteFormOptions,
  removeQuoteLineItem,
  updateQuote,
  updateQuoteStatus,
} from "@/lib/supabase/queries/quotes";
import { QuoteForm, type QuoteFormValues } from "@/components/quotes/QuoteForm";
import {
  QuoteLineItemsEditor,
  type QuoteLineItemFormValues,
} from "@/components/quotes/QuoteLineItemsEditor";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface QuoteDetailPageProps {
  params: Promise<{ id: string }>;
}

function formatCurrency(value: number | null) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value ?? 0);
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function clientName(quote: Awaited<ReturnType<typeof getQuote>>) {
  if (!quote?.clients) return "No client";
  const name = `${quote.clients.first_name} ${quote.clients.last_name}`;
  return quote.clients.company_name ? `${quote.clients.company_name} (${name})` : name;
}

function addressText(
  address: NonNullable<Awaited<ReturnType<typeof getQuote>>>["client_addresses"]
) {
  if (!address) return "No service address";
  return [address.street1, address.street2, address.city, address.state, address.zip]
    .filter(Boolean)
    .join(", ");
}

const statusClasses: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  expired: "bg-orange-100 text-orange-700",
  changes_requested: "bg-yellow-100 text-yellow-700",
};

export default async function QuoteDetailPage({ params }: QuoteDetailPageProps) {
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

  const [quote, options] = await Promise.all([
    getQuote(id, profile.business_id),
    getQuoteFormOptions(profile.business_id),
  ]);
  const { teamMembers } = options;

  if (!quote) notFound();

  const { data: business } = await supabase
    .from("businesses")
    .select("name")
    .eq("id", profile.business_id)
    .single();
  const businessName = business?.name ?? "";

  // Find associated job if quote is approved
  let associatedJobId: string | null = null;
  if (quote.status === "approved") {
    const { data: job } = await supabase
      .from("jobs")
      .select("id")
      .eq("quote_id", id)
      .eq("business_id", profile.business_id)
      .maybeSingle();
    associatedJobId = job?.id ?? null;
  }

  const isDraft = quote.status === "draft";
  const isSent = quote.status === "sent";

  const sortedLineItems = [...quote.quote_line_items].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );

  const { assignedUserId, assignedWage, assignedWageType, actualNotes } = decodeTeamFromNotes(quote.internal_notes);
  const assignedMember = teamMembers.find((m) => m.id === assignedUserId);

  const formDefaults: QuoteFormValues = {
    client_id: quote.client_id,
    address_id: quote.address_id ?? "",
    title: quote.title,
    frequency: (quote.frequency as QuoteFormValues["frequency"]) ?? "one_time",
    valid_until: quote.valid_until ?? "",
    message_to_client: quote.message_to_client ?? "",
    internal_notes: actualNotes ?? "",
    assigned_user_id: assignedUserId ?? "",
    assigned_wage: assignedWage ?? 0,
    assigned_wage_type: assignedWageType ?? "percent",
  };

  // --- Server Actions ---

  async function updateAction(values: QuoteFormValues) {
    "use server";

    const { assigned_user_id, assigned_wage, assigned_wage_type, internal_notes, ...rest } = values;
    const encodedNotes = encodeTeamInNotes(internal_notes, assigned_user_id, assigned_wage, assigned_wage_type);

    try {
      await updateQuote(id, { ...rest, internal_notes: encodedNotes });
      revalidatePath(`/quotes/${id}`);
      revalidatePath("/quotes");
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to update quote." };
    }
  }

  async function addLineItemAction(values: QuoteLineItemFormValues) {
    "use server";

    try {
      await addQuoteLineItem(id, values);
      revalidatePath(`/quotes/${id}`);
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to add line item." };
    }
  }

  async function removeLineItemAction(formData: FormData) {
    "use server";

    const lineItemId = String(formData.get("lineItemId") ?? "");
    if (!lineItemId) return;

    await removeQuoteLineItem(lineItemId);
    revalidatePath(`/quotes/${id}`);
  }

  async function sendAction() {
    "use server";

    if (!quote) {
      return { error: "Quote not found." };
    }

    if (!quote.clients?.email) {
      return { error: "Client has no email address." };
    }

    try {
      const resend = getResend();
      await resend.emails.send({
        from: getFromAddress(),
        to: quote.clients.email,
        subject: `Quote from ${businessName}: ${quote.title}`,
        html: quoteEmailHtml({
          businessName,
          clientName: `${quote.clients.first_name} ${quote.clients.last_name}`,
          quoteTitle: quote.title,
          totalAmount: formatCurrency(quote.total),
          validUntil: formatDate(quote.valid_until),
          message: quote.message_to_client ?? undefined,
        }),
      });
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to send quote email." };
    }

    try {
      await updateQuoteStatus(id, "sent");
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to update quote status." };
    }

    revalidatePath(`/quotes/${id}`);
    revalidatePath("/quotes");
  }

  async function approveAction() {
    "use server";

    let jobId: string;
    try {
      const job = await convertQuoteToJob(id);
      jobId = job.id;
    } catch {
      revalidatePath(`/quotes/${id}`);
      return;
    }

    revalidatePath("/jobs");
    revalidatePath("/quotes");
    revalidatePath(`/quotes/${id}`);
    redirect(`/jobs/${jobId}`);
  }

  async function declineAction() {
    "use server";

    try {
      await updateQuoteStatus(id, "declined");
    } catch {
      return;
    }

    revalidatePath(`/quotes/${id}`);
    revalidatePath("/quotes");
  }

  return (
    <div className="max-w-6xl space-y-6">
      <Link href="/quotes" className={buttonVariants({ variant: "ghost" })}>
        <ArrowLeft className="size-4" />
        Back to quotes
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{quote.title}</h1>
            <Badge className={statusClasses[quote.status] ?? statusClasses.draft}>
              {quote.status.replace("_", " ")}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{quote.quote_number}</p>
        </div>

        {/* Status-based action buttons */}
        <div className="flex flex-wrap gap-2">
          {isDraft && (
            <SendEmailModal
              clientEmail={quote.clients?.email ?? ""}
              clientName={`${quote.clients?.first_name ?? ""} ${quote.clients?.last_name ?? ""}`.trim()}
              subject={`Quote from ${businessName}: ${quote.title}`}
              bodyPreview={`You have a new quote for ${formatCurrency(quote.total)}, valid until ${formatDate(quote.valid_until)}.`}
              action={sendAction}
              label="Send to Client"
            />
          )}
          {isSent && (
            <>
              <form action={approveAction}>
                <button className={buttonVariants()} type="submit">
                  <CheckCircle className="size-4" />
                  Mark Approved
                </button>
              </form>
              <form action={declineAction}>
                <button
                  className={buttonVariants({ variant: "outline" })}
                  type="submit"
                >
                  <XCircle className="size-4" />
                  Mark Declined
                </button>
              </form>
            </>
          )}
          {quote.status === "approved" && associatedJobId && (
            <Link href={`/jobs/${associatedJobId}`} className={buttonVariants()}>
              View Job
            </Link>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Subtotal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(quote.subtotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(quote.total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Valid Until</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{formatDate(quote.valid_until)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Left column: quote info */}
        <Card>
          <CardHeader>
            <CardTitle>Quote Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <UserRound className="size-4 text-muted-foreground" />
              <Link
                href={`/clients/${quote.client_id}`}
                className="font-medium hover:text-brand"
              >
                {clientName(quote)}
              </Link>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 text-muted-foreground" />
              <span>{addressText(quote.client_addresses)}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <p className="text-muted-foreground">Frequency</p>
                <p className="font-medium text-gray-900">
                  {(quote.frequency ?? "one time").replace("_", " ")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Sent</p>
                <p className="font-medium text-gray-900">
                  {quote.sent_at
                    ? formatDate(quote.sent_at.split("T")[0])
                    : "Not sent"}
                </p>
              </div>
              {quote.approved_at && (
                <div>
                  <p className="text-muted-foreground">Approved</p>
                  <p className="font-medium text-gray-900">
                    {formatDate(quote.approved_at.split("T")[0])}
                  </p>
                </div>
              )}
            </div>
            {assignedMember && (
              <div className="border-t pt-3">
                <p className="text-muted-foreground mb-2">Assigned Team Member</p>
                <div className="flex items-center gap-2">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    {assignedMember.first_name[0]}{assignedMember.last_name[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {assignedMember.first_name} {assignedMember.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {assignedWage}{assignedWageType === "percent" ? "%" : "$"} wage
                    </p>
                  </div>
                </div>
              </div>
            )}
            {quote.message_to_client && (
              <div className="border-t pt-3">
                <p className="font-medium text-gray-900">Message to client</p>
                <p className="mt-1 text-muted-foreground">{quote.message_to_client}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column: line items + edit */}
        <div className="space-y-6">
          <Tabs defaultValue="line-items">
            <TabsList>
              <TabsTrigger value="line-items">Line Items</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="line-items">
              <Card>
                <CardHeader>
                  <CardTitle>Line Items</CardTitle>
                  <CardDescription>
                    {isDraft
                      ? "Add services and materials to price this quote."
                      : "Line items are locked once the quote is sent."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <QuoteLineItemsEditor
                    items={sortedLineItems}
                    addAction={addLineItemAction}
                    removeAction={removeLineItemAction}
                    readOnly={!isDraft}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes">
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">Message to client</p>
                    <p className="mt-1 text-muted-foreground">
                      {quote.message_to_client || "No message added."}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Internal notes</p>
                    <p className="mt-1 text-muted-foreground">
                      {actualNotes || "No internal notes."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {isDraft && (
            <Card id="edit">
              <CardHeader>
                <CardTitle>Edit Quote</CardTitle>
                <CardDescription>
                  Update client, scope, expiry, and messaging before sending.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <QuoteForm
                  clients={options.clients}
                  teamMembers={teamMembers}
                  defaultValues={formDefaults}
                  action={updateAction}
                  submitLabel="Update quote"
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
