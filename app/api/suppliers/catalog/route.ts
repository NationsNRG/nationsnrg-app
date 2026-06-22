// app/api/suppliers/catalog/route.ts

import { ok, fail } from "@/lib/api/response";
import { requireApiRole } from "@/lib/auth/require-api-role";
import { getServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request): Promise<Response> {
  const auth = await requireApiRole(request, ["admin", "operator"]);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("status", "active")
      .order("supplier_name", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return ok({
      suppliers: data ?? [],
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unknown error");
  }
}