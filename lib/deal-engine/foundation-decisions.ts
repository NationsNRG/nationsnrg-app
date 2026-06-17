// lib/deal-engine/foundation-decisions.ts

import type {
  CompensationAttachmentStatus,
  DealDisclosureTier,
  DealPackageAudience,
  EconomicStackType,
  LplCandidateStatus,
  PortfolioReleaseDecision,
  SupplierSequenceType,
} from "./foundation-types";

export interface FoundationControlDecision {
  packageAudience: DealPackageAudience;
  disclosureTier: DealDisclosureTier;
  releaseHeld: boolean;
  releaseReason: string | null;
}

export interface FoundationSupplierStrategyDecision {
  sequenceType: SupplierSequenceType;
  visibilityTier: DealDisclosureTier;
  packageAudience: DealPackageAudience;
  holdReason: string | null;
}

export interface FoundationEconomicDecision {
  stackType: EconomicStackType;
  compensationAttachmentStatus: CompensationAttachmentStatus;
  primaryTransactionModel: string | null;
  secondaryLayers: string[];
  tertiaryLayers: string[];
}

export interface FoundationLplDecision {
  candidateStatus: LplCandidateStatus;
  readinessScore: number;
  holdReason: string | null;
  fallbackPath: string | null;
}

export interface FoundationPortfolioDecision {
  decision: PortfolioReleaseDecision;
  portfolioValueScore: number;
  holdReason: string | null;
  releaseTrigger: string | null;
  splitRecommendation: Record<string, unknown>;
}

export interface FoundationRiskDecision {
  riskType: string;
  riskScore: number;
  reviewRequired: boolean;
  notes: string | null;
}

export function buildFoundationControlDecision(params: {
  requiresHumanReview: boolean;
  packageReady: boolean;
  premiumPath: boolean;
}): FoundationControlDecision {
  if (!params.packageReady) {
    return {
      packageAudience: "internal",
      disclosureTier: "tier_0_internal",
      releaseHeld: true,
      releaseReason: "Package not ready for external release.",
    };
  }

  if (params.premiumPath) {
    return {
      packageAudience: "lpl",
      disclosureTier: "tier_4_premium",
      releaseHeld: params.requiresHumanReview,
      releaseReason: params.requiresHumanReview
        ? "Premium path requires review before release."
        : null,
    };
  }

  return {
    packageAudience: "supplier_qualified",
    disclosureTier: "tier_2_qualified",
    releaseHeld: params.requiresHumanReview,
    releaseReason: params.requiresHumanReview
      ? "Qualified package held for review."
      : null,
  };
}

export function buildFoundationSupplierStrategyDecision(params: {
  premiumPath: boolean;
  packageReady: boolean;
}): FoundationSupplierStrategyDecision {
  if (!params.packageReady) {
    return {
      sequenceType: "hold_until_ready",
      visibilityTier: "tier_0_internal",
      packageAudience: "internal",
      holdReason: "Package incomplete.",
    };
  }

  if (params.premiumPath) {
    return {
      sequenceType: "premium_first_look",
      visibilityTier: "tier_4_premium",
      packageAudience: "lpl",
      holdReason: null,
    };
  }

  return {
    sequenceType: "sequential_waterfall",
    visibilityTier: "tier_2_qualified",
    packageAudience: "supplier_qualified",
    holdReason: null,
  };
}

export function buildFoundationEconomicDecision(params: {
  premiumPath: boolean;
  infrastructurePath: boolean;
  recurringPossible: boolean;
}): FoundationEconomicDecision {
  if (params.premiumPath) {
    return {
      stackType: "premium_escalation",
      compensationAttachmentStatus: "review_required",
      primaryTransactionModel: "premium_success_fee",
      secondaryLayers: ["packaging_fee", "advisory_fee"],
      tertiaryLayers: ["retained_upside", "future_expansion_rights"],
    };
  }

  if (params.infrastructurePath) {
    return {
      stackType: "infrastructure",
      compensationAttachmentStatus: "preliminary",
      primaryTransactionModel: "origination_fee",
      secondaryLayers: ["packaging_fee", "coordination_fee"],
      tertiaryLayers: params.recurringPossible ? ["follow_on_rights"] : [],
    };
  }

  return {
    stackType: "direct_execution",
    compensationAttachmentStatus: "preliminary",
    primaryTransactionModel: "broker_margin",
    secondaryLayers: [],
    tertiaryLayers: params.recurringPossible ? ["renewal_rights"] : [],
  };
}

export function buildFoundationLplDecision(params: {
  premiumPath: boolean;
  packageReady: boolean;
  readinessScore: number;
}): FoundationLplDecision {
  if (!params.premiumPath) {
    return {
      candidateStatus: "not_lpl_candidate",
      readinessScore: 0,
      holdReason: null,
      fallbackPath: "standard_supplier_path",
    };
  }

  if (!params.packageReady) {
    return {
      candidateStatus: "lpl_potential_hold",
      readinessScore: params.readinessScore,
      holdReason: "Package maturity insufficient.",
      fallbackPath: "premium_epc_fallback",
    };
  }

  return {
    candidateStatus: "lpl_review_candidate",
    readinessScore: params.readinessScore,
    holdReason: null,
    fallbackPath: "premium_epc_fallback",
  };
}

export function buildFoundationPortfolioDecision(params: {
  bundleCandidate: boolean;
  premiumPath: boolean;
}): FoundationPortfolioDecision {
  if (params.bundleCandidate && params.premiumPath) {
    return {
      decision: "hold_for_rollup",
      portfolioValueScore: 78,
      holdReason: "Aggregation may improve premium escalation quality.",
      releaseTrigger: "adjacent_density_improves_or_hold_window_expires",
      splitRecommendation: {},
    };
  }

  return {
    decision: "release_now",
    portfolioValueScore: 42,
    holdReason: null,
    releaseTrigger: null,
    splitRecommendation: {},
  };
}

export function buildFoundationRiskDecision(params: {
  packageReady: boolean;
  confidenceScore: number;
}): FoundationRiskDecision {
  if (!params.packageReady) {
    return {
      riskType: "insufficient_package_quality",
      riskScore: 72,
      reviewRequired: true,
      notes: "External release should remain blocked.",
    };
  }

  if (params.confidenceScore < 40) {
    return {
      riskType: "low_confidence_origination",
      riskScore: 61,
      reviewRequired: true,
      notes: "Origination confidence too low for blind progression.",
    };
  }

  return {
    riskType: "baseline_operational_risk",
    riskScore: 24,
    reviewRequired: false,
    notes: null,
  };
}