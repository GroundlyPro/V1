import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Bell, BriefcaseBusiness, Building2, CreditCard, Users } from "lucide-react";
import { BusinessProfileForm, type BusinessProfileValues } from "@/components/settings/BusinessProfileForm";
import { TeamMembersTab } from "@/components/settings/TeamMembersTab";
import { ServicesTab } from "@/components/settings/ServicesTab";
import { NotificationsTab, type NotificationValues } from "@/components/settings/NotificationsTab";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/server";

const emptyProfile: BusinessProfileValues = {
  name: "",
  industry: "other",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  zip: "",
};

type BusinessSettings = {
  id: string;
  name: string | null;
  industry?: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  logo_url: string | null;
  plan: string | null;
  plan_status: string | null;
  trial_ends_at: string | null;
  email_notifications?: boolean | null;
  sms_notifications?: boolean | null;
  job_reminders_enabled?: boolean | null;
  job_reminder_24h?: boolean | null;
  job_reminder_1h?: boolean | null;
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("id, business_id, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile) redirect("/onboarding");

  const [businessResult, membersResult, servicesResult] = await Promise.all([
    supabase
      .from("businesses")
      .select("*")
      .eq("id", profile.business_id)
      .single(),
    supabase
      .from("users")
      .select("id, first_name, last_name, email, role, is_active")
      .eq("business_id", profile.business_id)
      .order("created_at", { ascending: true }),
    supabase
      .from("services")
      .select("id, name, category, unit, unit_price, unit_cost, is_active")
      .eq("business_id", profile.business_id)
      .order("name", { ascending: true }),
  ]);

  const business = businessResult.data as unknown as BusinessSettings | null;
  if (!business) redirect("/onboarding");

  async function updateBusinessProfile(values: BusinessProfileValues & { logo_url?: string | null }) {
    "use server";

    const serverSupabase = await createClient();
    const {
      data: { user: currentUser },
    } = await serverSupabase.auth.getUser();
    if (!currentUser) return { error: "Unauthorized" };

    const { data: currentProfile } = await serverSupabase
      .from("users")
      .select("business_id")
      .eq("auth_user_id", currentUser.id)
      .maybeSingle();
    if (!currentProfile) return { error: "Profile not found" };

    const businessUpdate = {
        name: values.name,
        industry: values.industry,
        email: values.email || null,
        phone: values.phone || null,
        address: values.address || null,
        city: values.city || null,
        state: values.state || null,
        zip: values.zip || null,
        logo_url: values.logo_url || null,
      } as never;

    const { error } = await serverSupabase
      .from("businesses")
      .update(businessUpdate)
      .eq("id", currentProfile.business_id);

    if (error) return { error: error.message };
    revalidatePath("/settings");
  }

  async function deactivateMember(userId: string) {
    "use server";

    const serverSupabase = await createClient();
    const {
      data: { user: currentUser },
    } = await serverSupabase.auth.getUser();
    if (!currentUser) return { error: "Unauthorized" };

    const { data: currentProfile } = await serverSupabase
      .from("users")
      .select("business_id, role")
      .eq("auth_user_id", currentUser.id)
      .maybeSingle();
    if (!currentProfile) return { error: "Profile not found" };
    if (!["owner", "admin"].includes(currentProfile.role)) return { error: "Only owners and admins can manage team members." };

    const { error } = await serverSupabase
      .from("users")
      .update({ is_active: false })
      .eq("id", userId)
      .eq("business_id", currentProfile.business_id)
      .neq("role", "owner");

    if (error) return { error: error.message };
    revalidatePath("/settings");
  }

  async function createService(formData: FormData) {
    "use server";

    const name = String(formData.get("name") ?? "").trim();
    if (!name) return { error: "Service name is required." };

    const serverSupabase = await createClient();
    const {
      data: { user: currentUser },
    } = await serverSupabase.auth.getUser();
    if (!currentUser) return { error: "Unauthorized" };

    const { data: currentProfile } = await serverSupabase
      .from("users")
      .select("business_id")
      .eq("auth_user_id", currentUser.id)
      .maybeSingle();
    if (!currentProfile) return { error: "Profile not found" };

    const { error } = await serverSupabase.from("services").insert({
      business_id: currentProfile.business_id,
      name,
      category: String(formData.get("category") ?? "").trim() || null,
      unit_price: Number(formData.get("unit_price") || 0),
      unit_cost: Number(formData.get("unit_cost") || 0),
      unit: "flat",
      is_active: true,
      taxable: true,
    });

    if (error) return { error: error.message };
    revalidatePath("/settings");
  }

  async function toggleService(serviceId: string, active: boolean) {
    "use server";

    const serverSupabase = await createClient();
    const {
      data: { user: currentUser },
    } = await serverSupabase.auth.getUser();
    if (!currentUser) return { error: "Unauthorized" };

    const { data: currentProfile } = await serverSupabase
      .from("users")
      .select("business_id")
      .eq("auth_user_id", currentUser.id)
      .maybeSingle();
    if (!currentProfile) return { error: "Profile not found" };

    const { error } = await serverSupabase
      .from("services")
      .update({ is_active: !active })
      .eq("id", serviceId)
      .eq("business_id", currentProfile.business_id);

    if (error) return { error: error.message };
    revalidatePath("/settings");
  }

  async function updateNotifications(values: NotificationValues) {
    "use server";

    const serverSupabase = await createClient();
    const {
      data: { user: currentUser },
    } = await serverSupabase.auth.getUser();
    if (!currentUser) return { error: "Unauthorized" };

    const { data: currentProfile } = await serverSupabase
      .from("users")
      .select("business_id")
      .eq("auth_user_id", currentUser.id)
      .maybeSingle();
    if (!currentProfile) return { error: "Profile not found" };

    const notificationUpdate = values as never;

    const { error } = await serverSupabase
      .from("businesses")
      .update(notificationUpdate)
      .eq("id", currentProfile.business_id);

    if (error) return { error: error.message };
    revalidatePath("/settings");
  }

  const profileDefaults: BusinessProfileValues = {
    ...emptyProfile,
    name: business.name ?? "",
    industry: business.industry ?? "other",
    email: business.email ?? "",
    phone: business.phone ?? "",
    address: business.address ?? "",
    city: business.city ?? "",
    state: business.state ?? "",
    zip: business.zip ?? "",
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2d3d]">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage business details, team access, services, billing, and notifications.
          </p>
        </div>
        <Badge variant="secondary" className="w-fit">
          {business.plan ?? "starter"} · {business.plan_status ?? "trialing"}
        </Badge>
      </div>

      <Tabs defaultValue="profile" className="gap-5">
        <TabsList className="grid min-h-11 w-full grid-cols-2 gap-1 bg-[#eef4f8] p-1 sm:grid-cols-5">
          <TabsTrigger value="profile" className="min-h-9 gap-2">
            <Building2 className="size-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="team" className="min-h-9 gap-2">
            <Users className="size-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="services" className="min-h-9 gap-2">
            <BriefcaseBusiness className="size-4" />
            Services
          </TabsTrigger>
          <TabsTrigger value="billing" className="min-h-9 gap-2">
            <CreditCard className="size-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="notifications" className="min-h-9 gap-2">
            <Bell className="size-4" />
            Alerts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Business profile</CardTitle>
              <CardDescription>These details appear on client-facing documents and booking pages.</CardDescription>
            </CardHeader>
            <CardContent>
              <BusinessProfileForm
                businessId={business.id}
                logoUrl={business.logo_url}
                defaultValues={profileDefaults}
                action={updateBusinessProfile}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <TeamMembersTab members={membersResult.data ?? []} deactivateAction={deactivateMember} />
        </TabsContent>

        <TabsContent value="services">
          <ServicesTab
            services={servicesResult.data ?? []}
            createAction={createService}
            toggleAction={toggleService}
          />
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing</CardTitle>
              <CardDescription>Stripe subscription management will live here.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-[#dfe8f0] bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Plan</p>
                <p className="mt-1 text-lg font-semibold text-[#1a2d3d]">{business.plan ?? "starter"}</p>
              </div>
              <div className="rounded-lg border border-[#dfe8f0] bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
                <p className="mt-1 text-lg font-semibold text-[#1a2d3d]">{business.plan_status ?? "trialing"}</p>
              </div>
              <div className="rounded-lg border border-[#dfe8f0] bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Trial ends</p>
                <p className="mt-1 text-lg font-semibold text-[#1a2d3d]">
                  {business.trial_ends_at
                    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(business.trial_ends_at))
                    : "Not set"}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Choose the channels Groundly PRO can use for operational updates.</CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationsTab
                defaultValues={{
                  email_notifications: business.email_notifications ?? true,
                  sms_notifications: business.sms_notifications ?? false,
                  job_reminders_enabled: business.job_reminders_enabled ?? true,
                  job_reminder_24h: business.job_reminder_24h ?? true,
                  job_reminder_1h: business.job_reminder_1h ?? true,
                }}
                action={updateNotifications}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
