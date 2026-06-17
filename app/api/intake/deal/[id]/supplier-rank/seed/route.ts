// app/api/intake/deal/[id]/supplier-rank/seed/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { createFoundationSupplierSequence } from "@/lib/deal-engine/foundation-persistence";
import {
  rankSuppliersForDeal,
  type DealSupplierFitInput,
  type SupplierCatalogRecord,
} from "@/lib/nationsnrg/supplier-intelligence";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

const requestSchema = z.object({
  maxSuppliers: z.number().int().min(1).max(10).default(3),
  attachPrimary: z.boolean().default(true),
});

function normalizeArray(values: unknown): string[] {
  return Array.isArray(values)
    ? values.filter((value): value is string => typeof value === "string")
    : [];
}

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

    const [
      { data: deal, error: dealError },
      { data: demandEstimate, error: demandError },
      { data: economicStack, error: economicError },
      { data: suppliers, error: suppliersError },
      { data: existingSequences, error: existingSequencesError },
    ] = await Promise.all([
      supabase.from("deals").select("*").eq("id", id).single(),
      supabase
        .from("deal_demand_estimates")
        .select("*")
        .eq("deal_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("deal_economic_stack_decisions")
        .select("*")
        .eq("deal_id", id)
        .maybeSingle(),
      supabase.from("suppliers").select("*").eq("status", "active"),
      supabase
        .from("supplier_sequence_plans")
        .select("id, supplier_entity_id, sequence_position, is_primary")
        .eq("deal_id", id)
        .order("sequence_position", { ascending: true }),
    ]);

    if (dealError || !deal) {
      throw new Error(dealError?.message ?? "Deal not found");
    }

    if (demandError) {
      throw new Error(demandError.message);
    }

    if (economicError) {
      throw new Error(economicError.message);
    }

    if (suppliersError) {
      throw new Error(suppliersError.message);
    }

    if (existingSequencesError) {
      throw new Error(existingSequencesError.message);
    }

    const supplierCatalog: SupplierCatalogRecord[] = (suppliers ?? []).map(
      (supplier) => ({
        supplierEntityId: String(supplier.supplier_entity_id),
        supplierName: String(supplier.supplier_name),
        supplierClass: String(supplier.supplier_class),
        status: String(supplier.status),
        commodityTypes: normalizeArray(supplier.commodity_types),
        serviceStates: normalizeArray(supplier.service_states),
        utilities: normalizeArray(supplier.utilities),
        capabilities: normalizeArray(supplier.capabilities),
        notes: typeof supplier.notes === "string" ? supplier.notes : null,
        metadata:
          supplier.metadata && typeof supplier.metadata === "object"
            ? (supplier.metadata as Record<string, unknown>)
            : null,
      }),
    );

    const fitInput: DealSupplierFitInput = {
      dealId: String(deal.id),
      state: typeof deal.state === "string" ? deal.state : null,
      commodityType: "electricity",
      estimatedMonthlyBill:
        typeof deal.estimated_monthly_bill === "number"
          ? deal.estimated_monthly_bill
          : null,
      estimatedPeakKw:
        demandEstimate && typeof demandEstimate.estimated_peak_kw === "number"
          ? demandEstimate.estimated_peak_kw
          : null,
      premiumPath: economicStack?.stack_type === "premium_escalation",
      infrastructurePath:
        demandEstimate && typeof demandEstimate.load_band === "string"
          ? demandEstimate.load_band === "infrastructure_candidate"
          : false,
      utilityName: null,
    };

    const rankedSuppliers = rankSuppliersForDeal({
      deal: fitInput,
      suppliers: supplierCatalog,
    });

    const existingSupplierIds = new Set(
      Array.isArray(existingSequences)
        ? existingSequences
            .map((row) =>
              typeof row.supplier_entity_id === "string"
                ? row.supplier_entity_id
                : null,
            )
            .filter((value): value is string => value !== null)
        : [],
    );

    const nextBasePosition =
      Array.isArray(existingSequences) && existingSequences.length > 0
        ? Math.max(
            ...existingSequences.map((row) =>
              typeof row.sequence_position === "number"
                ? row.sequence_position
                : 0,
            ),
          ) + 1
        : 1;

    const topRanked = rankedSuppliers.slice(0, body.maxSuppliers);

    const selected = topRanked.filter(
      (supplier) => !existingSupplierIds.has(supplier.supplierEntityId),
    );

    const skipped = topRanked
      .filter((supplier) => existingSupplierIds.has(supplier.supplierEntityId))
      .map((supplier) => ({
        supplierEntityId: supplier.supplierEntityId,
        supplierName: supplier.supplierName,
        reason: "already_attached",
      }));

    if (selected.length === 0) {
      return NextResponse.json(
        {
          ok: true,
          dealId: id,
          insertedCount: 0,
          insertedSequenceIds: [],
          seededSuppliers: [],
          skippedSuppliers: skipped,
          message: "No new ranked suppliers were seeded because all top candidates are already attached.",
        },
        { status: 200 },
      );
    }

    const inserted: string[] = [];
    const seededSuppliers: Array<{
      supplierEntityId: string;
      supplierName: string;
      supplierClass: string;
      totalScore: number;
      matchRank: number;
      matchStatus: "recommended" | "fallback";
    }> = [];

    for (const [index, supplier] of selected.entries()) {
      const sequenceType =
        supplier.matchStatus === "recommended"
          ? "sequential_waterfall"
          : "fallback_only";

      const visibilityTier =
        supplier.supplierClass === "premium_partner"
          ? "tier_4_premium"
          : "tier_2_qualified";

      const packageAudience =
        supplier.supplierClass === "premium_partner"
          ? "lpl"
          : "supplier_qualified";

      const isPrimary = body.attachPrimary && index === 0;

      if (isPrimary) {
        const { error: demoteError } = await supabase
          .from("supplier_sequence_plans")
          .update({ is_primary: false })
          .eq("deal_id", id)
          .eq("is_primary", true);

        if (demoteError) {
          throw new Error(demoteError.message);
        }
      }

      const sequenceId = await createFoundationSupplierSequence(supabase, {
        dealId: id,
        supplierEntityId: supplier.supplierEntityId,
        sequenceType,
        sequencePosition: nextBasePosition + index,
        visibilityTier,
        packageAudience,
        isPrimary,
        holdReason: null,
        metadata: {
          supplierName: supplier.supplierName,
          supplierClass: supplier.supplierClass,
          fitScore: supplier.totalScore,
          matchRank: supplier.matchRank,
          attachedBy: "auto_seed_ranked_suppliers",
          rationale: supplier.rationale,
        },
      });

      inserted.push(sequenceId);

      seededSuppliers.push({
        supplierEntityId: supplier.supplierEntityId,
        supplierName: supplier.supplierName,
        supplierClass: supplier.supplierClass,
        totalScore: supplier.totalScore,
        matchRank: supplier.matchRank,
        matchStatus: supplier.matchStatus,
      });
    }

    return NextResponse.json(
      {
        ok: true,
        dealId: id,
        insertedCount: inserted.length,
        insertedSequenceIds: inserted,
        seededSuppliers,
        skippedSuppliers: skipped,
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