import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe";
import type { Database } from "@/lib/supabase/types";

function getPaymentMethod(paymentIntent: Stripe.PaymentIntent) {
  return paymentIntent.payment_method_types.includes("us_bank_account") ? "ach" : "card";
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, getStripeWebhookSecret());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid Stripe webhook." },
      { status: 400 }
    );
  }

  if (event.type !== "payment_intent.succeeded") {
    return NextResponse.json({ received: true });
  }

  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const invoiceId = paymentIntent.metadata.invoice_id;
  const businessId = paymentIntent.metadata.business_id;
  const clientId = paymentIntent.metadata.client_id;

  if (!invoiceId || !businessId || !clientId) {
    return NextResponse.json({ error: "Missing payment metadata." }, { status: 400 });
  }

  const supabase = createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: existingPayment, error: existingPaymentError } = await supabase
    .from("payments")
    .select("id")
    .eq("stripe_payment_intent_id", paymentIntent.id)
    .maybeSingle();

  if (existingPaymentError) {
    return NextResponse.json({ error: existingPaymentError.message }, { status: 500 });
  }

  if (existingPayment) {
    return NextResponse.json({ received: true });
  }

  const { error: paymentError } = await supabase.from("payments").insert({
    business_id: businessId,
    invoice_id: invoiceId,
    client_id: clientId,
    amount: paymentIntent.amount_received / 100,
    method: getPaymentMethod(paymentIntent),
    stripe_payment_intent_id: paymentIntent.id,
    status: "succeeded",
    paid_at: new Date((paymentIntent.created || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    notes: "Stripe Checkout payment",
  });

  if (paymentError) {
    return NextResponse.json({ error: paymentError.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
