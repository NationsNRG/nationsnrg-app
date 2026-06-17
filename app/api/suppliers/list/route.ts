// app/api/suppliers/list/route.ts

import { ok, fail } from "@/lib/api/response";
import { getServiceClient } from "@/lib/supabase/server";

export async function GET(): Promise<Response> {
  try {
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("supplier_sequence_plans")
      .select("supplier_entity_id, metadata, created_at")
      .not("supplier_entity_id", "is", null)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const seen = new Set<string>();

    const suppliers = (data ?? [])
      .map((row) => {
        const supplierEntityId =
          typeof row.supplier_entity_id === "string"
            ? row.supplier_entity_id
            : null;

        if (!supplierEntityId) {
          return null;
        }

        const metadata =
          row.metadata && typeof row.metadata === "object"
            ? (row.metadata as Record<string, unknown>)
            : {};

        const supplierName =
          typeof metadata.supplierName === "string"
            ? metadata.supplierName
            : supplierEntityId;

        return {
          supplierEntityId,
          supplierName,
        };
      })
      .filter(
        (
          supplier,
        ): supplier is { supplierEntityId: string; supplierName: string } =>
          supplier !== null,
      )
      .filter((supplier) => {
        if (seen.has(supplier.supplierEntityId)) {
          return false;
        }

        seen.add(supplier.supplierEntityId);
        return true;
      });

    return ok({
      suppliers,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unknown error");
  }
}