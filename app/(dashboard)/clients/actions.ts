"use server";

import { revalidatePath } from "next/cache";
import { deleteClient, updateClientStatus } from "@/lib/supabase/queries/clients";

export async function deleteClientAction(clientId: string) {
  if (!clientId) {
    throw new Error("Client id is required.");
  }

  await deleteClient(clientId);
  revalidatePath("/clients");
}

export async function updateClientStatusAction(
  clientId: string,
  status: "active" | "lead" | "inactive"
) {
  if (!clientId) {
    throw new Error("Client id is required.");
  }

  await updateClientStatus(clientId, status);
  revalidatePath("/clients");
}
