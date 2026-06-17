// lib/deal-engine/origination/clustering.ts

import type {
  DealClusterCandidateInput,
  DealClusterCandidateOutput,
  DealClusterType,
} from "../types";
import { clampScore } from "../types";
import { dealClusterCandidateInputSchema } from "../validation";

function pushUnique(values: string[], value: string | null | undefined): void {
  if (!value) {
    return;
  }

  if (!values.includes(value)) {
    values.push(value);
  }
}

function chooseClusterType(params: {
  regionKey?: string | null;
  utilityKey?: string | null;
  sectorKey?: string | null;
  timeWindowKey?: string | null;
  hasPortfolioSignal: boolean;
  estimatedAvgMw?: number | null;
}): DealClusterType | null {
  const {
    regionKey,
    utilityKey,
    sectorKey,
    timeWindowKey,
    hasPortfolioSignal,
    estimatedAvgMw,
  } = params;

  if (hasPortfolioSignal && estimatedAvgMw != null && estimatedAvgMw >= 0.75) {
    return "portfolio";
  }

  if (regionKey && utilityKey && sectorKey) {
    return "hybrid";
  }

  if (regionKey && utilityKey) {
    return "geographic";
  }

  if (hasPortfolioSignal) {
    return "portfolio";
  }

  if (sectorKey && estimatedAvgMw != null && estimatedAvgMw >= 0.5) {
    return "sector";
  }

  if (utilityKey) {
    return "utility_territory";
  }

  if (timeWindowKey) {
    return "time_window";
  }

  return null;
}

export function evaluateClusterCandidate(
  rawInput: unknown,
): DealClusterCandidateOutput {
  const input = dealClusterCandidateInputSchema.parse(rawInput);

  const matchingKeys: string[] = [];
  pushUnique(matchingKeys, input.primaryEntityId ?? null);
  pushUnique(matchingKeys, input.regionKey ?? null);
  pushUnique(matchingKeys, input.utilityKey ?? null);
  pushUnique(matchingKeys, input.sectorKey ?? null);
  pushUnique(matchingKeys, input.timeWindowKey ?? null);

  const hasPortfolioSignal = Boolean(input.primaryEntityId);
  const recommendedClusterType = chooseClusterType({
    regionKey: input.regionKey,
    utilityKey: input.utilityKey,
    sectorKey: input.sectorKey,
    timeWindowKey: input.timeWindowKey,
    hasPortfolioSignal,
    estimatedAvgMw: input.estimatedAvgMw,
  });

  let confidence = 0;

  if (input.primaryEntityId) {
    confidence += 26;
  }

  if (input.regionKey) {
    confidence += 18;
  }

  if (input.utilityKey) {
    confidence += 16;
  }

  if (input.sectorKey) {
    confidence += 14;
  }

  if (input.timeWindowKey) {
    confidence += 10;
  }

  if (input.estimatedAvgMw != null && input.estimatedAvgMw >= 0.5) {
    confidence += 8;
  }

  if (input.estimatedValue != null && input.estimatedValue >= 50000) {
    confidence += 8;
  }

  const clusterCandidate = recommendedClusterType != null && matchingKeys.length >= 2;
  const bundleCandidate =
    clusterCandidate &&
    ((input.estimatedAvgMw != null && input.estimatedAvgMw >= 0.75) ||
      (input.estimatedValue != null && input.estimatedValue >= 100000) ||
      hasPortfolioSignal);

  let bundleRationale: string | null = null;

  if (bundleCandidate) {
    if (hasPortfolioSignal) {
      bundleRationale =
        "Portfolio ownership signal detected; bundling may create stronger commercial leverage.";
    } else if (input.estimatedAvgMw != null && input.estimatedAvgMw >= 0.75) {
      bundleRationale =
        "Estimated load suggests bundled infrastructure or premium routing potential.";
    } else if (input.estimatedValue != null && input.estimatedValue >= 100000) {
      bundleRationale =
        "Estimated economic value supports bundle consideration for stronger partner positioning.";
    }
  }

  return {
    clusterCandidate,
    recommendedClusterType,
    bundleCandidate,
    bundleRationale,
    confidenceScore: clampScore(confidence),
    matchingKeys,
  };
}