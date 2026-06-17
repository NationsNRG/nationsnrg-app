// app/api/admin/suppliers/list/route.ts

import { ok, fail } from "@/lib/api/response";
import { getServiceClient } from "@/lib/supabase/server";

export async function GET() {
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