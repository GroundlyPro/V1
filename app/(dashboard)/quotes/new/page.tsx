import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createQuote, getQuoteFormOptions, encodeTeamInNotes } from "@/lib/supabase/queries/quotes";
import { QuoteForm, type QuoteFormValues } from "@/components/quotes/QuoteForm";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewQuotePage() {
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

  const { clients, teamMembers } = await getQuoteFormOptions(profile.business_id);

  async function createAction(values: QuoteFormValues) {
    "use server";

    const { assigned_user_id, assigned_wage, assigned_wage_type, internal_notes, ...rest } = values;
    const encodedNotes = encodeTeamInNotes(internal_notes, assigned_user_id, assigned_wage, assigned_wage_type);

    let quote: Awaited<ReturnType<typeof createQuote>>;
    try {
      quote = await createQuote({ ...rest, internal_notes: encodedNotes });
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Unable to create quote.",
      };
    }

    revalidatePath("/quotes");
    redirect(`/quotes/${quote.id}`);
  }

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/quotes" className={buttonVariants({ variant: "ghost" })}>
        <ArrowLeft className="size-4" />
        Back to quotes
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>New Quote</CardTitle>
          <CardDescription>
            Set the client, scope, and pricing. You can create the first priced line item here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium text-gray-900">Add a client first</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Quotes need a client before you can build and send them.
              </p>
              <Link href="/clients/new" className={buttonVariants({ className: "mt-4" })}>
                Add Client
              </Link>
            </div>
          ) : (
            <QuoteForm
              clients={clients}
              teamMembers={teamMembers}
              action={createAction}
              submitLabel="Create quote"
              showPricingFields
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
