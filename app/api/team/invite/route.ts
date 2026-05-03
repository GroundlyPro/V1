import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const allowedRoles = new Set(["admin", "office", "field_tech"]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    role?: string;
  } | null;

  const email = body?.email?.trim().toLowerCase();
  const role = body?.role ?? "field_tech";

  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
  if (!allowedRoles.has(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const { data: inviter } = await supabase
    .from("users")
    .select("business_id, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!inviter) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  if (!["owner", "admin"].includes(inviter.role)) {
    return NextResponse.json({ error: "Only owners and admins can invite members" }, { status: 403 });
  }

  const origin = new URL(request.url).origin;
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/onboarding`,
    data: { business_id: inviter.business_id, role },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const authUserId = data.user?.id ?? null;
  const { error: upsertError } = await admin.from("users").upsert(
    {
      business_id: inviter.business_id,
      auth_user_id: authUserId,
      first_name: "Invited",
      last_name: "Member",
      email,
      role,
      is_active: true,
    },
    { onConflict: "business_id,email" }
  );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
