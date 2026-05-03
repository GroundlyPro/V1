import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getInsightsOverview } from "@/lib/supabase/queries/insights";
import { JobsByStatusChart } from "@/components/insights/JobsByStatusChart";
import { RevenueChart } from "@/components/insights/RevenueChart";
import { StatCard } from "@/components/insights/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function money(value: number) {
  return MONEY.format(value);
}

export default async function InsightsPage() {
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

  const insights = await getInsightsOverview(profile.business_id);
  const revenueDelta = insights.revenue.thisMonth - insights.revenue.lastMonth;

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Insights</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Revenue, job volume, and profitability across your landscaping operation.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Revenue this month"
          value={money(insights.revenue.thisMonth)}
          helper={`${revenueDelta >= 0 ? "+" : ""}${money(revenueDelta)} vs last month`}
        />
        <StatCard title="YTD revenue" value={money(insights.revenue.ytd)} />
        <StatCard title="Outstanding balance" value={money(insights.outstandingBalance)} />
        <StatCard title="Average invoice" value={money(insights.revenue.averageInvoiceValue)} />
        <StatCard title="Active jobs" value={String(insights.jobSummary.activeJobs)} />
        <StatCard
          title="Completed this month"
          value={String(insights.jobSummary.completedThisMonth)}
        />
        <StatCard title="Labor + expenses" value={money(insights.profitability.laborCost + insights.profitability.expenseCost)} />
        <StatCard title="Gross profit" value={money(insights.profitability.grossProfit)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Month</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={insights.revenueByMonth} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Jobs by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <JobsByStatusChart data={insights.jobSummary.jobsByStatus} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Clients by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.topClients.map((client, index) => (
                <div key={client.clientId} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {index + 1}. {client.name}
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-gray-900">
                    {money(client.revenue)}
                  </p>
                </div>
              ))}
              {insights.topClients.length === 0 ? (
                <p className="text-sm text-muted-foreground">No paid revenue yet.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profitability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Job revenue</span>
              <span className="font-semibold tabular-nums">{money(insights.profitability.jobRevenue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Labor cost</span>
              <span className="font-semibold tabular-nums">{money(insights.profitability.laborCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expense cost</span>
              <span className="font-semibold tabular-nums">{money(insights.profitability.expenseCost)}</span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="font-medium text-gray-900">Gross profit</span>
              <span className="font-bold tabular-nums text-gray-900">
                {money(insights.profitability.grossProfit)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
