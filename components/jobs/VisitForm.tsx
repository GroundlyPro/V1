"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";
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

type TeamMember = {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
};

const visitSchema = z.object({
  title: z.string().min(1, "Title is required"),
  scheduled_date: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  assigned_user_id: z.string().optional(),
  instructions: z.string().optional(),
});

export type VisitFormValues = z.infer<typeof visitSchema>;

interface VisitFormProps {
  teamMembers: TeamMember[];
  action: (values: VisitFormValues) => Promise<{ error?: string } | void>;
}

export function VisitForm({ teamMembers, action }: VisitFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<VisitFormValues>({
    resolver: zodResolver(visitSchema),
    defaultValues: {
      title: "Visit",
      scheduled_date: "",
      start_time: "",
      end_time: "",
      assigned_user_id: "unassigned",
      instructions: "",
    },
  });

  async function onSubmit(values: VisitFormValues) {
    setServerError(null);
    const result = await action({
      ...values,
      assigned_user_id:
        values.assigned_user_id === "unassigned" ? undefined : values.assigned_user_id,
    });

    if (result?.error) {
      setServerError(result.error);
      return;
    }

    form.reset();
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center gap-2 font-medium text-gray-900">
          <CalendarPlus className="size-4 text-brand" />
          Schedule visit
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="Initial service visit" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="assigned_user_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assign tech</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.first_name} {member.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="scheduled_date"
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
          <FormField
            control={form.control}
            name="start_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="end_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="instructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Instructions</FormLabel>
              <FormControl>
                <Textarea placeholder="Visit-specific notes for the tech..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {serverError && <p className="text-sm font-medium text-destructive">{serverError}</p>}

        <Button type="submit" variant="outline" disabled={form.formState.isSubmitting}>
          <CalendarPlus className="size-4" />
          {form.formState.isSubmitting ? "Scheduling..." : "Schedule visit"}
        </Button>
      </form>
    </Form>
  );
}
