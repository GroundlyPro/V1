import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

const schema = z.object({
  businessName: z.string().min(1),
  industry: z.string().min(1),
  phone: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});

export async function POST(request: Request) {
  const payload = schema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      { error: "Invalid onboarding details." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const serviceSupabase = createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: existingProfile, error: profileError } = await serviceSupabase
    .from("users")
    .select("business_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (existingProfile) {
    return NextResponse.json({ ok: true });
  }

  const values = payload.data;
  const { data: existingBusiness, error: existingBusinessError } =
    await serviceSupabase
      .from("businesses")
      .select("id")
      .eq("owner_id", user.id)
      .eq("name", values.businessName)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

  if (existingBusinessError) {
    return NextResponse.json(
      { error: existingBusinessError.message },
      { status: 500 }
    );
  }

  let business = existingBusiness;

  if (!business) {
    const { data: createdBusiness, error: businessError } = await serviceSupabase
      .from("businesses")
      .insert({
        name: values.businessName,
        owner_id: user.id,
        phone: values.phone || null,
        city: values.city || null,
        state: values.state || null,
      })
      .select("id")
      .single();

    if (businessError) {
      return NextResponse.json({ error: businessError.message }, { status: 500 });
    }

    business = createdBusiness;
  }

  const meta = user.user_metadata as {
    first_name?: string;
    last_name?: string;
  };

  const { error: profileInsertError } = await serviceSupabase
    .from("users")
    .insert({
      business_id: business.id,
      auth_user_id: user.id,
      first_name: meta.first_name || "Owner",
      last_name: meta.last_name || "",
      email: user.email || "",
      role: "owner",
    });

  if (profileInsertError) {
    return NextResponse.json(
      { error: profileInsertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
