// app/api/admin/suppliers/[supplierEntityId]/edit/route.ts

import { ok, fail } from "@/lib/api/response";
import { getServiceClient } from "@/lib/supabase/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/require-api-role";

interface RouteContext {
  params: Promise<{
    supplierEntityId: string;
  }>;
}

const requestSchema = z.object({
  supplierName: z.string().trim().min(1),
  supplierClass: z.string().trim().min(1),
  status: z.string().trim().min(1),
  commodityTypes: z.array(z.string().trim().min(1)).default([]),
  serviceStates: z.array(z.string().trim().min(1)).default([]),
  utilities: z.array(z.string().trim().min(1)).default([]),
  capabilities: z.array(z.string().trim().min(1)).default([]),
  notes: z.string().trim().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  const auth = await requireApiRole(request, ["admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { supplierEntityId } = await context.params;
    const body = requestSchema.parse(await request.json());

    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("suppliers")
      .update({
        supplier_name: body.supplierName,
        supplier_class: body.supplierClass,
        status: body.status,
        commodity_types: body.commodityTypes,
        service_states: body.serviceStates,
        utilities: body.utilities,
        capabilities: body.capabilities,
        notes: body.notes ?? null,
        metadata: body.metadata,
      })
      .eq("supplier_entity_id", supplierEntityId)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to update supplier");
    }

    return ok({
      supplier: data,
    });
  } catch (error) {
        return fail(error instanceof Error ? error.message : "Unknown error");
  }
}