import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createInvoice, getInvoiceFormOptions } from "@/lib/supabase/queries/invoices";
import { InvoiceForm, type InvoiceFormValues } from "@/components/invoices/InvoiceForm";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewInvoicePage() {
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

  const { clients, jobs } = await getInvoiceFormOptions(profile.business_id);

  async function createAction(values: InvoiceFormValues) {
    "use server";

    let invoice: Awaited<ReturnType<typeof createInvoice>>;
    try {
      invoice = await createInvoice(values);
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Unable to create invoice.",
      };
    }

    revalidatePath("/invoices");
    redirect(`/invoices/${invoice.id}`);
  }

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/invoices" className={buttonVariants({ variant: "ghost" })}>
        <ArrowLeft className="size-4" />
        Back to invoices
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>New Invoice</CardTitle>
          <CardDescription>
            Choose a client, set payment dates, and add billable line items.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium text-gray-900">Add a client first</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Invoices need a client before you can bill for work.
              </p>
              <Link href="/clients/new" className={buttonVariants({ className: "mt-4" })}>
                Add Client
              </Link>
            </div>
          ) : (
            <InvoiceForm clients={clients} jobs={jobs} action={createAction} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
