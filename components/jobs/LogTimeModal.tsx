"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
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

const schema = z.object({
  user_id: z.string().min(1, "Select a team member"),
  date: z.string().min(1, "Date is required"),
  hours: z.coerce.number<string | number>().min(0.25, "Minimum 0.25 hours"),
  hourly_rate: z.coerce.number<string | number>().min(0, "Rate must be 0 or more"),
  notes: z.string().optional(),
});

export type LogTimeFormValues = z.infer<typeof schema>;
type LogTimeFormInput = z.input<typeof schema>;

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
}

interface LogTimeModalProps {
  teamMembers: TeamMember[];
  action: (values: LogTimeFormValues) => Promise<{ error?: string } | void>;
}

function today() {
  return new Date().toISOString().split("T")[0];
}

export function LogTimeModal({ teamMembers, action }: LogTimeModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<LogTimeFormInput, unknown, LogTimeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      user_id: teamMembers[0]?.id ?? "",
      date: today(),
      hours: 1,
      hourly_rate: 25,
      notes: "",
    },
  });

  async function onSubmit(values: LogTimeFormValues) {
    setServerError(null);
    const result = await action(values);
    if (result?.error) {
      setServerError(result.error);
      return;
    }
    form.reset({ user_id: teamMembers[0]?.id ?? "", date: today(), hours: 1, hourly_rate: 25, notes: "" });
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Clock className="size-4" />
        Log Time
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Time</DialogTitle>
          <DialogDescription>Record hours worked on this job.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team member</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teamMembers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.first_name} {m.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-3">
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
              <FormField
                control={form.control}
                name="hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hours</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.25" min="0.25" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hourly_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rate ($/hr)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="What was worked on..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {serverError && (
              <p className="text-sm font-medium text-destructive">{serverError}</p>
            )}
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : "Log time"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
