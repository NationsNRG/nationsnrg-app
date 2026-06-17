// lib/deal-engine/opportunity-split.ts

export type OpportunityTier = "small" | "mid" | "big";
export type OpportunityLane =
  | "standard_supply"
  | "premium_escalation"
  | "infrastructure_triage";

export interface OpportunitySplitInput {
  dealId: string;
  estimatedMonthlyBill: number | null;
  estimatedAnnualSpend: number | null;
  estimatedPeakKw: number | null;
  confidenceScore: number | null;
  premiumPath: boolean;
  infrastructurePath: boolean;
  loadBand: string | null;
}

export interface OpportunitySplitResult {
  tier: OpportunityTier;
  lane: OpportunityLane;
  score: number;
  triageReason: string;
  routeToBigDealDesk: boolean;
  holdForAggregation: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function splitOpportunity(
  input: OpportunitySplitInput,
): OpportunitySplitResult {
  const monthlyBill = input.estimatedMonthlyBill ?? 0;
  const annualSpend = input.estimatedAnnualSpend ?? monthlyBill * 12;
  const peakKw = input.estimatedPeakKw ?? 0;
  const confidence = input.confidenceScore ?? 0;

  let score = 0;

  if (annualSpend >= 500000) {
    score += 40;
  } else if (annualSpend >= 250000) {
    score += 28;
  } else if (annualSpend >= 100000) {
    score += 18;
  } else {
    score += 8;
  }

  if (peakKw >= 1000) {
    score += 35;
  } else if (peakKw >= 500) {
    score += 24;
  } else if (peakKw >= 150) {
    score += 14;
  } else {
    score += 6;
  }

  if (input.infrastructurePath) {
    score += 18;
  }

  if (input.premiumPath) {
    score += 10;
  }

  if (input.loadBand === "infrastructure_candidate") {
    score += 15;
  }

  if (confidence >= 75) {
    score += 10;
  } else if (confidence >= 55) {
    score += 6;
  } else {
    score -= 4;
  }

  score = clamp(score, 0, 100);

  let tier: OpportunityTier = "small";
  let lane: OpportunityLane = "standard_supply";
  let triageReason = "Default standard supply routing.";
  let routeToBigDealDesk = false;
  let holdForAggregation = false;

  if (score >= 75 || input.infrastructurePath || peakKw >= 500) {
    tier = "big";
    lane = input.infrastructurePath
      ? "infrastructure_triage"
      : "premium_escalation";
    triageReason =
      input.infrastructurePath || input.loadBand === "infrastructure_candidate"
        ? "High-value infrastructure-grade opportunity."
        : "Large premium-path opportunity with outsized value.";
    routeToBigDealDesk = true;
  } else if (score >= 45) {
    tier = "mid";
    lane = input.premiumPath ? "premium_escalation" : "standard_supply";
    triageReason =
      lane === "premium_escalation"
        ? "Mid-tier opportunity with premium upside."
        : "Solid commercial opportunity for normal routing.";
    holdForAggregation = annualSpend >= 150000 && confidence < 60;
  } else {
    tier = "small";
    lane = "standard_supply";
    triageReason = "Smaller opportunity best handled in standard lane.";
  }

  return {
    tier,
    lane,
    score,
    triageReason,
    routeToBigDealDesk,
    holdForAggregation,
  };
}