"use client";

import { useState, useTransition } from "react";
import { FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ConvertToQuoteModal({
  action,
  disabled = false,
}: {
  action: () => Promise<{ error?: string } | void>;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onConvert() {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground disabled:pointer-events-none disabled:opacity-50"
        disabled={disabled}
      >
        <FilePlus2 className="size-4" />
        Convert to Quote
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert request to quote?</DialogTitle>
          <DialogDescription>
            This creates a draft quote, links it to the request, and marks the request converted.
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={onConvert} disabled={pending}>
            {pending ? "Converting..." : "Create quote"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
