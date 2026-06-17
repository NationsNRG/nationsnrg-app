// lib/deal-engine/intake-intelligence.ts

import { buildBillToDemandIntelligence } from "./bill-to-demand";

export interface IntakeIntelligenceInput {
  businessName: string;
  estimatedMonthlyBill?: number | null;
  state?: string | null;
  hasUsageData: boolean;
}

export interface IntakeIntelligenceResult {
  requiredDocuments: string[];
  blockers: string[];
  packageReady: boolean;
  requiresHumanReview: boolean;
  premiumPath: boolean;
  infrastructurePath: boolean;
  recurringPossible: boolean;
  bundleCandidate: boolean;
  confidenceScore: number;
  lplReadinessScore: number;
  queuePriorityScore: number;
  nextBestAction: string;
  routeReason: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function estimateLplReadiness(params: {
  infrastructurePath: boolean;
  hasUsageData: boolean;
  estimatedPeakKw: number;
  confidenceScore: number;
}): number {
  if (!params.infrastructurePath) {
    return 22;
  }

  let score = 48;

  if (params.hasUsageData) {
    score += 14;
  }

  if (params.estimatedPeakKw >= 1000) {
    score += 18;
  } else if (params.estimatedPeakKw >= 500) {
    score += 12;
  } else if (params.estimatedPeakKw >= 150) {
    score += 6;
  }

  if (params.confidenceScore >= 75) {
    score += 10;
  } else if (params.confidenceScore >= 55) {
    score += 5;
  }

  return clamp(score, 0, 100);
}

function buildNextBestAction(params: {
  packageReady: boolean;
  infrastructurePath: boolean;
  premiumPath: boolean;
  hasUsageData: boolean;
}): string {
  if (!params.packageReady && !params.hasUsageData) {
    return "Collect utility bill and usage data";
  }

  if (params.infrastructurePath) {
    return "Validate infrastructure readiness and prepare premium escalation review";
  }

  if (params.premiumPath) {
    return "Prepare controlled supplier and premium review posture";
  }

  return "Proceed to supplier pricing";
}

function buildRouteReason(params: {
  premiumPath: boolean;
  infrastructurePath: boolean;
  hasUsageData: boolean;
  estimatedMonthlyBill: number;
}): string {
  if (params.infrastructurePath && !params.hasUsageData) {
    return "High value commercial opportunity with infrastructure potential but incomplete data";
  }

  if (params.infrastructurePath) {
    return "Infrastructure-grade commercial opportunity";
  }

  if (params.premiumPath) {
    return "High value commercial opportunity";
  }

  if (!params.hasUsageData) {
    return "Standard intake flow with missing usage support";
  }

  return "Standard intake flow";
}

export function buildIntakeIntelligence(
  input: IntakeIntelligenceInput,
): IntakeIntelligenceResult {
  const estimatedMonthlyBill = input.estimatedMonthlyBill ?? 0;

  const demand = buildBillToDemandIntelligence({
    estimatedMonthlyBill,
    state: input.state ?? null,
    hasUsageData: input.hasUsageData,
  });

  const requiredDocuments = input.hasUsageData
    ? []
    : ["utility_bill", "usage_history"];

  const blockers = input.hasUsageData
    ? []
    : ["missing_usage_data"];

  const packageReady =
    requiredDocuments.length === 0 && blockers.length === 0;

  const premiumPath =
    demand.estimatedPeakKw >= 150 || estimatedMonthlyBill >= 5000;

  const infrastructurePath =
    demand.loadBand === "infrastructure_candidate" ||
    demand.estimatedPeakKw >= 500 ||
    estimatedMonthlyBill >= 10000;

  const recurringPossible = true;

  const bundleCandidate =
    demand.estimatedPeakKw >= 750 || estimatedMonthlyBill >= 20000;

  const confidenceScore = demand.confidenceScore;

  const lplReadinessScore = estimateLplReadiness({
    infrastructurePath,
    hasUsageData: input.hasUsageData,
    estimatedPeakKw: demand.estimatedPeakKw,
    confidenceScore,
  });

  const queuePriorityScore = clamp(
    Math.round(
      estimatedMonthlyBill / 100 +
      demand.estimatedPeakKw / 10
    ),
    10,
    250,
  );

  const requiresHumanReview =
    !packageReady || premiumPath || infrastructurePath || confidenceScore < 55;

  const nextBestAction = buildNextBestAction({
    packageReady,
    infrastructurePath,
    premiumPath,
    hasUsageData: input.hasUsageData,
  });

  const routeReason = buildRouteReason({
    premiumPath,
    infrastructurePath,
    hasUsageData: input.hasUsageData,
    estimatedMonthlyBill,
  });

  return {
    requiredDocuments,
    blockers,
    packageReady,
    requiresHumanReview,
    premiumPath,
    infrastructurePath,
    recurringPossible,
    bundleCandidate,
    confidenceScore,
    lplReadinessScore,
    queuePriorityScore,
    nextBestAction,
    routeReason,
  };
}