// app/api/admin/suppliers/list/route.ts

import { ok, fail } from "@/lib/api/response";
import { getServiceClient } from "@/lib/supabase/server";
import { requireApiRole } from "@/lib/auth/require-api-role";

export async function GET(request: Request) {
  const auth = await requireApiRole(request, ["admin"]);

  if (!auth.ok) {
    return auth.response;
  }
    try {
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
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