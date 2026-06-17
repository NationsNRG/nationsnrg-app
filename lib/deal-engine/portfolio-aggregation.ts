// lib/deal-engine/portfolio-aggregation.ts

export interface PortfolioAggregationInput {
  dealId: string;
  state: string | null;
  estimatedAnnualSpend: number | null;
  estimatedPeakKw: number | null;
  confidenceScore: number | null;
  triageTier: "small" | "mid" | "big";
  triageLane: "standard_supply" | "premium_escalation" | "infrastructure_triage";
  premiumPath: boolean;
  infrastructurePath: boolean;
}

export interface PortfolioAggregationDecision {
  holdForRollup: boolean;
  rollupLane: "standard_rollup" | "premium_rollup" | "infrastructure_cluster" | null;
  aggregationScore: number;
  aggregationReason: string;
  minimumClusterTarget: number;
}

export function evaluatePortfolioAggregation(
  input: PortfolioAggregationInput,
): PortfolioAggregationDecision {
  let score = 0;

  if (input.triageTier === "mid") score += 25;
  if (input.triageTier === "big") score += 40;
  if (input.premiumPath) score += 20;
  if (input.infrastructurePath) score += 30;
  if ((input.estimatedAnnualSpend ?? 0) >= 100000) score += 15;
  if ((input.estimatedPeakKw ?? 0) >= 250) score += 10;
  if ((input.confidenceScore ?? 0) >= 70) score += 10;

  if (input.infrastructurePath && score >= 45) {
    return {
      holdForRollup: true,
      rollupLane: "infrastructure_cluster",
      aggregationScore: score,
      aggregationReason: "Infrastructure signal supports cluster aggregation.",
      minimumClusterTarget: 3,
    };
  }

  if (input.premiumPath && score >= 45) {
    return {
      holdForRollup: true,
      rollupLane: "premium_rollup",
      aggregationScore: score,
      aggregationReason: "Premium-path deal may gain value through portfolio rollup.",
      minimumClusterTarget: 5,
    };
  }

  if (score >= 50) {
    return {
      holdForRollup: true,
      rollupLane: "standard_rollup",
      aggregationScore: score,
      aggregationReason: "Deal has enough mid-market value to hold for aggregation.",
      minimumClusterTarget: 8,
    };
  }

  return {
    holdForRollup: false,
    rollupLane: null,
    aggregationScore: score,
    aggregationReason: "Deal does not currently justify portfolio aggregation hold.",
    minimumClusterTarget: 0,
  };
}