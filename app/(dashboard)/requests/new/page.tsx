import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  createManualRequest,
  getRequestFormOptions,
} from "@/lib/supabase/queries/requests";
import { RequestForm, type RequestFormValues } from "@/components/requests/RequestForm";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewRequestPage() {
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

  const { clients, teamMembers } = await getRequestFormOptions(profile.business_id);

  async function createAction(values: RequestFormValues) {
    "use server";

    let request: Awaited<ReturnType<typeof createManualRequest>>;
    try {
      request = await createManualRequest(values);
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Unable to create request.",
      };
    }

    revalidatePath("/requests");
    redirect(`/requests/${request.id}`);
  }

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/requests" className={buttonVariants({ variant: "ghost" })}>
        <ArrowLeft className="size-4" />
        Back to requests
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>New Request</CardTitle>
          <CardDescription>
            Capture a client request, assign follow-up ownership, and attach a reference image.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium text-gray-900">Add a client first</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Manual requests now attach to an existing client record.
              </p>
              <Link href="/clients/new" className={buttonVariants({ className: "mt-4" })}>
                Add Client
              </Link>
            </div>
          ) : (
            <RequestForm
              businessId={profile.business_id}
              clients={clients}
              teamMembers={teamMembers}
              action={createAction}
              submitLabel="Create request"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
