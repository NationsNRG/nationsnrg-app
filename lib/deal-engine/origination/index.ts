// lib/deal-engine/origination/index.ts

import type {
  DealClusterCandidateInput,
  DealClusterCandidateOutput,
  DealDemandEstimateInput,
  DealDemandEstimateOutput,
  DealInfrastructureAssessmentInput,
  DealInfrastructureAssessmentOutput,
  DealMonetizationProfileInput,
  DealMonetizationProfileOutput,
  DealPackageBuildInput,
  DealPackageBuildOutput,
  DealSizeBandInput,
  DealSizeBandOutput,
} from "../types";
import { evaluateClusterCandidate } from "./clustering";
import { estimateDealDemand } from "./demand-estimation";
import { assessInfrastructureThreshold } from "./infrastructure-thresholds";
import { buildLplRoutingDecision, type LplRoutingDecision } from "./lpl-routing";
import { buildMonetizationProfile } from "../monetization";
import { buildDealPackage } from "../deal-package";

export interface EmbeddedOriginationEngineInput {
  demandEstimateInput: DealDemandEstimateInput;
  clusterCandidateInput: DealClusterCandidateInput;
  infrastructureAssessmentInput: DealInfrastructureAssessmentInput;
  monetizationProfileInput: DealMonetizationProfileInput;
  packageBuildInput: DealPackageBuildInput;
}

export interface EmbeddedOriginationEngineOutput {
  demandEstimate: DealDemandEstimateOutput;
  clusterCandidate: DealClusterCandidateOutput;
  infrastructureAssessment: DealInfrastructureAssessmentOutput;
  lplRoutingDecision: LplRoutingDecision;
  monetizationProfile: DealMonetizationProfileOutput;
  dealPackage: DealPackageBuildOutput;
}

export function classifyDealSizeBand(
  input: DealSizeBandInput,
): DealSizeBandOutput {
  const effectiveMw = Math.max(
    input.estimatedAvgMw ?? 0,
    input.estimatedPeakMw ?? 0,
    input.aggregatedClusterMw ?? 0,
  );
  const annualSpend = input.annualSpendAmount ?? 0;

  if (input.infrastructureFlag || effectiveMw >= 2 || annualSpend >= 1000000) {
    return {
      sizeBand: "infrastructure",
      sizeBandScore: 95,
      expectedValueBand: "infrastructure_grade",
      classificationReason: "Infrastructure-level demand or economics detected.",
    };
  }

  if (input.premiumPartnerFlag || effectiveMw >= 1 || annualSpend >= 500000) {
    return {
      sizeBand: "strategic",
      sizeBandScore: 82,
      expectedValueBand: "strategic",
      classificationReason: "Premium partner or large structured opportunity detected.",
    };
  }

  if (effectiveMw >= 0.5 || annualSpend >= 250000) {
    return {
      sizeBand: "large",
      sizeBandScore: 70,
      expectedValueBand: "large",
      classificationReason: "Large commercial opportunity based on demand or annual spend.",
    };
  }

  if (effectiveMw >= 0.2 || annualSpend >= 100000) {
    return {
      sizeBand: "upper_midmarket",
      sizeBandScore: 58,
      expectedValueBand: "upper_midmarket",
      classificationReason: "Upper mid-market profile detected.",
    };
  }

  if (effectiveMw >= 0.08 || annualSpend >= 50000) {
    return {
      sizeBand: "lower_midmarket",
      sizeBandScore: 46,
      expectedValueBand: "lower_midmarket",
      classificationReason: "Lower mid-market profile detected.",
    };
  }

  if (effectiveMw >= 0.02 || annualSpend >= 15000) {
    return {
      sizeBand: "small",
      sizeBandScore: 28,
      expectedValueBand: "small",
      classificationReason: "Valid small-deal band detected.",
    };
  }

  return {
    sizeBand: "micro",
    sizeBandScore: 15,
    expectedValueBand: "micro",
    classificationReason: "Low-scale but potentially monetizable opportunity.",
  };
}

export function runEmbeddedOriginationEngine(
  input: EmbeddedOriginationEngineInput,
): EmbeddedOriginationEngineOutput {
  const demandEstimate = estimateDealDemand(input.demandEstimateInput);
  const clusterCandidate = evaluateClusterCandidate({
    ...input.clusterCandidateInput,
    estimatedAvgMw:
      input.clusterCandidateInput.estimatedAvgMw ?? demandEstimate.estimatedAvgMw,
    estimatedPeakMw:
      input.clusterCandidateInput.estimatedPeakMw ?? demandEstimate.estimatedPeakMw,
  });

  const infrastructureAssessment = assessInfrastructureThreshold({
    ...input.infrastructureAssessmentInput,
    estimatedAvgMw:
      input.infrastructureAssessmentInput.estimatedAvgMw ??
      demandEstimate.estimatedAvgMw,
    estimatedPeakMw:
      input.infrastructureAssessmentInput.estimatedPeakMw ??
      demandEstimate.estimatedPeakMw,
  });

  const sizeBand = classifyDealSizeBand({
    estimatedAvgMw: demandEstimate.estimatedAvgMw,
    estimatedPeakMw: demandEstimate.estimatedPeakMw,
    annualSpendAmount: input.demandEstimateInput.annualSpendAmount ?? null,
    aggregatedClusterMw:
      clusterCandidate.bundleCandidate && demandEstimate.estimatedPeakMw != null
        ? demandEstimate.estimatedPeakMw
        : null,
    infrastructureFlag: infrastructureAssessment.infrastructureFlag,
    premiumPartnerFlag: infrastructureAssessment.premiumPartnerFlag,
  });

  const monetizationProfile = buildMonetizationProfile({
    ...input.monetizationProfileInput,
    sizeBand: input.monetizationProfileInput.sizeBand ?? sizeBand.sizeBand,
    infrastructureClass:
      input.monetizationProfileInput.infrastructureClass ??
      infrastructureAssessment.infrastructureClass,
  });

  const lplRoutingDecision = buildLplRoutingDecision(infrastructureAssessment);

  const dealPackage = buildDealPackage({
    ...input.packageBuildInput,
    demandEstimate,
    infrastructureAssessment,
    monetizationProfile,
    clusterSummary: {
      clusterCandidate: clusterCandidate.clusterCandidate,
      recommendedClusterType: clusterCandidate.recommendedClusterType,
      bundleCandidate: clusterCandidate.bundleCandidate,
      bundleRationale: clusterCandidate.bundleRationale,
      confidenceScore: clusterCandidate.confidenceScore,
      matchingKeys: clusterCandidate.matchingKeys,
    },
    routeSummary: lplRoutingDecision.routeSummary,
  });

  return {
    demandEstimate,
    clusterCandidate,
    infrastructureAssessment,
    lplRoutingDecision,
    monetizationProfile,
    dealPackage,
  };
}