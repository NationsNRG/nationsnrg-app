// app/api/intake/deal/[id]/supplier-attach/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { createFoundationSupplierSequence } from "@/lib/deal-engine/foundation-persistence";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

const requestSchema = z.object({
  supplierEntityId: z.string().trim().min(1),
  supplierName: z.string().trim().min(1),
  sequenceType: z.enum([
    "sequential_waterfall",
    "fallback_only",
    "premium_first_look",
    "hold_until_ready",
    "do_not_show_yet",
  ]),
  visibilityTier: z.enum([
    "tier_0_internal",
    "tier_1_teaser",
    "tier_2_qualified",
    "tier_3_execution",
    "tier_4_premium",
  ]),
  packageAudience: z.enum([
    "internal",
    "supplier_teaser",
    "supplier_qualified",
    "epc",
    "lpl",
    "buyer",
    "negotiation",
    "execution",
  ]),
  isPrimary: z.boolean().default(false),
  holdReason: z.string().trim().nullable().optional(),
  fitScore: z.number().finite().min(0).max(100).optional(),
});

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const body = requestSchema.parse(await request.json());

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: existingDeal, error: dealError } = await supabase
      .from("deals")
      .select("id")
      .eq("id", id)
      .single();

    if (dealError || !existingDeal) {
      throw new Error(dealError?.message ?? "Deal not found");
    }

    const { data: existingSequences, error: sequencesError } = await supabase
      .from("supplier_sequence_plans")
      .select("id, sequence_position, is_primary")
      .eq("deal_id", id)
      .order("sequence_position", { ascending: true });

    if (sequencesError) {
      throw new Error(sequencesError.message);
    }

    const nextSequencePosition =
      Array.isArray(existingSequences) && existingSequences.length > 0
        ? Math.max(
            ...existingSequences.map((row) =>
              typeof row.sequence_position === "number" ? row.sequence_position : 0,
            ),
          ) + 1
        : 1;

    if (body.isPrimary) {
      const { error: demoteError } = await supabase
        .from("supplier_sequence_plans")
        .update({ is_primary: false })
        .eq("deal_id", id)
        .eq("is_primary", true);

      if (demoteError) {
        throw new Error(demoteError.message);
      }
    }

    const supplierSequenceId = await createFoundationSupplierSequence(supabase, {
      dealId: id,
      supplierEntityId: body.supplierEntityId,
      sequenceType: body.sequenceType,
      sequencePosition: nextSequencePosition,
      visibilityTier: body.visibilityTier,
      packageAudience: body.packageAudience,
      isPrimary: body.isPrimary,
      holdReason: body.holdReason ?? null,
      metadata: {
        supplierName: body.supplierName,
        fitScore: body.fitScore ?? null,
        attachedBy: "manual_supplier_attach",
      },
    });

    const { data: insertedRow, error: insertedError } = await supabase
      .from("supplier_sequence_plans")
      .select("*")
      .eq("id", supplierSequenceId)
      .single();

    if (insertedError || !insertedRow) {
      throw new Error(insertedError?.message ?? "Failed to load inserted supplier sequence");
    }

    return NextResponse.json(
      {
        ok: true,
        dealId: id,
        supplierSequence: insertedRow,
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