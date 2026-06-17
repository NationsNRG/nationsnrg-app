// lib/deal-engine/bill-to-demand.ts

export type DemandConfidenceBand = "low" | "medium" | "high";

export type DemandLoadBand =
  | "micro"
  | "small_commercial"
  | "mid_commercial"
  | "large_commercial"
  | "infrastructure_candidate";

export interface BillToDemandInput {
  estimatedMonthlyBill?: number | null;
  hasUsageData: boolean;
  state?: string | null;
}

export interface BillToDemandResult {
  estimatedAnnualSpend: number;
  estimatedAnnualKwh: number;
  estimatedAverageKw: number;
  estimatedPeakKw: number;
  confidenceScore: number;
  confidenceBand: DemandConfidenceBand;
  loadBand: DemandLoadBand;
  assumedBlendedRatePerKwh: number;
  reasoning: string[];
}

const DEFAULT_RATE_PER_KWH = 0.14;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function getAssumedRatePerKwh(state?: string | null): number {
  const normalized = state?.trim().toUpperCase() ?? "";

  switch (normalized) {
    case "FL":
      return 0.145;
    case "TX":
      return 0.12;
    case "CA":
      return 0.21;
    case "NY":
      return 0.19;
    default:
      return DEFAULT_RATE_PER_KWH;
  }
}

function getConfidenceScore(params: {
  hasUsageData: boolean;
  estimatedMonthlyBill: number;
}): number {
  if (params.hasUsageData) {
    return 84;
  }

  if (params.estimatedMonthlyBill >= 20000) {
    return 66;
  }

  if (params.estimatedMonthlyBill >= 10000) {
    return 60;
  }

  if (params.estimatedMonthlyBill >= 5000) {
    return 54;
  }

  return 46;
}

function getConfidenceBand(score: number): DemandConfidenceBand {
  if (score >= 75) return "high";
  if (score >= 55) return "medium";
  return "low";
}

function getLoadBand(estimatedPeakKw: number): DemandLoadBand {
  if (estimatedPeakKw >= 1000) return "infrastructure_candidate";
  if (estimatedPeakKw >= 500) return "large_commercial";
  if (estimatedPeakKw >= 150) return "mid_commercial";
  if (estimatedPeakKw >= 40) return "small_commercial";
  return "micro";
}

export function buildBillToDemandIntelligence(
  input: BillToDemandInput,
): BillToDemandResult {
  const estimatedMonthlyBill = input.estimatedMonthlyBill ?? 0;
  const assumedBlendedRatePerKwh = getAssumedRatePerKwh(input.state);

  const estimatedAnnualSpend = round(estimatedMonthlyBill * 12, 2);
  const estimatedAnnualKwh =
    assumedBlendedRatePerKwh > 0
      ? round(estimatedAnnualSpend / assumedBlendedRatePerKwh, 2)
      : 0;

  const estimatedAverageKw =
    estimatedAnnualKwh > 0
      ? round(estimatedAnnualKwh / 8760, 2)
      : 0;

  const estimatedPeakKw = round(estimatedAverageKw * 2.35, 2);

  const confidenceScore = clamp(
    getConfidenceScore({
      hasUsageData: input.hasUsageData,
      estimatedMonthlyBill,
    }),
    0,
    100,
  );

  const confidenceBand = getConfidenceBand(confidenceScore);
  const loadBand = getLoadBand(estimatedPeakKw);

  const reasoning: string[] = [
    `Assumed blended rate: ${assumedBlendedRatePerKwh} $/kWh.`,
    `Estimated annual spend from monthly bill: ${estimatedAnnualSpend}.`,
    `Estimated annual kWh derived from spend ÷ blended rate.`,
    `Estimated average kW derived from annual kWh ÷ 8760 hours.`,
    `Estimated peak kW derived using commercial uplift factor of 2.35x average load.`,
  ];

  if (input.hasUsageData) {
    reasoning.push("Confidence increased because usage data is available.");
  } else {
    reasoning.push("Confidence reduced because estimate is inferred from bill instead of interval usage.");
  }

  return {
    estimatedAnnualSpend,
    estimatedAnnualKwh,
    estimatedAverageKw,
    estimatedPeakKw,
    confidenceScore,
    confidenceBand,
    loadBand,
    assumedBlendedRatePerKwh,
    reasoning,
  };
}