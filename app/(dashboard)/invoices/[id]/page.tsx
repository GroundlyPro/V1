import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ArrowLeft, BriefcaseBusiness, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getInvoice,
  recordPayment,
  sendInvoice,
} from "@/lib/supabase/queries/invoices";
import { getResend, getFromAddress, invoiceEmailHtml } from "@/lib/resend";
import { PaymentLinkButton } from "@/components/invoices/PaymentLinkButton";
import { RecordPaymentModal, type PaymentFormValues } from "@/components/invoices/RecordPaymentModal";
import { SendEmailModal } from "@/components/shared/SendEmailModal";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>;
}

function formatCurrency(value: number | null) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value ?? 0);
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

function clientName(invoice: Awaited<ReturnType<typeof getInvoice>>) {
  if (!invoice?.clients) return "No client";
  const name = `${invoice.clients.first_name} ${invoice.clients.last_name}`;
  return invoice.clients.company_name ? `${invoice.clients.company_name} (${name})` : name;
}

const statusClasses: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  upcoming: "bg-cyan-100 text-cyan-700",
  past_due: "bg-red-100 text-red-700",
  paid: "bg-green-100 text-green-700",
  void: "bg-slate-100 text-slate-700",
};

const methodLabels: Record<string, string> = {
  cash: "Cash",
  check: "Check",
  ach: "Bank transfer",
  card: "Card",
};

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
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

  const invoice = await getInvoice(id, profile.business_id);
  if (!invoice) notFound();

  const { data: business } = await supabase
    .from("businesses")
    .select("name")
    .eq("id", profile.business_id)
    .single();
  const businessName = business?.name ?? "";

  const lineItems = [...invoice.invoice_line_items].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );
  const payments = [...invoice.payments].sort(
    (a, b) => String(b.paid_at).localeCompare(String(a.paid_at))
  );
  const balance = Number(invoice.balance ?? 0);

  async function recordPaymentAction(values: PaymentFormValues) {
    "use server";

    try {
      await recordPayment(id, values);
      revalidatePath(`/invoices/${id}`);
      revalidatePath("/invoices");
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to record payment." };
    }
  }

  async function sendAction() {
    "use server";

    if (!invoice) {
      return { error: "Invoice not found." };
    }

    if (invoice.clients?.email) {
      try {
        const resend = getResend();
        await resend.emails.send({
          from: getFromAddress(),
          to: invoice.clients.email,
          subject: `Invoice ${invoice.invoice_number} from ${businessName}`,
          html: invoiceEmailHtml({
            businessName,
            clientName: `${invoice.clients.first_name} ${invoice.clients.last_name}`,
            invoiceNumber: invoice.invoice_number ?? "",
            totalAmount: formatCurrency(invoice.total),
            dueDate: formatDate(invoice.due_date),
          }),
        });
      } catch {
        // Email failure should not block status update
      }
    }

    try {
      await sendInvoice(id);
    } catch {
      return;
    }

    revalidatePath(`/invoices/${id}`);
    revalidatePath("/invoices");
  }

  return (
    <div className="max-w-6xl space-y-6">
      <Link href="/invoices" className={buttonVariants({ variant: "ghost" })}>
        <ArrowLeft className="size-4" />
        Back to invoices
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{invoice.invoice_number}</h1>
            <Badge className={statusClasses[invoice.status] ?? statusClasses.draft}>
              {invoice.status.replace("_", " ")}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Issued {formatDate(invoice.issue_date)} - Due {formatDate(invoice.due_date)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {invoice.status !== "paid" && invoice.status !== "void" && (
            <>
              <PaymentLinkButton invoiceId={invoice.id} />
              <RecordPaymentModal balance={balance} action={recordPaymentAction} />
            </>
          )}
          {invoice.status === "draft" && (
            <SendEmailModal
              clientEmail={invoice.clients?.email ?? ""}
              clientName={`${invoice.clients?.first_name ?? ""} ${invoice.clients?.last_name ?? ""}`.trim()}
              subject={`Invoice ${invoice.invoice_number} from ${businessName}`}
              bodyPreview={`You have a new invoice for ${formatCurrency(invoice.total)}, due ${formatDate(invoice.due_date)}.`}
              action={sendAction}
              label="Send Invoice"
            />
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(invoice.total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(invoice.amount_paid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(invoice.balance)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Due Date</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{formatDate(invoice.due_date)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Invoice Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <UserRound className="size-4 text-muted-foreground" />
              <Link href={`/clients/${invoice.client_id}`} className="font-medium hover:text-brand">
                {clientName(invoice)}
              </Link>
            </div>
            {invoice.jobs && (
              <div className="flex items-center gap-2">
                <BriefcaseBusiness className="size-4 text-muted-foreground" />
                <Link href={`/jobs/${invoice.jobs.id}`} className="font-medium hover:text-brand">
                  {invoice.jobs.title}
                </Link>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <p className="text-muted-foreground">Sent</p>
                <p className="font-medium text-gray-900">{formatDate(invoice.sent_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Paid</p>
                <p className="font-medium text-gray-900">{formatDate(invoice.paid_at)}</p>
              </div>
            </div>
            {invoice.notes && (
              <div className="border-t pt-3">
                <p className="font-medium text-gray-900">Notes</p>
                <p className="mt-1 text-muted-foreground">{invoice.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
              <CardDescription>Billable services and materials on this invoice.</CardDescription>
            </CardHeader>
            <CardContent>
              {lineItems.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No line items.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <p className="font-medium text-gray-900">{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          )}
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell>{formatCurrency(item.total)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-medium">
                        Total
                      </TableCell>
                      <TableCell className="font-semibold">{formatCurrency(invoice.total)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>Manual and online payments recorded for this invoice.</CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No payments recorded.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDate(payment.paid_at)}</TableCell>
                        <TableCell>{methodLabels[payment.method] ?? payment.method}</TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-700">
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{payment.notes || "None"}</TableCell>
                        <TableCell>{formatCurrency(payment.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
