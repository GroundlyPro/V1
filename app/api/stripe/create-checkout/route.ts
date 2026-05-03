import { NextResponse } from "next/server";
import { z } from "zod";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  invoiceId: z.string().uuid(),
});

function formatClientName(client: {
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
}) {
  const name = `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim();
  return client.company_name || name || "Client";
}

export async function POST(request: Request) {
  const payload = schema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid invoice." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("business_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json({ error: "Business profile not found." }, { status: 403 });
  }

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("id, business_id, client_id, invoice_number, total, balance, status, clients(first_name, last_name, company_name, email)")
    .eq("id", payload.data.invoiceId)
    .eq("business_id", profile.business_id)
    .single();

  if (invoiceError) {
    return NextResponse.json({ error: invoiceError.message }, { status: 500 });
  }

  if (!invoice || invoice.status === "paid" || invoice.status === "void") {
    return NextResponse.json({ error: "Invoice is not payable." }, { status: 400 });
  }

  const balance = Number(invoice.balance ?? 0);

  if (balance <= 0) {
    return NextResponse.json({ error: "Invoice has no balance due." }, { status: 400 });
  }

  const stripe = getStripe();
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : new URL(request.url).origin);
  const client = Array.isArray(invoice.clients) ? invoice.clients[0] : invoice.clients;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card", "us_bank_account"],
    customer_email: client?.email ?? undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(balance * 100),
          product_data: {
            name: `Invoice ${invoice.invoice_number}`,
            description: formatClientName(client),
          },
        },
      },
    ],
    metadata: {
      invoice_id: invoice.id,
      business_id: invoice.business_id,
      client_id: invoice.client_id,
    },
    payment_intent_data: {
      metadata: {
        invoice_id: invoice.id,
        business_id: invoice.business_id,
        client_id: invoice.client_id,
      },
    },
    success_url: `${origin}/invoices/${invoice.id}?payment=success`,
    cancel_url: `${origin}/invoices/${invoice.id}?payment=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
