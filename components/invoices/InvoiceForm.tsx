"use client";

import { useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ClientOption = {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string | null;
};

type JobOption = {
  id: string;
  client_id: string;
  title: string;
  job_number: string;
  total_price: number | null;
};

const invoiceLineItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  quantity: z.coerce.number<string | number>().min(0.01, "Quantity must be greater than 0"),
  unit_price: z.coerce.number<string | number>().min(0, "Price cannot be negative"),
});

export const invoiceFormSchema = z.object({
  client_id: z.string().min(1, "Client is required"),
  job_id: z.string().optional(),
  issue_date: z.string().min(1, "Issue date is required"),
  due_date: z.string().min(1, "Due date is required"),
  notes: z.string().optional(),
  line_items: z.array(invoiceLineItemSchema).min(1, "At least one line item is required"),
});

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;
type InvoiceFormInput = z.input<typeof invoiceFormSchema>;

interface InvoiceFormProps {
  clients: ClientOption[];
  jobs: JobOption[];
  action: (values: InvoiceFormValues) => Promise<{ error?: string } | void>;
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function dueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString().split("T")[0];
}

function clientLabel(client: ClientOption) {
  const name = `${client.first_name} ${client.last_name}`;
  return client.company_name ? `${client.company_name} (${name})` : name;
}

function jobLabel(job: JobOption) {
  return `${job.title} - ${job.job_number}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function InvoiceForm({ clients, jobs, action }: InvoiceFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<InvoiceFormInput, unknown, InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      client_id: "",
      job_id: "none",
      issue_date: today(),
      due_date: dueDate(),
      notes: "",
      line_items: [{ name: "", description: "", quantity: 1, unit_price: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "line_items",
  });
  const selectedClientId = useWatch({ control: form.control, name: "client_id" });
  const selectedJobId = useWatch({ control: form.control, name: "job_id" });
  const lineItems = useWatch({ control: form.control, name: "line_items" });
  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId),
    [clients, selectedClientId]
  );
  const clientJobs = useMemo(
    () => jobs.filter((job) => job.client_id === selectedClientId),
    [jobs, selectedClientId]
  );
  const selectedJob = useMemo(
    () => clientJobs.find((job) => job.id === selectedJobId),
    [clientJobs, selectedJobId]
  );
  const subtotal = (lineItems ?? []).reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0),
    0
  );

  async function onSubmit(values: InvoiceFormValues) {
    setServerError(null);
    const result = await action({ ...values, job_id: values.job_id === "none" ? "" : values.job_id });

    if (result?.error) {
      setServerError(result.error);
      return;
    }

    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="client_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    form.setValue("job_id", "none");
                  }}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      {selectedClient ? (
                        <span className="min-w-0 flex-1 truncate text-left">{clientLabel(selectedClient)}</span>
                      ) : (
                        <SelectValue placeholder="Select a client" />
                      )}
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {clientLabel(client)}
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
            name="job_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Job</FormLabel>
                <Select value={field.value ?? "none"} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      {field.value === "none" ? (
                        <span className="min-w-0 flex-1 truncate text-left">No job</span>
                      ) : selectedJob ? (
                        <span className="min-w-0 flex-1 truncate text-left">{jobLabel(selectedJob)}</span>
                      ) : (
                        <SelectValue />
                      )}
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No job</SelectItem>
                    {clientJobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {jobLabel(job)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="issue_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Issue date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="due_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <FormLabel>Line items</FormLabel>
            <Button
              type="button"
              variant="outline"
              onClick={() => append({ name: "", description: "", quantity: 1, unit_price: 0 })}
            >
              <Plus className="size-4" />
              Add item
            </Button>
          </div>
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_1fr_120px_140px_40px] md:items-start"
              >
                <FormField
                  control={form.control}
                  name={`line_items.${index}.name`}
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
                  name={`line_items.${index}.description`}
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
                  name={`line_items.${index}.quantity`}
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
                  name={`line_items.${index}.unit_price`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit price</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <button
                  type="button"
                  className={buttonVariants({
                    variant: "ghost",
                    size: "icon",
                    className: "mt-6",
                  })}
                  onClick={() => fields.length > 1 && remove(index)}
                  aria-label="Remove line item"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex justify-end text-sm">
            <span className="font-medium text-gray-900">Subtotal: {formatCurrency(subtotal)}</span>
          </div>
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Payment terms, project notes, or client-facing memo..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {serverError && <p className="text-sm font-medium text-destructive">{serverError}</p>}

        <Button type="submit" disabled={form.formState.isSubmitting}>
          <Save className="size-4" />
          {form.formState.isSubmitting ? "Saving..." : "Create invoice"}
        </Button>
      </form>
    </Form>
  );
}
