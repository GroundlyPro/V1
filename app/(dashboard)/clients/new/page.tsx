import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ClientForm, type ClientFormValues } from "@/components/clients/ClientForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { createClient as createClientRecord } from "@/lib/supabase/queries/clients";

export default function NewClientPage() {
  async function createAction(values: ClientFormValues) {
    "use server";

    let client: Awaited<ReturnType<typeof createClientRecord>>;
    try {
      client = await createClientRecord(values);
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Unable to create client.",
      };
    }

    revalidatePath("/clients");
    redirect(`/clients/${client.id}`);
  }

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/clients" className={buttonVariants({ variant: "ghost" })}>
        <ArrowLeft className="size-4" />
        Back to clients
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>New Client</CardTitle>
          <CardDescription>
            Add contact details and the primary service address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientForm action={createAction} submitLabel="Create client" />
        </CardContent>
      </Card>
    </div>
  );
}
