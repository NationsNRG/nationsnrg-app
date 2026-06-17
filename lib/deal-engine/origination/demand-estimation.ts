// lib/deal-engine/origination/demand-estimation.ts

import type {
  DealDemandEstimateInput,
  DealDemandEstimateOutput,
  JsonObject,
} from "../types";
import { clampScore } from "../types";
import { parseDealDemandEstimateInput } from "../validation";

type DemandEstimationMethod = DealDemandEstimateOutput["estimationMethod"];

interface DemandEstimationContext {
  annualMwh: number | null;
  estimatedAvgMw: number | null;
  estimatedPeakMw: number | null;
  estimatedPeakKw: number | null;
  confidence: number;
  method: DemandEstimationMethod;
  assumptions: JsonObject;
  trace: JsonObject;
  siteCountUsed: number | null;
}

const HOURS_PER_YEAR = 8760;
const DEFAULT_RATE_PER_KWH = 0.12;
const DEFAULT_LOAD_FACTOR = 0.62;
const DEFAULT_PEAK_MULTIPLIER = 1.35;
const DEFAULT_AGGREGATION_FACTOR = 1;

function round(value: number, digits = 6): number {
  return Number(value.toFixed(digits));
}

function toAnnualMwhFromAnnualKwh(annualKwh: number): number {
  return annualKwh / 1000;
}

function toAnnualMwhFromAvgMw(avgMw: number): number {
  return avgMw * HOURS_PER_YEAR;
}

function toAvgMwFromAnnualMwh(annualMwh: number): number {
  return annualMwh / HOURS_PER_YEAR;
}

function toPeakMwFromAvgMw(avgMw: number, peakMultiplier: number): number {
  return avgMw * peakMultiplier;
}

function normalizeSiteCount(siteCount?: number | null): number | null {
  if (siteCount == null) {
    return null;
  }

  if (siteCount <= 0) {
    return 0;
  }

  return Math.trunc(siteCount);
}

function deriveAnnualSpend(input: DealDemandEstimateInput): number | null {
  if (input.annualSpendAmount != null) {
    return input.annualSpendAmount;
  }

  if (input.monthlyBillAmount != null) {
    return input.monthlyBillAmount * 12;
  }

  return null;
}

function deriveAnnualKwhFromSpend(
  annualSpend: number,
  inferredRatePerKwh: number,
): number | null {
  if (inferredRatePerKwh <= 0) {
    return null;
  }

  return annualSpend / inferredRatePerKwh;
}

function deriveAnnualKwh(input: DealDemandEstimateInput): number | null {
  if (input.annualKwh != null) {
    return input.annualKwh;
  }

  if (input.monthlyKwh != null) {
    return input.monthlyKwh * 12;
  }

  if (input.annualMwh != null) {
    return input.annualMwh * 1000;
  }

  return null;
}

function buildBaseAssumptions(input: DealDemandEstimateInput): {
  inferredRatePerKwh: number;
  inferredLoadFactor: number;
  peakMultiplier: number;
  aggregationFactor: number;
} {
  return {
    inferredRatePerKwh:
      input.assumptions?.inferredRatePerKwh ?? DEFAULT_RATE_PER_KWH,
    inferredLoadFactor:
      input.assumptions?.inferredLoadFactor ?? DEFAULT_LOAD_FACTOR,
    peakMultiplier:
      input.assumptions?.peakMultiplier ?? DEFAULT_PEAK_MULTIPLIER,
    aggregationFactor:
      input.assumptions?.aggregationFactor ?? DEFAULT_AGGREGATION_FACTOR,
  };
}

function applyAggregation(
  annualMwh: number,
  siteCount: number | null,
  aggregationFactor: number,
): number {
  const safeSiteCount = siteCount != null && siteCount > 1 ? siteCount : 1;
  return annualMwh * safeSiteCount * aggregationFactor;
}

function estimateFromDirectMwInput(
  input: DealDemandEstimateInput,
  assumptions: ReturnType<typeof buildBaseAssumptions>,
): DemandEstimationContext | null {
  if (input.directMwInput == null || input.directMwInput <= 0) {
    return null;
  }

  const siteCountUsed = normalizeSiteCount(input.siteCount);
  const aggregatedAvgMw = input.directMwInput * (siteCountUsed && siteCountUsed > 1 ? siteCountUsed : 1) * assumptions.aggregationFactor;
  const annualMwh = toAnnualMwhFromAvgMw(aggregatedAvgMw);
  const peakMw = toPeakMwFromAvgMw(aggregatedAvgMw, assumptions.peakMultiplier);

  return {
    method: "direct_mw_input",
    annualMwh: round(annualMwh, 4),
    estimatedAvgMw: round(aggregatedAvgMw, 6),
    estimatedPeakMw: round(peakMw, 6),
    estimatedPeakKw: round(peakMw * 1000, 2),
    confidence: 95,
    siteCountUsed,
    assumptions: {
      directMwInput: input.directMwInput,
      aggregationFactor: assumptions.aggregationFactor,
      peakMultiplier: assumptions.peakMultiplier,
    },
    trace: {
      path: "direct_mw_input",
      directMwInput: input.directMwInput,
      aggregatedAvgMw,
      annualMwh,
      peakMw,
    },
  };
}

function estimateFromDirectKwInput(
  input: DealDemandEstimateInput,
  assumptions: ReturnType<typeof buildBaseAssumptions>,
): DemandEstimationContext | null {
  if (input.directKwInput == null || input.directKwInput <= 0) {
    return null;
  }

  const avgMw = input.directKwInput / 1000;
  return estimateFromDirectMwInput(
    {
      ...input,
      directMwInput: avgMw,
    },
    assumptions,
  )
    ? {
        ...(estimateFromDirectMwInput(
          {
            ...input,
            directMwInput: avgMw,
          },
          assumptions,
        ) as DemandEstimationContext),
        method: "direct_kw_input",
        assumptions: {
          directKwInput: input.directKwInput,
          directMwDerived: avgMw,
          aggregationFactor: assumptions.aggregationFactor,
          peakMultiplier: assumptions.peakMultiplier,
        },
      }
    : null;
}

function estimateFromAnnualUsage(
  input: DealDemandEstimateInput,
  assumptions: ReturnType<typeof buildBaseAssumptions>,
): DemandEstimationContext | null {
  const annualKwh = deriveAnnualKwh(input);

  if (annualKwh == null || annualKwh <= 0) {
    return null;
  }

  const annualMwhRaw = toAnnualMwhFromAnnualKwh(annualKwh);
  const siteCountUsed = normalizeSiteCount(input.siteCount);
  const annualMwh = applyAggregation(
    annualMwhRaw,
    siteCountUsed,
    assumptions.aggregationFactor,
  );
  const avgMw = toAvgMwFromAnnualMwh(annualMwh);
  const peakMw = toPeakMwFromAvgMw(avgMw, assumptions.peakMultiplier);

  return {
    method: input.annualMwh != null || input.annualKwh != null
      ? "annual_usage_derived"
      : "annual_usage_derived",
    annualMwh: round(annualMwh, 4),
    estimatedAvgMw: round(avgMw, 6),
    estimatedPeakMw: round(peakMw, 6),
    estimatedPeakKw: round(peakMw * 1000, 2),
    confidence: input.annualKwh != null || input.annualMwh != null ? 88 : 82,
    siteCountUsed,
    assumptions: {
      annualKwhInput: annualKwh,
      aggregationFactor: assumptions.aggregationFactor,
      peakMultiplier: assumptions.peakMultiplier,
    },
    trace: {
      path: "annual_usage_derived",
      annualKwh,
      annualMwh,
      avgMw,
      peakMw,
    },
  };
}

function estimateFromBill(
  input: DealDemandEstimateInput,
  assumptions: ReturnType<typeof buildBaseAssumptions>,
): DemandEstimationContext | null {
  const annualSpend = deriveAnnualSpend(input);

  if (annualSpend == null || annualSpend <= 0) {
    return null;
  }

  const annualKwh = deriveAnnualKwhFromSpend(
    annualSpend,
    assumptions.inferredRatePerKwh,
  );

  if (annualKwh == null || annualKwh <= 0) {
    return null;
  }

  const annualMwhRaw = toAnnualMwhFromAnnualKwh(annualKwh);
  const siteCountUsed = normalizeSiteCount(input.siteCount);
  const annualMwh = applyAggregation(
    annualMwhRaw,
    siteCountUsed,
    assumptions.aggregationFactor,
  );
  const avgMw = toAvgMwFromAnnualMwh(annualMwh);
  const peakMw = toPeakMwFromAvgMw(avgMw, assumptions.peakMultiplier);

  return {
    method: "bill_derived",
    annualMwh: round(annualMwh, 4),
    estimatedAvgMw: round(avgMw, 6),
    estimatedPeakMw: round(peakMw, 6),
    estimatedPeakKw: round(peakMw * 1000, 2),
    confidence: input.annualSpendAmount != null ? 70 : 64,
    siteCountUsed,
    assumptions: {
      annualSpend,
      inferredRatePerKwh: assumptions.inferredRatePerKwh,
      aggregationFactor: assumptions.aggregationFactor,
      peakMultiplier: assumptions.peakMultiplier,
    },
    trace: {
      path: "bill_derived",
      annualSpend,
      inferredRatePerKwh: assumptions.inferredRatePerKwh,
      annualKwh,
      annualMwh,
      avgMw,
      peakMw,
    },
  };
}

function estimateFromSparseSignals(
  input: DealDemandEstimateInput,
  assumptions: ReturnType<typeof buildBaseAssumptions>,
): DemandEstimationContext | null {
  const siteCountUsed = normalizeSiteCount(input.siteCount);
  const safeSiteCount = siteCountUsed && siteCountUsed > 0 ? siteCountUsed : 1;

  if (safeSiteCount < 1 && !input.facilityType && !input.businessModelHint) {
    return null;
  }

  let baseAnnualMwhPerSite = 600;

  const facilityType = (input.facilityType ?? "").toLowerCase();
  const model = (input.businessModelHint ?? "").toLowerCase();

  if (facilityType.includes("warehouse")) {
    baseAnnualMwhPerSite = 900;
  } else if (facilityType.includes("manufact")) {
    baseAnnualMwhPerSite = 2500;
  } else if (facilityType.includes("hotel")) {
    baseAnnualMwhPerSite = 1800;
  } else if (facilityType.includes("retail")) {
    baseAnnualMwhPerSite = 700;
  } else if (facilityType.includes("school")) {
    baseAnnualMwhPerSite = 1200;
  }

  if (model.includes("multi-site") || model.includes("portfolio")) {
    baseAnnualMwhPerSite *= 1.15;
  }

  const annualMwh = round(
    baseAnnualMwhPerSite * safeSiteCount * assumptions.aggregationFactor,
    4,
  );
  const avgMw = round(toAvgMwFromAnnualMwh(annualMwh), 6);
  const peakMw = round(toPeakMwFromAvgMw(avgMw, assumptions.peakMultiplier), 6);

  return {
    method: "sparse_inference",
    annualMwh,
    estimatedAvgMw: avgMw,
    estimatedPeakMw: peakMw,
    estimatedPeakKw: round(peakMw * 1000, 2),
    confidence: 38,
    siteCountUsed,
    assumptions: {
      baseAnnualMwhPerSite,
      facilityType: input.facilityType ?? null,
      businessModelHint: input.businessModelHint ?? null,
      aggregationFactor: assumptions.aggregationFactor,
      peakMultiplier: assumptions.peakMultiplier,
    },
    trace: {
      path: "sparse_inference",
      safeSiteCount,
      annualMwh,
      avgMw,
      peakMw,
    },
  };
}

export function estimateDealDemand(
  rawInput: unknown,
): DealDemandEstimateOutput {
  const input = parseDealDemandEstimateInput(rawInput);
  const assumptions = buildBaseAssumptions(input);

  const strategies: Array<() => DemandEstimationContext | null> = [
    () => estimateFromDirectMwInput(input, assumptions),
    () => estimateFromDirectKwInput(input, assumptions),
    () => estimateFromAnnualUsage(input, assumptions),
    () => estimateFromBill(input, assumptions),
    () => estimateFromSparseSignals(input, assumptions),
  ];

  const result = strategies
    .map((strategy) => strategy())
    .find((value): value is DemandEstimationContext => value != null);

  if (!result) {
    return {
      estimationMethod: "unknown",
      annualMwh: null,
      estimatedAvgMw: null,
      estimatedPeakMw: null,
      estimatedPeakKw: null,
      mwConfidenceScore: 0,
      siteCountUsed: normalizeSiteCount(input.siteCount),
      assumptions: {
        error: "No valid estimation path succeeded.",
      },
      calculationTrace: {
        failed: true,
      },
    };
  }

  return {
    estimationMethod: result.method,
    annualMwh: result.annualMwh,
    estimatedAvgMw: result.estimatedAvgMw,
    estimatedPeakMw: result.estimatedPeakMw,
    estimatedPeakKw: result.estimatedPeakKw,
    mwConfidenceScore: clampScore(result.confidence),
    siteCountUsed: result.siteCountUsed,
    assumptions: result.assumptions,
    calculationTrace: result.trace,
  };
}