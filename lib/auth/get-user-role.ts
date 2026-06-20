import { createClient } from "@supabase/supabase-js";

export async function getUserRole(userId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await supabase
    .from("user_roles")
    .select("role,status")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  if (data.status !== "active") {
    return null;
  }

  return data.role as "admin" | "operator" | "supplier";
}