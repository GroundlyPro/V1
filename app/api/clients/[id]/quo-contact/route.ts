import { NextResponse } from "next/server";
import { dbConfigToQuoConfig } from "@/lib/integrations";
import { ensureQuoContact } from "@/lib/quo";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "Client id is required" }, { status: 400 });

  const { data: profile } = await supabase
    .from("users")
    .select("business_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, first_name, last_name, company_name, email, phone")
    .eq("id", id)
    .eq("business_id", profile.business_id)
    .maybeSingle();

  if (clientError) return NextResponse.json({ error: clientError.message }, { status: 500 });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  if (!client.phone) {
    return NextResponse.json({ error: "Client has no phone number." }, { status: 422 });
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("integrations_config")
    .eq("id", profile.business_id)
    .maybeSingle<{ integrations_config: unknown }>();

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const result = await ensureQuoContact({
      externalId: `groundly-client:${client.id}`,
      firstName: client.first_name,
      lastName: client.last_name,
      companyName: client.company_name,
      email: client.email,
      phone: client.phone,
      sourceUrl: `${baseUrl}/clients/${client.id}`,
      config: dbConfigToQuoConfig(business?.integrations_config),
    });

    return NextResponse.json({ url: result.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to open Quo contact." },
      { status: 500 }
    );
  }
}
