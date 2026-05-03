"use client";

export async function openQuoContact(clientId: string) {
  const response = await fetch(`/api/clients/${clientId}/quo-contact`, {
    method: "POST",
  });

  const result = (await response.json().catch(() => null)) as { error?: string; url?: string } | null;
  if (!response.ok || !result?.url) {
    throw new Error(result?.error ?? "Unable to open Quo contact.");
  }

  window.open(result.url, "_blank", "noopener,noreferrer");
}
