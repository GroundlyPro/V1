"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, ImageUp, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";

const industries = [
  { value: "lawn_care", label: "Lawn Care & Landscaping" },
  { value: "cleaning", label: "Cleaning Services" },
  { value: "hvac", label: "HVAC" },
  { value: "plumbing", label: "Plumbing" },
  { value: "pest_control", label: "Pest Control" },
  { value: "roofing", label: "Roofing" },
  { value: "electrical", label: "Electrical" },
  { value: "other", label: "Other" },
] as const;

const profileSchema = z.object({
  name: z.string().min(1, "Business name is required"),
  industry: z.string().min(1, "Select an industry"),
  email: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || z.string().email().safeParse(value).success,
      "Enter a valid email"
    ),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
});

export type BusinessProfileValues = z.infer<typeof profileSchema>;

export function BusinessProfileForm({
  businessId,
  logoUrl,
  defaultValues,
  action,
}: {
  businessId: string;
  logoUrl?: string | null;
  defaultValues: BusinessProfileValues;
  action: (
    values: BusinessProfileValues & { logo_url?: string | null }
  ) => Promise<{ error?: string } | void>;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(logoUrl ?? "");

  const form = useForm<BusinessProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues,
  });

  async function uploadLogo(file: File) {
    setUploading(true);
    setServerError(null);

    const supabase = createClient();
    const extension = file.name.split(".").pop() ?? "png";
    const path = `${businessId}/logo-${Date.now()}.${extension}`;
    const { error } = await supabase.storage
      .from("business-logos")
      .upload(path, file, { upsert: true });

    if (error) {
      setServerError(error.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("business-logos").getPublicUrl(path);
    setPreviewUrl(data.publicUrl);
    setUploading(false);
  }

  async function onSubmit(values: BusinessProfileValues) {
    setServerError(null);
    const result = await action({ ...values, logo_url: previewUrl || null });

    if (result?.error) {
      setServerError(result.error);
      return;
    }

    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#dfe8f0] bg-[#f4f7fa]">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Building2 className="size-8 text-[#007bb8]" />
            )}
          </div>
          <div className="space-y-2">
            <FormLabel htmlFor="logo">Logo</FormLabel>
            <Input
              id="logo"
              type="file"
              accept="image/*"
              className="min-h-11"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadLogo(file);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Square PNG or JPG works best for invoices and booking pages.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business name</FormLabel>
                <FormControl>
                  <Input className="min-h-11" placeholder="Plum Landscaping" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="industry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Industry</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="min-h-11 w-full">
                      <SelectValue placeholder="Select your trade" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {industries.map((industry) => (
                      <SelectItem key={industry.value} value={industry.value}>
                        {industry.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input className="min-h-11" type="email" placeholder="office@example.com" {...field} />
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
                  <Input className="min-h-11" type="tel" placeholder="(555) 123-4567" {...field} />
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
              <FormLabel>Street address</FormLabel>
              <FormControl>
                <Input className="min-h-11" placeholder="123 Main St" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input className="min-h-11" placeholder="Austin" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State</FormLabel>
                <FormControl>
                  <Input className="min-h-11" placeholder="TX" maxLength={2} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="zip"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ZIP</FormLabel>
                <FormControl>
                  <Input className="min-h-11" placeholder="78701" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {serverError ? <p className="text-sm font-medium text-destructive">{serverError}</p> : null}

        <Button type="submit" disabled={form.formState.isSubmitting || uploading} className="min-h-11">
          {uploading ? <ImageUp className="size-4 animate-pulse" /> : <Save className="size-4" />}
          {form.formState.isSubmitting ? "Saving..." : "Save profile"}
        </Button>
      </form>
    </Form>
  );
}
