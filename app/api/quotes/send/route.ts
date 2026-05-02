import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getQuote } from "@/lib/supabase/queries/quotes";
import { quoteEmailHtml } from "@/lib/resend";
import { sendTransactionalEmail } from "@/lib/email";
import { dbConfigToEmailIntegrations } from "@/lib/integrations";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { quoteId?: string } | null;
  if (!body?.quoteId) {
    return NextResponse.json({ error: "quoteId is required" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("business_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const quote = await getQuote(body.quoteId, profile.business_id);
  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  const clientEmail = quote.clients?.email;
  if (!clientEmail) {
    return NextResponse.json({ error: "Client has no email address" }, { status: 422 });
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("name, email")
    .eq("id", profile.business_id)
    .single();

  const { data: bizIntegrations } = await supabase
    .from("businesses")
    .select("integrations_config")
    .eq("id", profile.business_id)
    .single<{ integrations_config: unknown }>();

  const businessName = business?.name ?? "Your service provider";
  const clientName = quote.clients
    ? `${quote.clients.first_name} ${quote.clients.last_name}`
    : "Valued Customer";

  const formatCurrency = (v: number | null) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v ?? 0);
  const formatDate = (v: string | null) => {
    if (!v) return "Not set";
    const d = v.includes("T") ? new Date(v) : new Date(`${v}T00:00:00`);
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);
  };

  const lineItems = quote.quote_line_items ?? [];
  const total = lineItems.reduce((sum, li) => sum + (li.unit_price ?? 0) * (li.quantity ?? 1), 0);

  try {
    await sendTransactionalEmail({
      businessName,
      to: clientEmail,
      replyTo: business?.email ?? undefined,
      subject: `Quote from ${businessName}: ${quote.title}`,
      html: quoteEmailHtml({
        businessName,
        clientName,
        quoteTitle: quote.title,
        totalAmount: formatCurrency(total),
        validUntil: formatDate(quote.valid_until ?? null),
        message: quote.message_to_client ?? undefined,
      }),
      integrations: dbConfigToEmailIntegrations(bizIntegrations?.integrations_config),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Email failed" },
      { status: 500 }
    );
  }

  const { error: updateError } = await supabase
    .from("quotes")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", body.quoteId)
    .eq("business_id", profile.business_id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
