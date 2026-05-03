"use client";

import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { ImageUp, Save, UserRound } from "lucide-react";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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

type ClientOption = {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
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

type TeamMemberOption = {
  id: string;
  first_name: string;
  last_name: string;
  role: string | null;
  email: string | null;
};

const emailField = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || z.string().email().safeParse(value).success,
    "Enter a valid email"
  )
  .optional();

export const requestFormSchema = z.object({
  client_id: z.string().min(1, "Client is required"),
  email: emailField,
  phone: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  service_type: z.string().min(1, "Choose a service"),
  requested_on: z.string().min(1, "Request date is required"),
  reminder_at: z.string().optional(),
  assigned_to: z.string().optional(),
  image_url: z.string().optional(),
  message: z.string().optional(),
});

export type RequestFormValues = z.infer<typeof requestFormSchema>;
type RequestFormInputValues = z.input<typeof requestFormSchema>;

interface RequestFormProps {
  businessId: string;
  clients: ClientOption[];
  teamMembers: TeamMemberOption[];
  submitLabel?: string;
  action: (values: RequestFormValues) => Promise<{ error?: string } | void>;
}

function today() {
  return new Date().toISOString().split("T")[0];
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

function imagePath(businessId: string, clientId: string, fileName: string) {
  const ext = fileName.split(".").pop() ?? "jpg";
  return `${businessId}/${clientId}/${Date.now()}.${ext}`;
}

const services = [
  "General maintenance",
  "Mulch installation",
  "Seasonal cleanup",
  "Irrigation repair",
  "Landscape design",
  "Other",
];

const UNASSIGNED = "unassigned";

export function RequestForm({
  businessId,
  clients,
  teamMembers,
  submitLabel = "Create request",
  action,
}: RequestFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");

  const form = useForm<RequestFormInputValues, undefined, RequestFormValues>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      client_id: "",
      email: "",
      phone: "",
      address: "",
      service_type: "",
      requested_on: today(),
      reminder_at: "",
      assigned_to: UNASSIGNED,
      image_url: "",
      message: "",
    },
  });

  const selectedClientId = useWatch({ control: form.control, name: "client_id" });
  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId),
    [clients, selectedClientId]
  );

  async function uploadImage(file: File, clientId: string) {
    setUploading(true);
    setUploadError(null);

    const supabase = createClient();
    const path = imagePath(businessId, clientId, file.name);
    const { error } = await supabase.storage
      .from("request-images")
      .upload(path, file, { upsert: false });

    if (error) {
      setUploadError(error.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("request-images").getPublicUrl(path);
    form.setValue("image_url", data.publicUrl, { shouldDirty: true });
    setImagePreviewUrl(data.publicUrl);
    setUploading(false);
  }

  async function onSubmit(values: RequestFormValues) {
    setServerError(null);
    setUploadError(null);
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
                    const client = clients.find((item) => item.id === value);
                    const primaryAddress =
                      client?.client_addresses.find((address) => address.is_primary) ??
                      client?.client_addresses[0];
                    form.setValue("email", client?.email ?? "");
                    form.setValue("phone", client?.phone ?? "");
                    form.setValue("address", primaryAddress ? addressLabel(primaryAddress) : "");
                  }}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      {selectedClient ? (
                        <span className="min-w-0 flex-1 truncate text-left">
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
            name="assigned_to"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Team assignee</FormLabel>
                <Select value={field.value ?? UNASSIGNED} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <UserRound className="size-4" />
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.first_name} {member.last_name}
                        {member.role ? ` - ${member.role.replace("_", " ")}` : ""}
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
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input type="tel" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Service address</FormLabel>
              <FormControl>
                <Input placeholder="Street, city, state, zip" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="service_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service} value={service}>
                        {service}
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
            name="requested_on"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Request date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reminder_at"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reminder</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-3 rounded-lg border border-[#dfe8f0] p-4">
          <div className="space-y-1">
            <FormLabel htmlFor="request-image">Image upload</FormLabel>
            <Input
              id="request-image"
              type="file"
              accept="image/*"
              className="min-h-11"
              onChange={(event) => {
                const file = event.target.files?.[0];
                const clientId = form.getValues("client_id");
                if (file && clientId) {
                  void uploadImage(file, clientId);
                } else if (file) {
                  setUploadError("Select a client before uploading an image.");
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Uploaded to the Supabase `request-images` bucket.
            </p>
          </div>
          {imagePreviewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagePreviewUrl} alt="" className="max-h-48 rounded-lg border object-cover" />
          ) : null}
          {uploadError ? <p className="text-sm font-medium text-destructive">{uploadError}</p> : null}
        </div>

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Request notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Scope, property details, access notes, or follow-up context." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {serverError ? <p className="text-sm font-medium text-destructive">{serverError}</p> : null}

        <Button type="submit" disabled={form.formState.isSubmitting || uploading}>
          {uploading ? <ImageUp className="size-4 animate-pulse" /> : <Save className="size-4" />}
          {form.formState.isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
