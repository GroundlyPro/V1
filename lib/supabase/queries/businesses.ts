import { createClient } from "@/lib/supabase/server";

export interface CreateBusinessInput {
  name: string;
  industry: string;
  phone?: string;
  city?: string;
  state?: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerEmail: string;
}

export async function createBusiness(input: CreateBusinessInput) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) throw new Error("Not authenticated");

  const { data: business, error: bizError } = await supabase
    .from("businesses")
    .insert({
      name: input.name,
      owner_id: user.id,
      phone: input.phone || null,
      city: input.city || null,
      state: input.state || null,
    })
    .select()
    .single();

  if (bizError) throw bizError;

  const { error: userInsertError } = await supabase.from("users").insert({
    business_id: business.id,
    auth_user_id: user.id,
    first_name: input.ownerFirstName,
    last_name: input.ownerLastName,
    email: input.ownerEmail,
    role: "owner",
  });

  if (userInsertError) throw userInsertError;

  return business;
}

export async function getMyBusiness() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  return data;
}
