// app/api/admin/suppliers/[id]/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

const updateSchema = z.object({
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

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Supplier not found");
    }

    return NextResponse.json(
      {
        ok: true,
        supplier: data,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const body = updateSchema.parse(await request.json());

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

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
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to update supplier");
    }

    return NextResponse.json(
      {
        ok: true,
        supplier: data,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}