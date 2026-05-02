import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendQuoMessage } from "@/lib/quo";
import type { StoredIntegrationsConfig } from "@/lib/integrations";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { visitId?: string } | null;
  if (!body?.visitId) {
    return NextResponse.json({ error: "visitId is required" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("business_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { data: visit, error: visitError } = await supabase
    .from("job_visits")
    .select("*, jobs(title, clients(first_name, phone))")
    .eq("id", body.visitId)
    .eq("business_id", profile.business_id)
    .maybeSingle();

  if (visitError || !visit) {
    return NextResponse.json({ error: "Visit not found" }, { status: 404 });
  }

  type VisitJoin = typeof visit & {
    jobs: { title: string; clients: { first_name: string; phone: string | null } | null } | null;
  };
  const v = visit as VisitJoin;
  const clientPhone = v.jobs?.clients?.phone;
  const clientFirstName = v.jobs?.clients?.first_name ?? "there";

  if (!clientPhone) {
    return NextResponse.json({ error: "Client has no phone number" }, { status: 422 });
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", profile.business_id)
    .single();

  const integrations = ((business as { integrations_config?: unknown } | null)?.integrations_config ??
    {}) as StoredIntegrationsConfig;
  const businessName = business?.name ?? "Your service provider";

  const dateStr = v.scheduled_date
    ? new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(new Date(`${v.scheduled_date}T00:00:00`))
    : "your scheduled date";
  const timeStr = v.start_time ? ` at ${v.start_time}` : "";

  const messageBody = `Hi ${clientFirstName}, this is ${businessName}. Your visit is scheduled for ${dateStr}${timeStr}. Reply STOP to opt out.`;

  try {
    await sendQuoMessage({
      to: clientPhone,
      content: messageBody,
      config: integrations.quo
        ? {
            apiKey: integrations.quo.api_key,
            phoneNumberId: integrations.quo.phone_number_id,
            userId: integrations.quo.user_id,
          }
        : undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "SMS send failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
