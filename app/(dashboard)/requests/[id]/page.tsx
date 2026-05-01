import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Mail, MapPin, Phone, UserRound, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  convertRequestToQuote,
  getRequest,
  updateRequestStatus,
} from "@/lib/supabase/queries/requests";
import { ConvertToQuoteModal } from "@/components/requests/ConvertToQuoteModal";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RequestDetailPageProps {
  params: Promise<{ id: string }>;
}

const statusClasses: Record<string, string> = {
  new: "bg-orange-100 text-orange-700",
  in_review: "bg-blue-100 text-blue-700",
  converted: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
};

function formatDateTime(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export default async function RequestDetailPage({ params }: RequestDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("business_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile) redirect("/onboarding");

  const request = await getRequest(id, profile.business_id);
  if (!request) notFound();

  const isClosed = request.status === "converted" || request.status === "declined";

  async function markInReviewAction() {
    "use server";

    await updateRequestStatus(id, "in_review");
    revalidatePath(`/requests/${id}`);
    revalidatePath("/requests");
  }

  async function declineAction() {
    "use server";

    await updateRequestStatus(id, "declined");
    revalidatePath(`/requests/${id}`);
    revalidatePath("/requests");
  }

  async function convertAction() {
    "use server";

    let quoteId: string;
    try {
      const quote = await convertRequestToQuote(id);
      quoteId = quote.id;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to convert request." };
    }

    revalidatePath("/requests");
    revalidatePath(`/requests/${id}`);
    revalidatePath("/quotes");
    redirect(`/quotes/${quoteId}`);
  }

  return (
    <div className="max-w-5xl space-y-6">
      <Link href="/requests" className={buttonVariants({ variant: "ghost" })}>
        <ArrowLeft className="size-4" />
        Back to requests
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {request.first_name} {request.last_name}
            </h1>
            <Badge className={statusClasses[request.status] ?? statusClasses.new}>
              {request.status.replace("_", " ")}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Submitted {formatDateTime(request.created_at)} via {request.source.replace("_", " ")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {request.status === "new" ? (
            <form action={markInReviewAction}>
              <button type="submit" className={buttonVariants({ variant: "outline" })}>
                <CheckCircle2 className="size-4" />
                Mark in review
              </button>
            </form>
          ) : null}
          <ConvertToQuoteModal action={convertAction} disabled={isClosed} />
          {!isClosed ? (
            <form action={declineAction}>
              <button type="submit" className={buttonVariants({ variant: "outline" })}>
                <XCircle className="size-4" />
                Decline
              </button>
            </form>
          ) : null}
        </div>
      </div>

      {request.converted_quote ? (
        <Card>
          <CardContent className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Converted quote</p>
              <p className="text-sm text-muted-foreground">
                {request.converted_quote.quote_number ?? "Draft"} - {request.converted_quote.title}
              </p>
            </div>
            <Link href={`/quotes/${request.converted_quote.id}`} className={buttonVariants()}>
              View quote
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader>
            <CardTitle>Client Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-2">
              <UserRound className="size-4 text-muted-foreground" />
              <span className="font-medium text-gray-900">
                {request.first_name} {request.last_name}
              </span>
            </div>
            {request.email ? (
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-muted-foreground" />
                <a href={`mailto:${request.email}`} className="hover:text-brand">
                  {request.email}
                </a>
              </div>
            ) : null}
            {request.phone ? (
              <div className="flex items-center gap-2">
                <Phone className="size-4 text-muted-foreground" />
                <a href={`tel:${request.phone}`} className="hover:text-brand">
                  {request.phone}
                </a>
              </div>
            ) : null}
            {request.address ? (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 text-muted-foreground" />
                <span>{request.address}</span>
              </div>
            ) : null}
            {request.users ? (
              <div className="flex items-center gap-2">
                <UserRound className="size-4 text-muted-foreground" />
                <span>
                  Assigned to {request.users.first_name} {request.users.last_name}
                </span>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 text-sm">
            <div>
              <p className="text-muted-foreground">Service requested</p>
              <p className="mt-1 font-medium text-gray-900">
                {request.service_type || "Not specified"}
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <p className="text-muted-foreground">Request date</p>
                <p className="mt-1 font-medium text-gray-900">{formatDate(request.requested_on)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Reminder</p>
                <p className="mt-1 font-medium text-gray-900">
                  {request.reminder_at ? formatDateTime(request.reminder_at) : "No reminder set"}
                </p>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground">Message</p>
              <p className="mt-1 whitespace-pre-wrap text-gray-900">
                {request.message || "No message provided."}
              </p>
            </div>
            {request.image_url ? (
              <div>
                <p className="mb-2 text-muted-foreground">Reference image</p>
                <a href={request.image_url} target="_blank" rel="noreferrer" className="inline-flex">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={request.image_url} alt="" className="max-h-72 rounded-lg border object-cover" />
                </a>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
