"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const EXPENSE_CATEGORIES = [
  "Materials",
  "Equipment",
  "Fuel",
  "Subcontractor",
  "Permits",
  "Disposal",
  "Other",
];

const schema = z.object({
  item: z.string().min(1, "Item name is required"),
  category: z.string().optional(),
  amount: z.coerce.number<string | number>().min(0, "Amount must be 0 or more"),
  date: z.string().min(1, "Date is required"),
  description: z.string().optional(),
});

export type AddExpenseFormValues = z.infer<typeof schema>;
type AddExpenseFormInput = z.input<typeof schema>;

interface AddExpenseModalProps {
  jobId: string;
  action: (
    values: AddExpenseFormValues & { receipt_url?: string | null }
  ) => Promise<{ error?: string } | void>;
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function receiptPath(jobId: string, fileName: string) {
  const ext = fileName.split(".").pop();
  return `${jobId}/${Date.now()}.${ext}`;
}

export function AddExpenseModal({ jobId, action }: AddExpenseModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const form = useForm<AddExpenseFormInput, unknown, AddExpenseFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      item: "",
      category: "Materials",
      amount: 0,
      date: today(),
      description: "",
    },
  });

  async function onSubmit(values: AddExpenseFormValues) {
    setServerError(null);
    setUploadError(null);

    let receipt_url: string | null = null;

    const file = fileRef.current?.files?.[0];
    if (file) {
      const supabase = createClient();
      const path = receiptPath(jobId, file.name);
      const { error: uploadErr } = await supabase.storage
        .from("expense-receipts")
        .upload(path, file, { upsert: false });

      if (uploadErr) {
        setUploadError("Receipt upload failed: " + uploadErr.message);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("expense-receipts")
        .getPublicUrl(path);
      receipt_url = urlData.publicUrl;
    }

    const result = await action({ ...values, receipt_url });
    if (result?.error) {
      setServerError(result.error);
      return;
    }

    form.reset({ item: "", category: "Materials", amount: 0, date: today(), description: "" });
    if (fileRef.current) fileRef.current.value = "";
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Receipt className="size-4" />
        Add Expense
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
          <DialogDescription>Log a material cost or expense for this job.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          {/* eslint-disable-next-line react-hooks/refs -- react-hook-form intentionally wraps submit handling here. */}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="item"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Mulch bags, PVC pipe..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount ($)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Vendor, purchase order, or notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-1">
              <label className="text-sm font-medium">Receipt (optional)</label>
              <Input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf"
                className="cursor-pointer"
              />
              {uploadError && (
                <p className="text-sm font-medium text-destructive">{uploadError}</p>
              )}
            </div>
            {serverError && (
              <p className="text-sm font-medium text-destructive">{serverError}</p>
            )}
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : "Add expense"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
