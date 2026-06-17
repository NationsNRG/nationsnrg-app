// app/api/admin/suppliers/create/route.ts

import { ok, fail } from "@/lib/api/response";
import { z } from "zod";
import { getServiceClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  supplierEntityId: z.string().trim().min(1),
  supplierName: z.string().trim().min(1),
  supplierClass: z.string().trim().min(1),
  status: z.string().trim().min(1).default("active"),
  commodityTypes: z.array(z.string().trim().min(1)).default([]),
  serviceStates: z.array(z.string().trim().min(1)).default([]),
  utilities: z.array(z.string().trim().min(1)).default([]),
  capabilities: z.array(z.string().trim().min(1)).default([]),
  notes: z.string().trim().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());

    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("suppliers")
      .upsert(
        {
          supplier_entity_id: body.supplierEntityId,
          supplier_name: body.supplierName,
          supplier_class: body.supplierClass,
          status: body.status,
          commodity_types: body.commodityTypes,
          service_states: body.serviceStates,
          utilities: body.utilities,
          capabilities: body.capabilities,
          notes: body.notes ?? null,
          metadata: body.metadata,
        },
        { onConflict: "supplier_entity_id" },
      )
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to create supplier");
    }

    return ok({
      supplier: data,
    });
  } catch (error) {
        return fail(error instanceof Error ? error.message : "Unknown error");
  }
}