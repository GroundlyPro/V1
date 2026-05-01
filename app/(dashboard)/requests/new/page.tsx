import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createManualRequest } from "@/lib/supabase/queries/requests";
import { RequestForm, type RequestFormValues } from "@/components/requests/RequestForm";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewRequestPage() {
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
            Capture a phone, email, or walk-in request and keep it in the request workflow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RequestForm action={createAction} submitLabel="Create request" />
        </CardContent>
      </Card>
    </div>
  );
}
