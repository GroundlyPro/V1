import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  createJob,
  getJobFormOptions,
} from "@/lib/supabase/queries/jobs";
import { JobForm, type JobFormValues } from "@/components/jobs/JobForm";
import { buttonVariants } from "@/components/ui/button";

export default async function NewJobPage() {
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

  const { clients, teamMembers, services } = await getJobFormOptions(profile.business_id);

  async function createAction(values: JobFormValues) {
    "use server";

    let job: Awaited<ReturnType<typeof createJob>>;
    try {
      job = await createJob(values);
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Unable to create job.",
      };
    }

    revalidatePath("/jobs");
    redirect(`/jobs/${job.id}`);
  }

  return (
    <div className="space-y-6">
      <Link href="/jobs" className={buttonVariants({ variant: "ghost" })}>
        <ArrowLeft className="size-4" />
        Back to jobs
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Booking</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a customer, service, schedule, first visit, and job pricing in one flow.
        </p>
      </div>

      <JobForm
        clients={clients}
        teamMembers={teamMembers}
        services={services}
        action={createAction}
        submitLabel="Save Booking"
      />
    </div>
  );
}
