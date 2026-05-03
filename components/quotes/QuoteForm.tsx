"use client";

import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Save, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import type { QuoteStatus } from "@/lib/supabase/queries/quotes";

type ClientOption = {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string | null;
  client_addresses: {
    id: string;
    label: string | null;
    street1: string;
    city: string;
    state: string;
    is_primary: boolean | null;
  }[];
};

export type TeamMemberOption = {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  email: string | null;
};

export const quoteFormSchema = z.object({
  client_id: z.string().min(1, "Client is required"),
  address_id: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  status: z.enum(["draft", "sent", "approved", "changes_requested", "declined", "expired"]),
  frequency: z.enum(["none", "one_time", "weekly", "biweekly", "monthly"]).optional(),
  valid_until: z.string().optional(),
  message_to_client: z.string().optional(),
  internal_notes: z.string().optional(),
  assigned_user_id: z.string().optional(),
  assigned_wage: z.number().optional(),
  assigned_wage_type: z.enum(["percent", "flat"]).optional(),
  line_item_name: z.string().optional(),
  line_item_description: z.string().optional(),
  quantity: z.coerce.number<string | number>().optional(),
  unit_cost: z.coerce.number<string | number>().optional(),
  unit_price: z.coerce.number<string | number>().optional(),
});

export type QuoteFormValues = z.output<typeof quoteFormSchema>;
type QuoteFormInputValues = z.input<typeof quoteFormSchema>;

interface QuoteFormProps {
  clients: ClientOption[];
  teamMembers?: TeamMemberOption[];
  defaultValues?: QuoteFormValues;
  submitLabel?: string;
  showPricingFields?: boolean;
  createdAtLabel?: string;
  action: (values: QuoteFormValues) => Promise<{ error?: string } | void>;
}

const emptyValues: QuoteFormInputValues = {
  client_id: "",
  address_id: "",
  title: "",
  status: "draft",
  frequency: "one_time",
  valid_until: "",
  message_to_client: "",
  internal_notes: "",
  assigned_user_id: "",
  assigned_wage: 0,
  assigned_wage_type: "percent",
  line_item_name: "",
  line_item_description: "",
  quantity: 1,
  unit_cost: 0,
  unit_price: 0,
};

function clientLabel(client: ClientOption) {
  const name = `${client.first_name} ${client.last_name}`;
  return client.company_name ? `${client.company_name} (${name})` : name;
}

function addressLabel(address: ClientOption["client_addresses"][number]) {
  const label = address.label || (address.is_primary ? "Primary" : "Service address");
  return `${label}: ${address.street1}, ${address.city}, ${address.state}`;
}

const quoteStatusLabels: Record<QuoteStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  approved: "Approved",
  changes_requested: "Changes requested",
  declined: "Declined",
  expired: "Expired",
};

export function QuoteForm({
  clients,
  teamMembers = [],
  defaultValues,
  submitLabel = "Save quote",
  showPricingFields = false,
  createdAtLabel,
  action,
}: QuoteFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<QuoteFormInputValues, undefined, QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: defaultValues ?? emptyValues,
  });

  const selectedClientId = useWatch({ control: form.control, name: "client_id" });
  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId),
    [clients, selectedClientId]
  );

  const selectedAddressId = useWatch({ control: form.control, name: "address_id" });
  const selectedAddress = useMemo(
    () => selectedClient?.client_addresses.find((a) => a.id === selectedAddressId),
    [selectedClient, selectedAddressId]
  );

  const assignedUserId = useWatch({ control: form.control, name: "assigned_user_id" });
  const assignedMember = useMemo(
    () => teamMembers.find((m) => m.id === assignedUserId),
    [teamMembers, assignedUserId]
  );
  const quantity = Number(useWatch({ control: form.control, name: "quantity" }) || 0);
  const unitPrice = Number(useWatch({ control: form.control, name: "unit_price" }) || 0);
  const initialTotal = quantity * unitPrice;

  async function onSubmit(values: QuoteFormValues) {
    setServerError(null);
    const result = await action(values);

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
                    const client = clients.find((c) => c.id === value);
                    const primary =
                      client?.client_addresses.find((a) => a.is_primary) ??
                      client?.client_addresses[0];
                    form.setValue("address_id", primary?.id ?? "");
                  }}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      {selectedClient ? (
                        <span className="flex flex-1 truncate text-left text-sm">
                          {clientLabel(selectedClient)}
                        </span>
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
            name="address_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service address</FormLabel>
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      {selectedAddress ? (
                        <span className="flex flex-1 truncate text-left text-sm">
                          {addressLabel(selectedAddress)}
                        </span>
                      ) : (
                        <SelectValue placeholder="Select an address" />
                      )}
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(selectedClient?.client_addresses ?? []).map((address) => (
                      <SelectItem key={address.id} value={address.id}>
                        {addressLabel(address)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quote title</FormLabel>
              <FormControl>
                <Input placeholder="Spring Mulch Install" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <span>{quoteStatusLabels[field.value as QuoteStatus]}</span>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="changes_requested">Changes requested</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="frequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Frequency</FormLabel>
                <Select value={field.value ?? "one_time"} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="one_time">One time</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Biweekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormItem>
            <FormLabel>Created at</FormLabel>
            <FormControl>
              <Input value={createdAtLabel ?? ""} readOnly disabled />
            </FormControl>
          </FormItem>

          <FormField
            control={form.control}
            name="valid_until"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valid until</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {showPricingFields && (
          <div className="space-y-4 rounded-lg border border-[#dfe8f0] p-4">
            <div>
              <p className="text-sm font-semibold text-[#1a2d3d]">Pricing</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create the first priced line item with the quote.
              </p>
            </div>

            <FormField
              control={form.control}
              name="line_item_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Line item name</FormLabel>
                  <FormControl>
                    <Input placeholder="General Maintenance" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="line_item_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Scope, materials, frequency, or service details." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.01" {...field} />
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
                      <Input type="number" min={0} step="0.01" {...field} />
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
                      <Input type="number" min={0} step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end border-t border-[#e8eef4] pt-3">
              <div className="text-sm">
                <span className="text-[#6d8190]">Initial total: </span>
                <span className="font-semibold text-[#1a2d3d]">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(initialTotal)}
                </span>
              </div>
            </div>
          </div>
        )}

        {teamMembers.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium leading-none">Assign Team Member</p>
            {assignedMember ? (
              <div className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                    {assignedMember.first_name[0]}{assignedMember.last_name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">
                      {assignedMember.first_name} {assignedMember.last_name}
                    </p>
                    {assignedMember.email && (
                      <p className="text-sm text-muted-foreground truncate">{assignedMember.email}</p>
                    )}
                    <p className="text-sm text-muted-foreground capitalize">{assignedMember.role.replace("_", " ")}</p>
                  </div>
                  <div className="flex items-end gap-2">
                    <FormField
                      control={form.control}
                      name="assigned_wage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Wage</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              className="w-20"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="assigned_wage_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="sr-only">Wage type</FormLabel>
                          <Select value={field.value ?? "percent"} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="w-20">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="percent">%</SelectItem>
                              <SelectItem value="flat">$</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <div className="flex justify-between">
                  <FormField
                    control={form.control}
                    name="assigned_user_id"
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <UserRound className="size-3.5" />
                          <span>Change</span>
                        </SelectTrigger>
                        <SelectContent>
                          {teamMembers.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.first_name} {m.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      form.setValue("assigned_user_id", "");
                      form.setValue("assigned_wage", 0);
                      form.setValue("assigned_wage_type", "percent");
                    }}
                  >
                    <X className="size-3.5" />
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <FormField
                control={form.control}
                name="assigned_user_id"
                render={({ field }) => (
                  <FormItem>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue("assigned_wage", 0);
                        form.setValue("assigned_wage_type", "percent");
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full border-dashed text-muted-foreground">
                          <UserRound className="size-4" />
                          <SelectValue placeholder="Select a team member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {teamMembers.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.first_name} {m.last_name} — {m.role.replace("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        )}

        <FormField
          control={form.control}
          name="message_to_client"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message to client</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Thank you for the opportunity. This quote covers..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="internal_notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Internal notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Pricing rationale, scope notes, office-only details..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {serverError && <p className="text-sm font-medium text-destructive">{serverError}</p>}

        <Button type="submit" disabled={form.formState.isSubmitting}>
          <Save className="size-4" />
          {form.formState.isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
