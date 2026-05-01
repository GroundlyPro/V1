import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getInvoice } from "@/lib/supabase/queries/invoices";
import { getResend, getFromAddress, invoiceEmailHtml } from "@/lib/resend";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { invoiceId?: string } | null;
  if (!body?.invoiceId) {
    return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("business_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const invoice = await getInvoice(body.invoiceId, profile.business_id);
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const clientEmail = invoice.clients?.email;
  if (!clientEmail) {
    return NextResponse.json({ error: "Client has no email address" }, { status: 422 });
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("name, email")
    .eq("id", profile.business_id)
    .single();

  const businessName = business?.name ?? "Your service provider";
  const clientName = invoice.clients
    ? `${invoice.clients.first_name} ${invoice.clients.last_name}`
    : "Valued Customer";

  const formatCurrency = (v: number | null) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v ?? 0);
  const formatDate = (v: string | null) => {
    if (!v) return "Not set";
    const d = v.includes("T") ? new Date(v) : new Date(`${v}T00:00:00`);
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);
  };

  try {
    const resend = getResend();
    await resend.emails.send({
      from: getFromAddress(),
      to: clientEmail,
      reply_to: business?.email ?? undefined,
      subject: `Invoice ${invoice.invoice_number} from ${businessName}`,
      html: invoiceEmailHtml({
        businessName,
        clientName,
        invoiceNumber: invoice.invoice_number ?? "",
        totalAmount: formatCurrency(invoice.total),
        dueDate: formatDate(invoice.due_date),
      }),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Email failed" },
      { status: 500 }
    );
  }

  const { error: updateError } = await supabase
    .from("invoices")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", body.invoiceId)
    .eq("business_id", profile.business_id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
