import { ExternalLink, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Expense } from "@/lib/supabase/queries/expenses";
import type { AddExpenseFormValues } from "./AddExpenseModal";
import { AddExpenseModal } from "./AddExpenseModal";

interface ExpensesTabProps {
  jobId: string;
  expenses: Expense[];
  addAction: (
    values: AddExpenseFormValues & { receipt_url?: string | null }
  ) => Promise<{ error?: string } | void>;
  deleteAction: (formData: FormData) => Promise<void>;
}

function formatCurrency(value: number | null) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value ?? 0);
}

export function ExpensesTab({ jobId, expenses, addAction, deleteAction }: ExpensesTabProps) {
  const total = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle>Expenses</CardTitle>
        <AddExpenseModal jobId={jobId} action={addAction} />
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <p className="py-4 text-center text-sm text-[#9baab8]">No expenses recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e4ecf3] text-left text-xs font-medium uppercase tracking-wide text-[#9baab8]">
                  <th className="pb-2 pr-4">Item</th>
                  <th className="pb-2 pr-4">Category</th>
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 text-right">Amount</th>
                  <th className="pb-2 pl-4">Receipt</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4ecf3]">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="group">
                    <td className="py-2.5 pr-4">
                      <p className="font-medium text-[#1a2d3d]">{expense.item}</p>
                      {expense.description && (
                        <p className="text-xs text-[#9baab8]">{expense.description}</p>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-[#4a6070]">
                      {expense.category ?? "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-[#4a6070]">{expense.date}</td>
                    <td className="py-2.5 text-right tabular-nums font-medium text-[#1a2d3d]">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="py-2.5 pl-4">
                      {expense.receipt_url ? (
                        <a
                          href={expense.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[#007bb8] hover:underline"
                        >
                          View <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-[#9baab8]">None</span>
                      )}
                    </td>
                    <td className="py-2.5 pl-2">
                      <form action={deleteAction}>
                        <input type="hidden" name="expenseId" value={expense.id} />
                        <button
                          type="submit"
                          className="opacity-0 group-hover:opacity-100 rounded p-1 text-[#9baab8] hover:text-[#d32f2f] transition-all"
                          aria-label="Delete expense"
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
                    colSpan={3}
                    className="pt-3 text-xs font-medium uppercase tracking-wide text-[#9baab8]"
                  >
                    Total
                  </td>
                  <td className="pt-3 text-right tabular-nums text-sm font-bold text-[#1a2d3d]">
                    {formatCurrency(total)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
