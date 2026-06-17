// app/api/intake/deal/[id]/big-deal-desk/route.ts

import { ok, fail } from "@/lib/api/response";
import { getServiceClient } from "@/lib/supabase/server";
import { splitOpportunity } from "@/lib/deal-engine/opportunity-split";
import { triggerDealAutoProgression } from "@/lib/deal-engine/auto-progress-trigger";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const { id } = await context.params;

    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("big_deal_desk_queue")
      .select("*")
      .eq("deal_id", id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

return ok({
  dealId: id,
  queueRecord: data ?? null,
});
  } catch (error) {
return fail(error instanceof Error ? error.message : "Unknown error");
  }
}

export async function POST(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const { id } = await context.params;

    const supabase = getServiceClient();

    const [
      { data: deal, error: dealError },
      { data: demand, error: demandError },
      { data: economicStack, error: economicError },
    ] = await Promise.all([
      supabase.from("deals").select("*").eq("id", id).maybeSingle(),
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
      premiumPath: economicStack?.stack_type === "premium_escalation",
      infrastructurePath:
        typeof demand?.load_band === "string" &&
        demand.load_band === "infrastructure_candidate",
      loadBand:
        typeof demand?.load_band === "string" ? demand.load_band : null,
    });

    if (!triage.routeToBigDealDesk) {
return ok({
  escalated: false,
  dealId: id,
  triage,
  message: "Deal does not currently meet big-deal desk routing threshold.",
});
    }

    const escalationReason = `${triage.triageReason} Score: ${triage.score}.`;

    const { data: queueRecord, error: upsertError } = await supabase
      .from("big_deal_desk_queue")
      .upsert(
        {
          deal_id: id,
          triage_tier: triage.tier,
          triage_lane: triage.lane,
          triage_score: triage.score,
          escalation_status: "queued",
          escalation_reason: escalationReason,
          metadata: {
            routeToBigDealDesk: triage.routeToBigDealDesk,
            holdForAggregation: triage.holdForAggregation,
            demandLoadBand:
              typeof demand?.load_band === "string" ? demand.load_band : null,
            estimatedPeakKw:
              typeof demand?.estimated_peak_kw === "number"
                ? demand.estimated_peak_kw
                : null,
            estimatedAnnualSpend:
              typeof demand?.estimated_annual_spend === "number"
                ? demand.estimated_annual_spend
                : null,
          },
        },
        { onConflict: "deal_id" },
      )
      .select("*")
      .single();

    if (upsertError || !queueRecord) {
      throw new Error(upsertError?.message ?? "Failed to queue big deal desk escalation");
    }

void triggerDealAutoProgression({
  dealId: id,
  triggerSource: "big_deal_desk",
});

return ok({
  escalated: true,
  dealId: id,
  triage,
  queueRecord,
});
  } catch (error) {
return fail(error instanceof Error ? error.message : "Unknown error");
  }
}