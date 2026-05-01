"use client";

import { useState } from "react";
import { LinkIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaymentLinkButtonProps {
  invoiceId: string;
}

export function PaymentLinkButton({ invoiceId }: PaymentLinkButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  async function createPaymentLink() {
    setIsLoading(true);
    setMessage(null);
    setPaymentUrl(null);

    try {
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Unable to create payment link.");
      }

      setPaymentUrl(payload.url);

      try {
        await navigator.clipboard.writeText(payload.url);
        setMessage("Payment link copied");
      } catch {
        setMessage("Payment link created");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create payment link.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button type="button" variant="outline" onClick={createPaymentLink} disabled={isLoading}>
        {isLoading ? <Loader2 className="size-4 animate-spin" /> : <LinkIcon className="size-4" />}
        Send Payment Link
      </Button>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
      {paymentUrl && (
        <a
          href={paymentUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium text-brand hover:underline"
        >
          Open checkout
        </a>
      )}
    </div>
  );
}
