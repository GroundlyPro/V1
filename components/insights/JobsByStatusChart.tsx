import type { JobStatusSummary } from "@/lib/supabase/queries/insights";

const colors = ["#007bb8", "#29b6f6", "#1565c0", "#ff9800", "#9c27b0", "#d32f2f"];

export function JobsByStatusChart({ data }: { data: JobStatusSummary[] }) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  if (total === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No jobs yet.</p>;
  }

  const segments = data.reduce<Array<{ color: string; start: number; end: number }>>(
    (items, item, index) => {
      const previous = items[items.length - 1]?.end ?? 0;
      const end = previous + (item.count / total) * 100;
      return [...items, { color: colors[index % colors.length], start: previous, end }];
    },
    []
  );
  const gradient = segments
    .map((segment) => `${segment.color} ${segment.start}% ${segment.end}%`)
    .join(", ");

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div
        className="size-40 rounded-full"
        style={{ background: `conic-gradient(${gradient})` }}
        aria-label="Jobs by status"
      >
        <div className="m-8 flex size-24 items-center justify-center rounded-full bg-white text-2xl font-bold text-gray-900">
          {total}
        </div>
      </div>
      <div className="w-full space-y-2">
        {data.map((item, index) => (
          <div key={item.status} className="flex items-center justify-between gap-3 text-sm">
            <span className="inline-flex items-center gap-2 text-gray-700">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              {item.status.replace("_", " ")}
            </span>
            <span className="font-semibold tabular-nums text-gray-900">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
