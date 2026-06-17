// app/api/intake/deal/[id]/contract-readiness/route.ts

import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  evaluateContractReadiness,
  type ExecutionLane,
} from "@/lib/deal-engine/contract-readiness";
import { z } from "zod";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const requestSchema = z.object({
  triggerSource: z
    .enum([
      "operator",
      "document_update",
      "package_update",
      "supplier_response",
      "compensation_update",
      "auto_progression",
      "system",
    ])
    .default("operator"),
});

type ReadinessScoreInsert = {
  deal_id: string;
  previous_score: number | null;
  next_score: number;
  previous_status: string | null;
  next_status: string;
  score_reason: string;
  trigger_source: string;
  metadata: Record<string, unknown>;
};

function deriveExecutionLane(params: {
  bigDealStatus: string | null;
  rollupStatus: string | null;
  triageLane: string | null;
}): ExecutionLane {
  if (params.bigDealStatus) return "big_deal_desk";
  if (params.rollupStatus === "held") return "portfolio_rollup";

  if (
    params.triageLane === "infrastructure_triage" ||
    params.triageLane === "premium_escalation" ||
    params.triageLane === "standard_supply"
  ) {
    return params.triageLane;
  }

  return "standard_supply";
}

function deriveBuyerIdentityStatus(businessName: string | null) {
  return businessName ? "identified" : "unknown";
}

function deriveUsageDataStatus(hasDemandEstimate: boolean) {
  return hasDemandEstimate ? "estimated" : "missing";
}

function deriveSupplierPackageStatus(params: {
  hasSharedPackage: boolean;
  hasFullPackage: boolean;
  hasTeaserPackage: boolean;
}) {
  if (params.hasSharedPackage) return "shared";
  if (params.hasFullPackage) return "full_ready";
  if (params.hasTeaserPackage) return "teaser_ready";
  return "not_ready";
}

async function logReadinessScore(params: {
  supabase: SupabaseClient;
  dealId: string;
  previousScore: number | null;
  nextScore: number;
  previousStatus: string | null;
  nextStatus: string;
  scoreReason: string;
  triggerSource: string;
}) {
  const { error } = await params.supabase
    .from("contract_readiness_score_events")
    .insert({
      deal_id: params.dealId,
      previous_score: params.previousScore,
      next_score: params.nextScore,
      previous_status: params.previousStatus,
      next_status: params.nextStatus,
      score_reason: params.scoreReason,
      trigger_source: params.triggerSource,
      metadata: {},
    } as ReadinessScoreInsert);

  if (error) {
    throw new Error(`Failed to log readiness score: ${error.message}`);
  }
}

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
      .from("contract_readiness_profiles")
      .select("*")
      .eq("deal_id", id)
      .maybeSingle();

    if (error) throw new Error(error.message);

    return NextResponse.json({
      ok: true,
      dealId: id,
      readinessProfile: data ?? null,
    });
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

const body =
  request.headers.get("content-type")?.includes("application/json")
    ? requestSchema.parse(await request.json())
    : requestSchema.parse({});

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const [
      { data: deal, error: dealError },
      { data: demand, error: demandError },
      { data: packages, error: packagesError },
      { data: shareEvents, error: shareError },
      { data: bigDeal, error: bigDealError },
      { data: rollup, error: rollupError },
      { data: gaps, error: gapError },
      { data: existingProfile, error: existingError },
    ] = await Promise.all([
      supabase.from("deals").select("*").eq("id", id).single(),

      supabase
        .from("deal_demand_estimates")
        .select("id")
        .eq("deal_id", id)
        .limit(1),

      supabase
        .from("deal_packages")
        .select("id,package_type,status")
        .eq("deal_id", id),

      supabase
        .from("deal_package_share_events")
        .select("id")
        .eq("deal_id", id)
        .limit(1),

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

      supabase
        .from("contract_gap_events")
        .select("id")
        .eq("deal_id", id)
        .in("gap_status", ["open", "in_progress"]),

      supabase
        .from("contract_readiness_profiles")
        .select("*")
        .eq("deal_id", id)
        .maybeSingle(),
    ]);

    if (dealError || !deal) throw new Error(dealError?.message ?? "Deal not found");
    if (demandError) throw new Error(demandError.message);
    if (packagesError) throw new Error(packagesError.message);
    if (shareError) throw new Error(shareError.message);
    if (bigDealError) throw new Error(bigDealError.message);
    if (rollupError) throw new Error(rollupError.message);
    if (gapError) throw new Error(gapError.message);
    if (existingError) throw new Error(existingError.message);

    const packageRows = Array.isArray(packages) ? packages : [];

    const hasTeaserPackage = packageRows.some(
      (pkg) => pkg.package_type === "teaser",
    );

    const hasFullPackage = packageRows.some(
      (pkg) => pkg.package_type === "full",
    );

    const hasSharedPackage =
      Array.isArray(shareEvents) && shareEvents.length > 0;

    const executionLane = deriveExecutionLane({
      bigDealStatus:
        bigDeal && typeof bigDeal.escalation_status === "string"
          ? bigDeal.escalation_status
          : null,
      rollupStatus:
        rollup && typeof rollup.hold_status === "string"
          ? rollup.hold_status
          : null,
      triageLane: null,
    });

    const readiness = evaluateContractReadiness({
      dealId: id,
      executionLane,
      buyerIdentityStatus: deriveBuyerIdentityStatus(
        typeof deal.business_name === "string" ? deal.business_name : null,
      ),
      authorityStatus: "unknown",
      usageDataStatus: deriveUsageDataStatus(
        Array.isArray(demand) && demand.length > 0,
      ),
      siteDataStatus: "missing",
      supplierPackageStatus: deriveSupplierPackageStatus({
        hasSharedPackage,
        hasFullPackage,
        hasTeaserPackage,
      }),
      compensationProtectionStatus: "unprotected",
      legalReviewStatus: "not_started",
      blockerCount: Array.isArray(gaps) ? gaps.length : 0,
    });

    const { data: profile, error: upsertError } = await supabase
      .from("contract_readiness_profiles")
      .upsert(
        {
          deal_id: id,
          readiness_status: readiness.readinessStatus,
          readiness_score: readiness.readinessScore,
          execution_lane: executionLane,
          buyer_identity_status: deriveBuyerIdentityStatus(
            typeof deal.business_name === "string" ? deal.business_name : null,
          ),
          authority_status: "unknown",
          usage_data_status: deriveUsageDataStatus(
            Array.isArray(demand) && demand.length > 0,
          ),
          site_data_status: "missing",
          supplier_package_status: deriveSupplierPackageStatus({
            hasSharedPackage,
            hasFullPackage,
            hasTeaserPackage,
          }),
          compensation_protection_status: "unprotected",
          legal_review_status: "not_started",
          blocker_count: Array.isArray(gaps) ? gaps.length : 0,
          next_required_action: readiness.nextRequiredAction,
          readiness_reason: readiness.readinessReason,
          metadata: {
            hasDemandEstimate: Array.isArray(demand) && demand.length > 0,
            hasTeaserPackage,
            hasFullPackage,
            hasSharedPackage,
          },
        },
        { onConflict: "deal_id" },
      )
      .select("*")
      .single();

    if (upsertError || !profile) {
      throw new Error(upsertError?.message ?? "Failed to upsert readiness profile");
    }

    await logReadinessScore({
      supabase,
      dealId: id,
      previousScore:
        typeof existingProfile?.readiness_score === "number"
          ? existingProfile.readiness_score
          : null,
      nextScore: readiness.readinessScore,
      previousStatus:
        typeof existingProfile?.readiness_status === "string"
          ? existingProfile.readiness_status
          : null,
      nextStatus: readiness.readinessStatus,
      scoreReason: readiness.readinessReason,
      triggerSource: body.triggerSource,
    });

    return NextResponse.json({
      ok: true,
      dealId: id,
      readiness,
      readinessProfile: profile,
    });
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