"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Database } from "@/lib/supabase/types";

type LineItem = Database["public"]["Tables"]["job_line_items"]["Row"];

const lineItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  quantity: z.coerce.number<string | number>().min(0.01, "Quantity must be greater than 0"),
  unit_cost: z.coerce.number<string | number>().min(0, "Cost cannot be negative"),
  unit_price: z.coerce.number<string | number>().min(0, "Price cannot be negative"),
});

export type LineItemFormValues = z.infer<typeof lineItemSchema>;
type LineItemFormInput = z.input<typeof lineItemSchema>;

interface LineItemsEditorProps {
  items: LineItem[];
  addAction: (values: LineItemFormValues) => Promise<{ error?: string } | void>;
  removeAction: (formData: FormData) => Promise<void>;
}

function formatCurrency(value: number | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value ?? 0);
}

export function LineItemsEditor({ items, addAction, removeAction }: LineItemsEditorProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<LineItemFormInput, unknown, LineItemFormValues>({
    resolver: zodResolver(lineItemSchema),
    defaultValues: {
      name: "",
      description: "",
      quantity: 1,
      unit_cost: 0,
      unit_price: 0,
    },
  });

  async function onSubmit(values: LineItemFormValues) {
    setServerError(null);
    const result = await addAction(values);

    if (result?.error) {
      setServerError(result.error);
      return;
    }

    form.reset();
    router.refresh();
  }

  const subtotal = items.reduce((sum, item) => sum + (item.total ?? 0), 0);

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No line items yet.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Unit Price</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <p className="font-medium text-gray-900">{item.name}</p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  )}
                </TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                <TableCell>{formatCurrency(item.total)}</TableCell>
                <TableCell>
                  <form action={removeAction}>
                    <input type="hidden" name="lineItemId" value={item.id} />
                    <button
                      className={buttonVariants({ variant: "ghost", size: "icon" })}
                      type="submit"
                      aria-label="Remove line item"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </form>
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={3} className="text-right font-medium">
                Subtotal
              </TableCell>
              <TableCell className="font-semibold">{formatCurrency(subtotal)}</TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="rounded-lg border p-4">
          <div className="grid gap-4 md:grid-cols-[1.2fr_1fr_0.7fr_0.7fr_0.7fr_auto] md:items-end">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Weekly mowing" {...field} />
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Front and back yard" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Qty</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unit_cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unit_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={form.formState.isSubmitting}>
              <Plus className="size-4" />
              Add
            </Button>
          </div>
          {serverError && <p className="mt-3 text-sm font-medium text-destructive">{serverError}</p>}
        </form>
      </Form>
    </div>
  );
}
