import { Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LaborEntry } from "@/lib/supabase/queries/labor";
import type { LogTimeFormValues } from "./LogTimeModal";
import { LogTimeModal } from "./LogTimeModal";

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface LaborTabProps {
  entries: LaborEntry[];
  teamMembers: TeamMember[];
  logTimeAction: (values: LogTimeFormValues) => Promise<{ error?: string } | void>;
  deleteAction: (formData: FormData) => Promise<void>;
}

function formatCurrency(value: number | null) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value ?? 0);
}

function formatHours(hours: number | null) {
  const h = hours ?? 0;
  return h === 1 ? "1 hr" : `${h} hrs`;
}

export function LaborTab({ entries, teamMembers, logTimeAction, deleteAction }: LaborTabProps) {
  const totalCost = entries.reduce((sum, e) => sum + (e.total_cost ?? 0), 0);
  const totalHours = entries.reduce((sum, e) => sum + (e.hours ?? 0), 0);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle>Labor</CardTitle>
        <LogTimeModal teamMembers={teamMembers} action={logTimeAction} />
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="py-4 text-center text-sm text-[#9baab8]">No labor entries yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e4ecf3] text-left text-xs font-medium uppercase tracking-wide text-[#9baab8]">
                  <th className="pb-2 pr-4">Team member</th>
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4 text-right">Hours</th>
                  <th className="pb-2 pr-4 text-right">Rate</th>
                  <th className="pb-2 text-right">Cost</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4ecf3]">
                {entries.map((entry) => (
                  <tr key={entry.id} className="group">
                    <td className="py-2.5 pr-4 font-medium text-[#1a2d3d]">
                      {entry.users
                        ? `${entry.users.first_name} ${entry.users.last_name}`
                        : "Unknown"}
                    </td>
                    <td className="py-2.5 pr-4 text-[#4a6070]">{entry.date}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-[#4a6070]">
                      {formatHours(entry.hours)}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-[#4a6070]">
                      {formatCurrency(entry.hourly_rate)}/hr
                    </td>
                    <td className="py-2.5 text-right tabular-nums font-medium text-[#1a2d3d]">
                      {formatCurrency(entry.total_cost)}
                    </td>
                    <td className="py-2.5 pl-2">
                      <form action={deleteAction}>
                        <input type="hidden" name="laborId" value={entry.id} />
                        <button
                          type="submit"
                          className="opacity-0 group-hover:opacity-100 rounded p-1 text-[#9baab8] hover:text-[#d32f2f] transition-all"
                          aria-label="Delete entry"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#e4ecf3]">
                  <td
                    colSpan={2}
                    className="pt-3 text-xs font-medium uppercase tracking-wide text-[#9baab8]"
                  >
                    Total
                  </td>
                  <td className="pt-3 text-right tabular-nums text-sm font-medium text-[#4a6070]">
                    {formatHours(totalHours)}
                  </td>
                  <td />
                  <td className="pt-3 text-right tabular-nums text-sm font-bold text-[#1a2d3d]">
                    {formatCurrency(totalCost)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        {entries.length > 0 && (
          <p className="mt-3 text-xs text-[#9baab8]">
            Hover a row to reveal the delete button.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
