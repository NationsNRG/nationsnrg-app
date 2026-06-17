// app/api/intake/deal/[id]/triage/route.ts

import { ok, fail } from "@/lib/api/response";
import { getServiceClient } from "@/lib/supabase/server";
import { splitOpportunity } from "@/lib/deal-engine/opportunity-split";

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

    const premiumPath =
      economicStack?.stack_type === "premium_escalation";

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

    return ok({
      dealId: id,
      triage,
    });
  } catch (error) {
return fail(error instanceof Error ? error.message : "Unknown error");
  }
}