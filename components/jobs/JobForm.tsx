"use client";

import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { CalendarDays, CreditCard, MapPin, Save, UserRound } from "lucide-react";
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

type ClientOption = {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string | null;
  client_addresses: {
    id: string;
    label: string | null;
    street1: string;
    street2: string | null;
    city: string;
    state: string;
    zip: string;
    is_primary: boolean | null;
  }[];
};

type TeamMember = {
  id: string;
  first_name: string;
  last_name: string;
  role: string | null;
};

type ServiceOption = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  unit_price: number | null;
  unit_cost: number | null;
  unit: string | null;
};

export const jobFormSchema = z
  .object({
    customer_mode: z.enum(["existing", "new"]),
    client_id: z.string().optional(),
    address_id: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    street1: z.string().optional(),
    street2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    title: z.string().min(1, "Job title is required"),
    type: z.enum(["one_off", "recurring"]),
    status: z.enum(["active", "in_progress", "completed", "closed", "cancelled"]),
    frequency: z.enum(["none", "one_time", "weekly", "biweekly", "monthly"]),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    billing_type: z.enum(["on_completion", "on_visit", "custom"]),
    service_id: z.string().optional(),
    service_name: z.string().min(1, "Service is required"),
    service_description: z.string().optional(),
    quantity: z.coerce.number<string | number>().min(0.01, "Quantity must be greater than 0"),
    unit_cost: z.coerce.number<string | number>().min(0, "Cost cannot be negative"),
    unit_price: z.coerce.number<string | number>().min(0, "Price cannot be negative"),
    wage_percentage: z.coerce.number<string | number>().min(0, "Wages cannot be negative").max(100, "Wages cannot exceed 100%"),
    schedule_visit: z.boolean(),
    visit_title: z.string().optional(),
    scheduled_date: z.string().optional(),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
    assigned_user_id: z.string().optional(),
    instructions: z.string().optional(),
    internal_notes: z.string().optional(),
    customer_note: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.customer_mode === "existing" && !value.client_id) {
      ctx.addIssue({ code: "custom", path: ["client_id"], message: "Client is required" });
    }
    if (value.customer_mode === "existing" && !value.address_id) {
      ctx.addIssue({ code: "custom", path: ["address_id"], message: "Service address is required" });
    }
    if (value.customer_mode === "new") {
      for (const [field, message] of [
        ["first_name", "First name is required"],
        ["last_name", "Last name is required"],
        ["street1", "Street is required"],
        ["city", "City is required"],
        ["state", "State is required"],
      ] as const) {
        if (!value[field]?.trim()) {
          ctx.addIssue({ code: "custom", path: [field], message });
        }
      }
    }
    if (value.schedule_visit && !value.scheduled_date) {
      ctx.addIssue({ code: "custom", path: ["scheduled_date"], message: "Date is required" });
    }
  });

export type JobFormValues = z.output<typeof jobFormSchema>;
type JobFormInputValues = z.input<typeof jobFormSchema>;

interface JobFormProps {
  clients: ClientOption[];
  teamMembers: TeamMember[];
  services: ServiceOption[];
  defaultValues?: JobFormInputValues;
  submitLabel?: string;
  variant?: "booking" | "compact";
  action: (values: JobFormValues) => Promise<{ error?: string } | void>;
}

const emptyValues: JobFormInputValues = {
  customer_mode: "existing",
  client_id: "",
  address_id: "",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  street1: "",
  street2: "",
  city: "",
  state: "",
  zip: "",
  title: "",
  type: "one_off",
  status: "active",
  frequency: "one_time",
  start_date: "",
  end_date: "",
  billing_type: "on_completion",
  service_id: "",
  service_name: "",
  service_description: "",
  quantity: 1,
  unit_cost: 0,
  unit_price: 0,
  wage_percentage: 0,
  schedule_visit: true,
  visit_title: "",
  scheduled_date: "",
  start_time: "",
  end_time: "",
  assigned_user_id: "unassigned",
  instructions: "",
  internal_notes: "",
  customer_note: "",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function clientLabel(client: ClientOption) {
  const name = `${client.first_name} ${client.last_name}`;
  return client.company_name ? `${client.company_name} (${name})` : name;
}

function addressLabel(address: ClientOption["client_addresses"][number]) {
  const label = address.label || (address.is_primary ? "Primary" : "Service address");
  return [label, address.street1, address.street2, address.city, address.state, address.zip]
    .filter(Boolean)
    .join(", ");
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof UserRound;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-[#e8eef4] px-6 py-6 last:border-b-0">
      <div className="mb-5 flex items-center gap-2">
        <Icon className="size-4 text-[#007bb8]" />
        <h2 className="text-[18px] font-semibold text-[#1a2d3d]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function JobForm({
  clients,
  teamMembers,
  services,
  defaultValues,
  submitLabel = "Save job",
  variant = "booking",
  action,
}: JobFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<JobFormInputValues, unknown, JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: defaultValues ?? {
      ...emptyValues,
      service_id: services[0]?.id ?? "",
      service_name: services[0]?.name ?? "",
      service_description: services[0]?.description ?? "",
      unit_cost: services[0]?.unit_cost ?? 0,
      unit_price: services[0]?.unit_price ?? 0,
      title: services[0]?.name ?? "",
    },
  });

  const customerMode = useWatch({ control: form.control, name: "customer_mode" });
  const selectedClientId = useWatch({ control: form.control, name: "client_id" });
  const selectedAddressId = useWatch({ control: form.control, name: "address_id" });
  const selectedServiceId = useWatch({ control: form.control, name: "service_id" });
  const selectedAssignedUserId = useWatch({ control: form.control, name: "assigned_user_id" });
  const quantity = Number(useWatch({ control: form.control, name: "quantity" }) || 0);
  const unitPrice = Number(useWatch({ control: form.control, name: "unit_price" }) || 0);
  const wagePercentage = Number(useWatch({ control: form.control, name: "wage_percentage" }) || 0);
  const scheduleVisit = useWatch({ control: form.control, name: "schedule_visit" });

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId),
    [clients, selectedClientId]
  );
  const selectedAddress = useMemo(
    () => selectedClient?.client_addresses.find((address) => address.id === selectedAddressId),
    [selectedClient, selectedAddressId]
  );
  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId),
    [services, selectedServiceId]
  );
  const selectedTeamMember = useMemo(
    () => teamMembers.find((member) => member.id === selectedAssignedUserId),
    [teamMembers, selectedAssignedUserId]
  );
  const serviceTotal = quantity * unitPrice;
  const wageAmount = serviceTotal * (wagePercentage / 100);
  const netAfterWages = serviceTotal - wageAmount;

  async function onSubmit(values: JobFormValues) {
    setServerError(null);
    const result = await action({
      ...values,
      client_id: values.client_id ?? "",
      address_id: values.address_id ?? "",
      assigned_user_id:
        values.assigned_user_id === "unassigned" ? undefined : values.assigned_user_id,
    });

    if (result?.error) {
      setServerError(result.error);
      return;
    }

    router.refresh();
  }

  if (variant === "compact") {
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
                      const client = clients.find((item) => item.id === value);
                      const primary =
                        client?.client_addresses.find((address) => address.is_primary) ??
                        client?.client_addresses[0];
                      form.setValue("address_id", primary?.id ?? "");
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
              name="address_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service address</FormLabel>
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        {selectedAddress ? (
                          <span className="min-w-0 flex-1 truncate text-left">{addressLabel(selectedAddress)}</span>
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
                <FormLabel>Job title</FormLabel>
                <FormControl>
                  <Input placeholder="Mulch Bed Maintenance" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 md:grid-cols-3">
            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem><FormLabel>Status</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="in_progress">In progress</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="closed">Closed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="frequency" render={({ field }) => (
              <FormItem><FormLabel>Frequency</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="one_time">One time</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="biweekly">Biweekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent></Select><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="billing_type" render={({ field }) => (
              <FormItem><FormLabel>Billing</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="on_completion">On completion</SelectItem><SelectItem value="on_visit">On visit</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent></Select><FormMessage /></FormItem>
            )} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField control={form.control} name="start_date" render={({ field }) => (
              <FormItem><FormLabel>Start date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="end_date" render={({ field }) => (
              <FormItem><FormLabel>End date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>

          <FormField control={form.control} name="instructions" render={({ field }) => (
            <FormItem><FormLabel>Field instructions</FormLabel><FormControl><Textarea placeholder="Gate code, materials, access notes..." {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="internal_notes" render={({ field }) => (
            <FormItem><FormLabel>Internal notes</FormLabel><FormControl><Textarea placeholder="Pricing, scope, office-only details..." {...field} /></FormControl><FormMessage /></FormItem>
          )} />

          {serverError ? <p className="text-sm font-medium text-destructive">{serverError}</p> : null}

          <Button type="submit" disabled={form.formState.isSubmitting}>
            <Save className="size-4" />
            {form.formState.isSubmitting ? "Saving..." : submitLabel}
          </Button>
        </form>
      </Form>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="overflow-hidden rounded-lg border border-[#dfe8f0] bg-white">
          <div className="flex border-b border-[#dfe8f0] bg-[#f8fbfd] px-6">
            <button type="button" className="border-t-2 border-[#007bb8] bg-white px-5 py-4 text-sm font-semibold text-[#1a2d3d]">
              Job Details
            </button>
          </div>

          <Section title="Where Will The Service Be Taking Place?" icon={MapPin}>
            <div className="grid gap-5">
              <FormField
                control={form.control}
                name="customer_mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <div className="flex flex-wrap gap-4 text-sm text-[#2f4556]">
                      {[
                        ["new", "New customer"],
                        ["existing", "Existing customer"],
                      ].map(([value, label]) => (
                        <label key={value} className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={field.value === value}
                            onChange={() => field.onChange(value)}
                            className="size-4 accent-[#2677ff]"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {customerMode === "existing" ? (
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
                            const client = clients.find((item) => item.id === value);
                            const primary =
                              client?.client_addresses.find((address) => address.is_primary) ??
                              client?.client_addresses[0];
                            form.setValue("address_id", primary?.id ?? "");
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
                    name="address_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service address</FormLabel>
                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              {selectedAddress ? (
                                <span className="min-w-0 flex-1 truncate text-left">{addressLabel(selectedAddress)}</span>
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
              ) : (
                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField control={form.control} name="first_name" render={({ field }) => (
                      <FormItem><FormLabel>First name</FormLabel><FormControl><Input placeholder="Ex: James" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="last_name" render={({ field }) => (
                      <FormItem><FormLabel>Last name</FormLabel><FormControl><Input placeholder="Ex: Lee" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel>Email address</FormLabel><FormControl><Input type="email" placeholder="example@xyz.com" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem><FormLabel>Phone</FormLabel><FormControl><Input type="tel" placeholder="(555) 123-4567" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="street1" render={({ field }) => (
                    <FormItem><FormLabel>Street address</FormLabel><FormControl><Input placeholder="123 Oak Street" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid gap-4 md:grid-cols-[1fr_120px_140px]">
                    <FormField control={form.control} name="city" render={({ field }) => (
                      <FormItem><FormLabel>City</FormLabel><FormControl><Input placeholder="Austin" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="state" render={({ field }) => (
                      <FormItem><FormLabel>State</FormLabel><FormControl><Input placeholder="TX" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="zip" render={({ field }) => (
                      <FormItem><FormLabel>ZIP</FormLabel><FormControl><Input placeholder="78701" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                </div>
              )}
            </div>
          </Section>

          <Section title="Services" icon={Save}>
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-[1fr_120px_140px]">
                <FormField
                  control={form.control}
                  name="service_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          const service = services.find((item) => item.id === value);
                          form.setValue("service_name", service?.name ?? "");
                          form.setValue("service_description", service?.description ?? "");
                          form.setValue("unit_cost", Number(service?.unit_cost ?? 0));
                          form.setValue("unit_price", Number(service?.unit_price ?? 0));
                          if (!form.getValues("title")) form.setValue("title", service?.name ?? "");
                        }}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            {selectedService ? (
                              <span className="min-w-0 flex-1 truncate text-left">{selectedService.name}</span>
                            ) : (
                              <SelectValue placeholder="Select service" />
                            )}
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {services.map((service) => (
                            <SelectItem key={service.id} value={service.id}>
                              {service.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField control={form.control} name="quantity" render={({ field }) => (
                  <FormItem><FormLabel>Quantity</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="unit_price" render={({ field }) => (
                  <FormItem><FormLabel>Price</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Job title</FormLabel><FormControl><Input placeholder="Home Cleaning" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="service_description" render={({ field }) => (
                <FormItem><FormLabel>Service description</FormLabel><FormControl><Textarea placeholder="Scope, rooms, materials, or service details." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </Section>

          <Section title="Frequency & Booking Adjustments" icon={CalendarDays}>
            <div className="grid gap-5">
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {[
                        ["one_time", "One-time"],
                        ["weekly", "Weekly"],
                        ["biweekly", "Every other week"],
                        ["monthly", "Every 4 weeks"],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            field.onChange(value);
                            form.setValue("type", value === "one_time" ? "one_off" : "recurring");
                          }}
                          className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                            field.value === value
                              ? "bg-[#14c4e8] text-white"
                              : "bg-[#eaf1f7] text-[#607789] hover:bg-[#dfeaf2]"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 md:grid-cols-3">
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>Status</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="in_progress">In progress</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="closed">Closed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="start_date" render={({ field }) => (
                  <FormItem><FormLabel>Start date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="end_date" render={({ field }) => (
                  <FormItem><FormLabel>End date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>
          </Section>

          <Section title="Choose Service Provider" icon={UserRound}>
            <div className="grid gap-4">
              <FormField
                control={form.control}
                name="schedule_visit"
                render={({ field }) => (
                  <FormItem>
                    <label className="flex items-center gap-2 text-sm font-medium text-[#2f4556]">
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={(event) => field.onChange(event.target.checked)}
                        className="size-4 accent-[#2677ff]"
                      />
                      Schedule first appointment
                    </label>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {scheduleVisit ? (
                <div className="grid gap-4 md:grid-cols-5">
                  <FormField control={form.control} name="scheduled_date" render={({ field }) => (
                    <FormItem><FormLabel>Select date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="start_time" render={({ field }) => (
                    <FormItem><FormLabel>Start</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="end_time" render={({ field }) => (
                    <FormItem><FormLabel>End</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="assigned_user_id" render={({ field }) => (
                    <FormItem><FormLabel>Provider</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger className="w-full">{field.value === "unassigned" ? <span className="min-w-0 flex-1 truncate text-left">Unassigned</span> : selectedTeamMember ? <span className="min-w-0 flex-1 truncate text-left">{selectedTeamMember.first_name} {selectedTeamMember.last_name}</span> : <SelectValue />}</SelectTrigger></FormControl><SelectContent><SelectItem value="unassigned">Unassigned</SelectItem>{teamMembers.map((member) => (<SelectItem key={member.id} value={member.id}>{member.first_name} {member.last_name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="wage_percentage" render={({ field }) => (
                    <FormItem><FormLabel>Wages %</FormLabel><FormControl><Input type="number" min="0" max="100" step="0.01" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              ) : null}
            </div>
          </Section>

          <Section title="Key Information & Job Notes" icon={CreditCard}>
            <div className="grid gap-5">
              <FormField control={form.control} name="customer_note" render={({ field }) => (
                <FormItem><FormLabel>Customer note for provider</FormLabel><FormControl><Textarea placeholder="Special notes and instructions" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="instructions" render={({ field }) => (
                <FormItem><FormLabel>Field instructions</FormLabel><FormControl><Textarea placeholder="Gate code, access notes, materials, parking, or checklist details." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="internal_notes" render={({ field }) => (
                <FormItem><FormLabel>Private booking note</FormLabel><FormControl><Textarea placeholder="Office-only notes, pricing rationale, or source details." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="billing_type" render={({ field }) => (
                <FormItem><FormLabel>Payment information</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger className="w-full md:w-[260px]"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="on_completion">On completion</SelectItem><SelectItem value="on_visit">On visit</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent></Select><FormMessage /></FormItem>
              )} />
            </div>
          </Section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <div className="rounded-lg border border-[#dfe8f0] bg-white p-5">
            <h3 className="border-b border-[#e8eef4] pb-3 text-[15px] font-bold text-[#1a2d3d]">
              Booking Summary
            </h3>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-[#6d8190]">Customer</dt><dd className="text-right font-semibold text-[#1a2d3d]">{customerMode === "existing" && selectedClient ? clientLabel(selectedClient) : `${form.watch("first_name") || "New"} ${form.watch("last_name") || "customer"}`}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#6d8190]">Service</dt><dd className="text-right font-semibold text-[#1a2d3d]">{selectedService?.name || form.watch("service_name") || "Service"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#6d8190]">Frequency</dt><dd className="text-right font-semibold text-[#1a2d3d]">{form.watch("frequency").replace("_", " ")}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#6d8190]">Visit</dt><dd className="text-right font-semibold text-[#1a2d3d]">{form.watch("scheduled_date") || "Not scheduled"}</dd></div>
            </dl>
          </div>

          <div className="rounded-lg border border-[#dfe8f0] bg-white p-5">
            <h3 className="border-b border-[#e8eef4] pb-3 text-[15px] font-bold text-[#1a2d3d]">
              Payment Summary
            </h3>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-[#6d8190]">Service total</dt><dd className="font-bold text-[#1a2d3d]">{formatCurrency(serviceTotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-[#6d8190]">Provider wages ({wagePercentage.toFixed(2).replace(/\.00$/, "")}%)</dt><dd className="font-bold text-[#1a2d3d]">{formatCurrency(wageAmount)}</dd></div>
              <div className="flex justify-between"><dt className="text-[#6d8190]">Discounted total</dt><dd className="font-bold text-[#1a2d3d]">{formatCurrency(0)}</dd></div>
              <div className="flex justify-between"><dt className="text-[#6d8190]">Net after wages</dt><dd className="font-bold text-[#1a2d3d]">{formatCurrency(netAfterWages)}</dd></div>
              <div className="flex justify-between border-t border-[#e8eef4] pt-2"><dt className="font-bold text-[#1a2d3d]">Total</dt><dd className="font-bold text-[#1a2d3d]">{formatCurrency(serviceTotal)}</dd></div>
            </dl>
          </div>

          {serverError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {serverError}
            </div>
          ) : null}

          <Button type="submit" disabled={form.formState.isSubmitting} className="h-12 w-full bg-[#14bf9f] text-base hover:bg-[#10a98c]">
            <Save className="size-4" />
            {form.formState.isSubmitting ? "Saving..." : submitLabel}
          </Button>
          <Button type="button" variant="outline" className="h-12 w-full border-[#2f6bed] text-base font-semibold text-[#2f6bed]" onClick={() => router.push("/jobs")}>
            Cancel
          </Button>
        </aside>
      </form>
    </Form>
  );
}
