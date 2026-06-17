// app/api/intake/deal/[id]/counterparties/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

const createSchema = z.object({
  counterpartyType: z.enum([
    "supplier",
    "epc",
    "lpl",
    "buyer",
    "internal",
    "advisor",
    "other",
  ]),
  counterpartyName: z.string().trim().min(1),
  counterpartyIdentifier: z.string().trim().nullable().optional(),
  roleLabel: z.string().trim().nullable().optional(),
  status: z.enum(["active", "inactive", "blocked", "archived"]).default("active"),
  visibilityLevel: z
    .enum(["internal_only", "teaser_ok", "qualified_ok", "execution_ok"])
    .default("internal_only"),
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
      .from("deal_counterparties")
      .select("*")
      .eq("deal_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(
      {
        ok: true,
        dealId: id,
        counterparties: data ?? [],
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

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const body = createSchema.parse(await request.json());

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data, error } = await supabase
      .from("deal_counterparties")
      .insert({
        deal_id: id,
        counterparty_type: body.counterpartyType,
        counterparty_name: body.counterpartyName,
        counterparty_identifier: body.counterpartyIdentifier ?? null,
        role_label: body.roleLabel ?? null,
        status: body.status,
        visibility_level: body.visibilityLevel,
        notes: body.notes ?? null,
        metadata: body.metadata,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to create counterparty");
    }

    return NextResponse.json(
      {
        ok: true,
        dealId: id,
        counterparty: data,
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