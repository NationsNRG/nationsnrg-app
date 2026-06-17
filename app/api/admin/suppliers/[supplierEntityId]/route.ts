// app/api/admin/suppliers/[supplierEntityId]/route.ts

import { ok, fail } from "@/lib/api/response";
import { getServiceClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{
    supplierEntityId: string;
  }>;
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { supplierEntityId } = await context.params;

    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("supplier_entity_id", supplierEntityId)
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Supplier not found");
    }

    return ok({
      supplier: data,
    });
  } catch (error) {
        return fail(error instanceof Error ? error.message : "Unknown error");
  }
}