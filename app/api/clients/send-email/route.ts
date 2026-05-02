import { NextResponse } from "next/server";
import { sendTransactionalEmail, type EmailAttachment } from "@/lib/email";
import { dbConfigToEmailIntegrations } from "@/lib/integrations";
import { createClient } from "@/lib/supabase/server";

const MAX_ATTACHMENTS = 5;
const MAX_TOTAL_ATTACHMENT_BYTES = 15 * 1024 * 1024;

function clean(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function messageHtml(body: string) {
  return `
    <div style="font-family:Arial,sans-serif;color:#1a2d3d;line-height:1.6;font-size:15px">
      ${escapeHtml(body).replace(/\r?\n/g, "<br />")}
    </div>
  `;
}

async function readAttachments(files: FormDataEntryValue[]) {
  const attachments: EmailAttachment[] = [];
  let totalSize = 0;

  for (const item of files) {
    if (!(item instanceof File) || item.size === 0) continue;
    totalSize += item.size;
    if (totalSize > MAX_TOTAL_ATTACHMENT_BYTES) {
      throw new Error("Attachments must be 15 MB or less in total.");
    }

    attachments.push({
      filename: item.name || "attachment",
      content: Buffer.from(await item.arrayBuffer()),
      contentType: item.type || undefined,
    });
  }

  if (attachments.length > MAX_ATTACHMENTS) {
    throw new Error(`Attach up to ${MAX_ATTACHMENTS} files.`);
  }

  return attachments;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Invalid form data" }, { status: 400 });

  const clientId = clean(formData.get("clientId"));
  const subject = clean(formData.get("subject"));
  const message = clean(formData.get("message"));

  if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  if (!subject) return NextResponse.json({ error: "Subject is required" }, { status: 400 });
  if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });

  const { data: profile } = await supabase
    .from("users")
    .select("business_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, first_name, last_name, company_name, email")
    .eq("id", clientId)
    .eq("business_id", profile.business_id)
    .maybeSingle();

  if (clientError) return NextResponse.json({ error: clientError.message }, { status: 500 });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  if (!client.email) {
    return NextResponse.json({ error: "Client has no email address" }, { status: 422 });
  }

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("name, email")
    .eq("id", profile.business_id)
    .single();

  if (businessError) return NextResponse.json({ error: businessError.message }, { status: 500 });

  const { data: bizIntegrations } = await supabase
    .from("businesses")
    .select("integrations_config")
    .eq("id", profile.business_id)
    .single<{ integrations_config: unknown }>();

  let attachments: EmailAttachment[];
  try {
    attachments = await readAttachments(formData.getAll("attachments"));
    await sendTransactionalEmail({
      businessName: business?.name ?? "Your service provider",
      to: client.email,
      replyTo: business?.email ?? undefined,
      subject,
      html: messageHtml(message),
      attachments,
      integrations: dbConfigToEmailIntegrations(bizIntegrations?.integrations_config),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Email failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
