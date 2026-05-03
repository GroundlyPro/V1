import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClients, type ClientFilters } from "@/lib/supabase/queries/clients";
import { serializeClientsCsv } from "@/lib/clients/csv";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("business_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const isTemplate = searchParams.get("template") === "1";
  const statusParam = searchParams.get("status");
  const status: ClientFilters["status"] =
    statusParam === "active" || statusParam === "lead" || statusParam === "inactive"
      ? statusParam
      : "all";

  const clients = isTemplate
    ? []
    : await getClients(profile.business_id, {
        search: searchParams.get("q") ?? undefined,
        status,
      });

  const csv = serializeClientsCsv(
    clients.map((client) => {
      const primaryAddress =
        client.client_addresses.find((address) => address.is_primary) ??
        client.client_addresses[0];

      return {
        first_name: client.first_name,
        last_name: client.last_name,
        email: client.email ?? undefined,
        phone: client.phone ?? undefined,
        company_name: client.company_name ?? undefined,
        status: client.status ?? "active",
        type: client.type ?? "residential",
        street: primaryAddress?.street1 ?? "",
        street2: primaryAddress?.street2 ?? undefined,
        city: primaryAddress?.city ?? "",
        state: primaryAddress?.state ?? "",
        zip: primaryAddress?.zip ?? undefined,
        notes: client.notes ?? undefined,
        tags: client.tags?.join(", ") ?? undefined,
        balance: client.balance,
      };
    })
  );

  const timestamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${
        isTemplate ? "clients-template" : `clients-${timestamp}`
      }.csv"`,
    },
  });
}
