import { NextResponse } from "next/server";
import { z } from "zod";
import { submitPublicRequest } from "@/lib/supabase/queries/requests";

const submitRequestSchema = z.object({
  business_id: z.string().uuid(),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  address: z.string().max(300).optional(),
  service_type: z.string().max(120).optional(),
  preferred_date: z.string().optional(),
  message: z.string().max(2000).optional(),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = submitRequestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request details." }, { status: 400 });
  }

  try {
    const result = await submitPublicRequest(parsed.data);
    return NextResponse.json({ id: result.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to submit request." },
      { status: 500 }
    );
  }
}
