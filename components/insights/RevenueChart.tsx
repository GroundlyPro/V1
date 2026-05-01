import type { RevenueByMonth } from "@/lib/supabase/queries/insights";

const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function RevenueChart({ data }: { data: RevenueByMonth[] }) {
  const max = Math.max(...data.map((item) => item.revenue), 1);

  return (
    <div className="h-72">
      <div className="flex h-60 items-end gap-2 border-b border-l px-2 pb-2">
        {data.map((item) => {
          const height = Math.max((item.revenue / max) * 100, item.revenue > 0 ? 6 : 0);
          return (
            <div key={item.month} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="text-[10px] font-medium tabular-nums text-muted-foreground">
                {item.revenue > 0 ? MONEY.format(item.revenue) : ""}
              </div>
              <div
                className="w-full max-w-10 rounded-t bg-primary transition-all"
                style={{ height: `${height}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 grid grid-cols-12 gap-2 px-2 text-center text-[11px] text-muted-foreground">
        {data.map((item) => (
          <span key={item.month}>{item.month}</span>
        ))}
      </div>
    </div>
  );
}
