// app/api/intake/deal/[id]/auto-progress/route.ts

import { ok, fail } from "@/lib/api/response";
import { getServiceClient } from "@/lib/supabase/server";
import { z } from "zod";
import { evaluateDealAutoProgression } from "@/lib/deal-engine/deal-auto-progression";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const requestSchema = z.object({
  triggerSource: z
    .enum([
      "operator",
      "intake_created",
      "package_generated",
      "supplier_response",
      "safe_share",
      "big_deal_desk",
      "portfolio_rollup",
      "system",
    ])
    .default("operator"),
});

function metadataString(metadata: unknown, key: string): string | null {
  if (
    metadata &&
    typeof metadata === "object" &&
    key in metadata &&
    typeof (metadata as Record<string, unknown>)[key] === "string"
  ) {
    return (metadata as Record<string, unknown>)[key] as string;
  }

  return null;
}

async function logAutoProgression(params: {
  supabase: ReturnType<typeof getServiceClient>;
  dealId: string;
  previousStatus: string | null;
  nextStatus: string;
  shouldUpdate: boolean;
  updated: boolean;
  progressionReason: string;
  triggerSource:
    | "operator"
    | "intake_created"
    | "package_generated"
    | "supplier_response"
    | "safe_share"
    | "big_deal_desk"
    | "portfolio_rollup"
    | "system";
  metadata?: Record<string, unknown>;
}) {
  const { error } = await params.supabase
    .from("deal_auto_progression_events")
    .insert({
      deal_id: params.dealId,
      previous_status: params.previousStatus,
      next_status: params.nextStatus,
      should_update: params.shouldUpdate,
      updated: params.updated,
      progression_reason: params.progressionReason,
      trigger_source: params.triggerSource,
      metadata: params.metadata ?? {},
    });

  if (error) {
    throw new Error(`Failed to log auto-progression event: ${error.message}`);
  }
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const { id } = await context.params;

    const body =
      request.headers.get("content-type")?.includes("application/json")
        ? requestSchema.parse(await request.json())
        : requestSchema.parse({});

    const supabase = getServiceClient();

    const [
      { data: deal, error: dealError },
      { data: demand, error: demandError },
      { data: packages, error: packagesError },
      { data: sequences, error: sequencesError },
      { data: shares, error: sharesError },
      { data: blockers, error: blockersError },
      { data: bigDeal, error: bigDealError },
      { data: rollup, error: rollupError },
    ] = await Promise.all([
      supabase.from("deals").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("deal_demand_estimates")
        .select("id")
        .eq("deal_id", id)
        .limit(1),
      supabase.from("deal_packages").select("id").eq("deal_id", id).limit(1),
      supabase
        .from("supplier_sequence_plans")
        .select("id,metadata")
        .eq("deal_id", id)
        .order("sequence_position", { ascending: true }),
      supabase
        .from("deal_package_share_events")
        .select("id")
        .eq("deal_id", id)
        .limit(1),
      supabase.from("deal_blocker_states").select("id").eq("deal_id", id).limit(1),
      supabase
        .from("big_deal_desk_queue")
        .select("escalation_status")
        .eq("deal_id", id)
        .maybeSingle(),
      supabase
        .from("portfolio_rollup_queue")
        .select("hold_status")
        .eq("deal_id", id)
        .maybeSingle(),
    ]);

    if (dealError || !deal) throw new Error(dealError?.message ?? "Deal not found");
    if (demandError) throw new Error(demandError.message);
    if (packagesError) throw new Error(packagesError.message);
    if (sequencesError) throw new Error(sequencesError.message);
    if (sharesError) throw new Error(sharesError.message);
    if (blockersError) throw new Error(blockersError.message);
    if (bigDealError) throw new Error(bigDealError.message);
    if (rollupError) throw new Error(rollupError.message);

    const currentStatus = typeof deal.status === "string" ? deal.status : null;

    const latestSupplierResponseType =
      Array.isArray(sequences) && sequences.length > 0
        ? sequences
            .map((sequence) => metadataString(sequence.metadata, "latestResponseType"))
            .find((value): value is string => value !== null) ?? null
        : null;

    const decision = evaluateDealAutoProgression({
      currentStatus,
      hasDemandEstimate: Array.isArray(demand) && demand.length > 0,
      hasPackage: Array.isArray(packages) && packages.length > 0,
      hasSupplierSequence: Array.isArray(sequences) && sequences.length > 0,
      hasShareEvent: Array.isArray(shares) && shares.length > 0,
      hasActiveBlockers: Array.isArray(blockers) && blockers.length > 0,
      bigDealStatus:
        bigDeal && typeof bigDeal.escalation_status === "string"
          ? bigDeal.escalation_status
          : null,
      rollupStatus:
        rollup && typeof rollup.hold_status === "string"
          ? rollup.hold_status
          : null,
      latestSupplierResponseType,
    });

    if (!decision.shouldUpdate) {
      await logAutoProgression({
        supabase,
        dealId: id,
        previousStatus: currentStatus,
        nextStatus: decision.nextStatus,
        shouldUpdate: false,
        updated: false,
        progressionReason: decision.reason,
        triggerSource: body.triggerSource,
        metadata: {
          demandCount: Array.isArray(demand) ? demand.length : 0,
          packageCount: Array.isArray(packages) ? packages.length : 0,
          supplierSequenceCount: Array.isArray(sequences) ? sequences.length : 0,
          shareCount: Array.isArray(shares) ? shares.length : 0,
          blockerCount: Array.isArray(blockers) ? blockers.length : 0,
        },
      });

return ok({
  updated: false,
  dealId: id,
  decision,
});
    }

    const { data: updatedDeal, error: updateError } = await supabase
      .from("deals")
      .update({
        status: decision.nextStatus,
      })
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (updateError || !updatedDeal) {
      throw new Error(updateError?.message ?? "Failed to update deal status");
    }

    await logAutoProgression({
      supabase,
      dealId: id,
      previousStatus: currentStatus,
      nextStatus: decision.nextStatus,
      shouldUpdate: true,
      updated: true,
      progressionReason: decision.reason,
      triggerSource: body.triggerSource,
      metadata: {
        demandCount: Array.isArray(demand) ? demand.length : 0,
        packageCount: Array.isArray(packages) ? packages.length : 0,
        supplierSequenceCount: Array.isArray(sequences) ? sequences.length : 0,
        shareCount: Array.isArray(shares) ? shares.length : 0,
        blockerCount: Array.isArray(blockers) ? blockers.length : 0,
      },
    });

return ok({
  updated: true,
  dealId: id,
  decision,
  deal: updatedDeal,
});
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unknown error");
  }
}