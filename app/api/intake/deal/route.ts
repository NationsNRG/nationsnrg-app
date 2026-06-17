// app/api/intake/deal/route.ts

import { ok, fail } from "@/lib/api/response";
import { getServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

function parseNumber(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const createDealSchema = z.object({
  businessName: z.string().trim().min(1),
  state: z.string().trim().length(2),
  estimatedMonthlyBill: z.number().finite().min(0),
  intakeSource: z.string().trim().min(1).default("operator_test"),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search")?.trim() ?? "";
    const status = searchParams.get("status")?.trim() ?? "";
    const state = searchParams.get("state")?.trim().toUpperCase() ?? "";
    const minBill = parseNumber(searchParams.get("minBill"));
    const page = parseNumber(searchParams.get("page")) ?? 1;
    const pageSize = Math.min(
      Math.max(parseNumber(searchParams.get("pageSize")) ?? 25, 1),
      100,
    );

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supabase = getServiceClient();

    let query = supabase
      .from("deals")
      .select(
        "id,business_name,state,estimated_monthly_bill,status,created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    // --- Filters (type-safe, no assumptions) ---

    if (search.length > 0) {
      // safe ilike on nullable column
      query = query.ilike("business_name", `%${search}%`);
    }

    if (status.length > 0) {
      query = query.eq("status", status);
    }

    if (state.length === 2) {
      query = query.eq("state", state);
    }

    if (typeof minBill === "number") {
      query = query.gte("estimated_monthly_bill", minBill);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return ok({
      deals: data ?? [],
      pagination: {
        page,
        pageSize,
        total: count ?? 0,
        totalPages:
          count && pageSize > 0 ? Math.ceil(count / pageSize) : 0,
      },
      filters: {
        search,
        status,
        state,
        minBill,
      },
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unknown error");
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = createDealSchema.parse(await request.json());
    const supabase = getServiceClient();

    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .insert({
        business_name: body.businessName,
        state: body.state.toUpperCase(),
        estimated_monthly_bill: body.estimatedMonthlyBill,
        intake_source: body.intakeSource,
        status: "new",
      })
      .select("*")
      .maybeSingle();

    if (dealError || !deal) {
      throw new Error(dealError?.message ?? "Failed to create deal.");
    }

    const assumedBlendedRatePerKwh = 0.14;

const estimatedAnnualSpend =
  body.estimatedMonthlyBill * 12;

const estimatedAnnualKwh = Math.round(
  estimatedAnnualSpend / assumedBlendedRatePerKwh,
);

const estimatedAverageKw = Math.round(
  estimatedAnnualKwh / 8760,
);

const estimatedPeakKw = Math.round(
  estimatedAverageKw * 1.8,
);

const confidenceScore = 70;
const confidenceBand = "medium";

const { data: demandEstimate, error: demandError } =
  await supabase
    .from("deal_demand_estimates")
    .insert({
      deal_id: deal.id,

      estimated_annual_spend: estimatedAnnualSpend,

      estimated_annual_kwh: estimatedAnnualKwh,

      estimated_average_kw: estimatedAverageKw,

      estimated_peak_kw: estimatedPeakKw,

      confidence_score: confidenceScore,

      confidence_band: confidenceBand,

      assumed_blended_rate_per_kwh:
        assumedBlendedRatePerKwh,

      load_band:
        estimatedAnnualSpend >= 500000
          ? "infrastructure_candidate"
          : estimatedAnnualSpend >= 100000
            ? "premium_candidate"
            : "standard",

      reasoning: [
        {
          source: "operator_test_intake",

          message:
            "Demand estimate generated from estimated monthly bill using assumed blended rate.",

          estimatedMonthlyBill:
            body.estimatedMonthlyBill,

          assumedBlendedRatePerKwh,
        },
      ],
    })
    .select("*")
    .maybeSingle();

    if (demandError || !demandEstimate) {
      throw new Error(
        demandError?.message ?? "Deal created, but demand estimate failed.",
      );
    }

    return ok({
      deal,
      demandEstimate,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unknown error");
  }
}