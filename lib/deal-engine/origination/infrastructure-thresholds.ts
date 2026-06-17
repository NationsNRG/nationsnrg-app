// lib/deal-engine/origination/infrastructure-thresholds.ts

import type {
  DealInfrastructureAssessmentInput,
  DealInfrastructureAssessmentOutput,
  DealInfrastructureClass,
  JsonObject,
} from "../types";
import { clampScore } from "../types";
import { parseDealInfrastructureAssessmentInput } from "../validation";

interface ThresholdDecision {
  infrastructureClass: DealInfrastructureClass;
  infrastructureGradeScore: number;
  thresholdTriggerType: string | null;
  infrastructureFlag: boolean;
  portfolioRollupFlag: boolean;
  financingRelevanceFlag: boolean;
  premiumPartnerFlag: boolean;
  autoRouteLplEligible: boolean;
  autoRouteLplScore: number;
  autoRoutePartnerTier: string | null;
  primaryPartnerRoute: string | null;
  secondaryPartnerRoute: string | null;
  infrastructureReasonCodes: string[];
  routingRationale: JsonObject;
  thresholdInputs: JsonObject;
  assumptions: JsonObject;
}

function maybePush(target: string[], condition: boolean, value: string): void {
  if (condition) {
    target.push(value);
  }
}

export function assessInfrastructureThreshold(
  rawInput: unknown,
): DealInfrastructureAssessmentOutput {
  const input = parseDealInfrastructureAssessmentInput(rawInput);

  const estimatedAvgMw = input.estimatedAvgMw ?? 0;
  const estimatedPeakMw = input.estimatedPeakMw ?? 0;
  const aggregatedClusterMw = input.aggregatedClusterMw ?? 0;
  const siteCount = input.siteCount ?? 0;
  const annualSpendAmount = input.annualSpendAmount ?? 0;

  const effectiveMw = Math.max(estimatedPeakMw, estimatedAvgMw, aggregatedClusterMw);
  const financingRelevant = Boolean(input.financingRequested);
  const portfolioRollupFlag = siteCount >= 3 || aggregatedClusterMw >= 1.25;

  const reasonCodes: string[] = [];
  maybePush(reasonCodes, estimatedPeakMw >= 1, "peak_mw_threshold");
  maybePush(reasonCodes, estimatedAvgMw >= 0.75, "avg_mw_threshold");
  maybePush(reasonCodes, aggregatedClusterMw >= 1.25, "cluster_rollup_threshold");
  maybePush(reasonCodes, siteCount >= 3, "multi_site_threshold");
  maybePush(reasonCodes, annualSpendAmount >= 250000, "annual_spend_threshold");
  maybePush(reasonCodes, financingRelevant, "financing_signal");
  maybePush(reasonCodes, input.hasLandSignal === true, "land_signal");
  maybePush(reasonCodes, input.hasRoofSignal === true, "roof_signal");
  maybePush(reasonCodes, input.hasResilienceSignal === true, "resilience_signal");
  maybePush(reasonCodes, input.hasStorageSignal === true, "storage_signal");

  let gradeScore = 0;

  if (estimatedPeakMw >= 2) {
    gradeScore += 30;
  } else if (estimatedPeakMw >= 1) {
    gradeScore += 22;
  } else if (estimatedPeakMw >= 0.5) {
    gradeScore += 12;
  }

  if (aggregatedClusterMw >= 2) {
    gradeScore += 20;
  } else if (aggregatedClusterMw >= 1.25) {
    gradeScore += 14;
  } else if (aggregatedClusterMw >= 0.75) {
    gradeScore += 8;
  }

  if (siteCount >= 10) {
    gradeScore += 15;
  } else if (siteCount >= 5) {
    gradeScore += 10;
  } else if (siteCount >= 3) {
    gradeScore += 6;
  }

  if (annualSpendAmount >= 1000000) {
    gradeScore += 16;
  } else if (annualSpendAmount >= 500000) {
    gradeScore += 12;
  } else if (annualSpendAmount >= 250000) {
    gradeScore += 8;
  }

  if (financingRelevant) {
    gradeScore += 6;
  }

  if (input.hasLandSignal) {
    gradeScore += 5;
  }

  if (input.hasRoofSignal) {
    gradeScore += 5;
  }

  if (input.hasResilienceSignal) {
    gradeScore += 4;
  }

  if (input.hasStorageSignal) {
    gradeScore += 4;
  }

  gradeScore = clampScore(gradeScore);

  let infrastructureClass: DealInfrastructureClass = "standard_commercial";
  let thresholdTriggerType: string | null = null;
  let infrastructureFlag = false;
  let premiumPartnerFlag = false;

  if (gradeScore >= 80 || effectiveMw >= 2 || aggregatedClusterMw >= 2.5) {
    infrastructureClass = portfolioRollupFlag
      ? "portfolio_infrastructure"
      : "infrastructure_grade";
    thresholdTriggerType = aggregatedClusterMw >= 2.5
      ? "aggregated_cluster_mw"
      : effectiveMw >= 2
      ? "direct_mw"
      : "grade_score";
    infrastructureFlag = true;
    premiumPartnerFlag = true;
  } else if (
    gradeScore >= 55 ||
    effectiveMw >= 0.75 ||
    aggregatedClusterMw >= 1.25 ||
    siteCount >= 3
  ) {
    infrastructureClass = "structured_midmarket";
    thresholdTriggerType =
      effectiveMw >= 0.75
        ? "midmarket_mw"
        : aggregatedClusterMw >= 1.25
        ? "midmarket_cluster_rollup"
        : siteCount >= 3
        ? "multi_site"
        : "grade_score";
    infrastructureFlag = true;
    premiumPartnerFlag = gradeScore >= 68 || aggregatedClusterMw >= 1.5;
  } else if (reasonCodes.length === 0) {
    infrastructureClass = "uncertain";
  }

  let autoRouteLplScore = 0;

  if (infrastructureFlag) {
    autoRouteLplScore += 35;
  }

  if (premiumPartnerFlag) {
    autoRouteLplScore += 20;
  }

  if (portfolioRollupFlag) {
    autoRouteLplScore += 12;
  }

  if (input.hasLandSignal || input.hasRoofSignal) {
    autoRouteLplScore += 10;
  }

  if (input.hasStorageSignal || input.hasResilienceSignal) {
    autoRouteLplScore += 8;
  }

  if (financingRelevant) {
    autoRouteLplScore += 8;
  }

  if (annualSpendAmount >= 500000) {
    autoRouteLplScore += 10;
  } else if (annualSpendAmount >= 250000) {
    autoRouteLplScore += 5;
  }

  autoRouteLplScore = clampScore(autoRouteLplScore);

  const autoRouteLplEligible =
    autoRouteLplScore >= 65 &&
    infrastructureClass !== "standard_commercial" &&
    infrastructureClass !== "uncertain";

  let autoRoutePartnerTier: string | null = null;
  let primaryPartnerRoute: string | null = null;
  let secondaryPartnerRoute: string | null = null;

  if (autoRouteLplEligible) {
    autoRoutePartnerTier = "premium_infrastructure_partner";
    primaryPartnerRoute = "LPL_SOLAR";
    secondaryPartnerRoute = "SMALLER_EPC_FALLBACK";
  } else if (infrastructureFlag) {
    autoRoutePartnerTier = premiumPartnerFlag
      ? "premium_partner_review"
      : "standard_infrastructure_partner";
    primaryPartnerRoute = premiumPartnerFlag
      ? "PREMIUM_INFRA_REVIEW"
      : "SMALLER_EPC";
    secondaryPartnerRoute = "NATIONSNRG_STRUCTURED_DESK";
  } else {
    autoRoutePartnerTier = "standard_energy_execution";
    primaryPartnerRoute = "NATIONSRG_STANDARD_FLOW";
    secondaryPartnerRoute = "SMALLER_PARTNER_NETWORK";
  }

  const decision: ThresholdDecision = {
    infrastructureClass,
    infrastructureGradeScore: gradeScore,
    thresholdTriggerType,
    infrastructureFlag,
    portfolioRollupFlag,
    financingRelevanceFlag: financingRelevant,
    premiumPartnerFlag,
    autoRouteLplEligible,
    autoRouteLplScore,
    autoRoutePartnerTier,
    primaryPartnerRoute,
    secondaryPartnerRoute,
    infrastructureReasonCodes: reasonCodes,
    routingRationale: {
      effectiveMw,
      aggregatedClusterMw,
      siteCount,
      annualSpendAmount,
      premiumPartnerFlag,
      lplRouteTriggered: autoRouteLplEligible,
    },
    thresholdInputs: {
      estimatedAvgMw,
      estimatedPeakMw,
      aggregatedClusterMw,
      siteCount,
      annualSpendAmount,
      financingRequested: financingRelevant,
      facilityType: input.facilityType ?? null,
      hasLandSignal: input.hasLandSignal ?? false,
      hasRoofSignal: input.hasRoofSignal ?? false,
      hasResilienceSignal: input.hasResilienceSignal ?? false,
      hasStorageSignal: input.hasStorageSignal ?? false,
      },
      assumptions: {
        source: "infrastructure_threshold_assessment",
        estimatedAvgMwDefaulted: input.estimatedAvgMw == null,
        estimatedPeakMwDefaulted: input.estimatedPeakMw == null,
        aggregatedClusterMwDefaulted: input.aggregatedClusterMw == null,
        siteCountDefaulted: input.siteCount == null,
        annualSpendAmountDefaulted: input.annualSpendAmount == null,
      },
  };

  return decision;
}