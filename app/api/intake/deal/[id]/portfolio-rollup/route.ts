// app/api/intake/deal/[id]/portfolio-rollup/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { splitOpportunity } from "@/lib/deal-engine/opportunity-split";
import { evaluatePortfolioAggregation } from "@/lib/deal-engine/portfolio-aggregation";
import { triggerDealAutoProgression } from "@/lib/deal-engine/auto-progress-trigger";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
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
      .from("portfolio_rollup_queue")
      .select("*")
      .eq("deal_id", id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(
      {
        ok: true,
        dealId: id,
        rollupRecord: data ?? null,
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
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const [
      { data: deal, error: dealError },
      { data: demand, error: demandError },
      { data: economicStack, error: economicError },
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

    const premiumPath = economicStack?.stack_type === "premium_escalation";
    const infrastructurePath =
      typeof demand?.load_band === "string" &&
      demand.load_band === "infrastructure_candidate";

    const triage = splitOpportunity({
      dealId: id,
      estimatedMonthlyBill:
        typeof deal.estimated_monthly_bill === "number"
          ? deal.estimated_monthly_bill
          : null,
      estimatedAnnualSpend:
        typeof demand?.estimated_annual_spend === "number"
          ? demand.estimated_annual_spend
          : null,
      estimatedPeakKw:
        typeof demand?.estimated_peak_kw === "number"
          ? demand.estimated_peak_kw
          : null,
      confidenceScore:
        typeof demand?.confidence_score === "number"
          ? demand.confidence_score
          : null,
      premiumPath,
      infrastructurePath,
      loadBand:
        typeof demand?.load_band === "string" ? demand.load_band : null,
    });

    const aggregation = evaluatePortfolioAggregation({
      dealId: id,
      state: typeof deal.state === "string" ? deal.state : null,
      estimatedAnnualSpend:
        typeof demand?.estimated_annual_spend === "number"
          ? demand.estimated_annual_spend
          : null,
      estimatedPeakKw:
        typeof demand?.estimated_peak_kw === "number"
          ? demand.estimated_peak_kw
          : null,
      confidenceScore:
        typeof demand?.confidence_score === "number"
          ? demand.confidence_score
          : null,
      triageTier: triage.tier,
      triageLane: triage.lane,
      premiumPath,
      infrastructurePath,
    });

    if (!aggregation.holdForRollup || !aggregation.rollupLane) {
      return NextResponse.json(
        {
          ok: true,
          queued: false,
          dealId: id,
          triage,
          aggregation,
          message: "Deal should not be held for portfolio aggregation at this time.",
        },
        { status: 200 },
      );
    }

    const { data: queueRecord, error: upsertError } = await supabase
      .from("portfolio_rollup_queue")
      .upsert(
        {
          deal_id: id,
          state: typeof deal.state === "string" ? deal.state : null,
          rollup_lane: aggregation.rollupLane,
          aggregation_score: aggregation.aggregationScore,
          hold_status: "held",
          aggregation_reason: aggregation.aggregationReason,
          minimum_cluster_target: aggregation.minimumClusterTarget,
          metadata: {
            triageTier: triage.tier,
            triageLane: triage.lane,
            triageScore: triage.score,
            premiumPath,
            infrastructurePath,
            estimatedAnnualSpend:
              typeof demand?.estimated_annual_spend === "number"
                ? demand.estimated_annual_spend
                : null,
            estimatedPeakKw:
              typeof demand?.estimated_peak_kw === "number"
                ? demand.estimated_peak_kw
                : null,
          },
        },
        { onConflict: "deal_id" },
      )
      .select("*")
      .single();

    if (upsertError || !queueRecord) {
      throw new Error(upsertError?.message ?? "Failed to queue rollup hold");
    }

void triggerDealAutoProgression({
  dealId: id,
  triggerSource: "portfolio_rollup",
});

    return NextResponse.json(
      {
        ok: true,
        queued: true,
        dealId: id,
        triage,
        aggregation,
        rollupRecord: queueRecord,
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