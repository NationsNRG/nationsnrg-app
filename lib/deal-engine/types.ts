export type JsonPrimitive =
  | string
  | number
  | boolean
  | null;

export type JsonValue =
  | JsonPrimitive
  | JsonObject
  | JsonValue[];

export type JsonObject = {
  [key: string]: JsonValue;
};

export type DealPackageBuildInput = {
  deal: {
    dealCode: string;
    title: string;
    status: string;
    nextBestAction: string | null;
  };
  opportunity: {
    title: string;
    description: string | null;
    opportunityType: string;
    opportunityClass: string | null;
    qualificationStatus: string | null;
    blockerSummary: string[];
    requiredDocuments: string[];
  };
  demandEstimate: {
    estimationMethod: string | null;
    annualMwh: number | null;
    estimatedAvgMw: number | null;
    estimatedPeakMw: number | null;
    estimatedPeakKw: number | null;
    mwConfidenceScore: number | null;
    assumptions: JsonObject;
  } | null;
  infrastructureAssessment: {
    infrastructureClass: string | null;
    infrastructureGradeScore: number | null;
    infrastructureFlag: boolean;
    autoRouteLplEligible: boolean;
    autoRouteLplScore: number | null;
    primaryPartnerRoute: string | null;
    secondaryPartnerRoute: string | null;
    infrastructureReasonCodes: string[];
  } | null;
  monetizationProfile: {
    economicStructureType: string | null;
    tier1ValueDriver: string | null;
    tier2ValueDriver: string | null;
    tier3ValueDriver: string | null;
    stackedMonetizationFlag: boolean;
    monetizationProfile: string | null;
    primaryRevenueModel: string | null;
    secondaryRevenueModels: string[];
    revenueCapturePriority: string | null;
    recurringRevenueFlag: boolean;
  } | null;
  clusterSummary: JsonObject | null;
  routeSummary: JsonObject | null;
  nextBestActions: string[] | null;
  confidenceNotes: string[] | null;
};

export type DealPackageBuildOutput = {
  title: string;
  executiveSummary: string | null;
  opportunitySummary: JsonObject;
  demandSummary: JsonObject;
  clusterSummary: JsonObject;
  infrastructureSummary: JsonObject;
  economicStructureSummary: JsonObject;
  monetizationSummary: JsonObject;
  routeSummary: JsonObject;
  blockers: string[];
  requiredDocuments: string[];
  nextBestActions: string[];
  confidenceNotes: string[];
};

export type DealSizeBand =
  | "micro"
  | "small"
  | "lower_midmarket"
  | "upper_midmarket"
  | "large"
  | "strategic"
  | "infrastructure";

export type DealInfrastructureClass =
  | "standard"
  | "standard_commercial"
  | "structured_midmarket"
  | "infrastructure_grade"
  | "portfolio_infrastructure"
  | "uncertain"
  | "unknown";

export type DealRouteType =
  | "standard_energy_execution"
  | "premium_partner"
  | "standard_partner"
  | "small_partner"
  | "vertical_adapter"
  | "premium_partner_review"
  | "premium_infrastructure_partner"
  | "standard_infrastructure_partner"
  | "nationsnrg_structured_desk"
  | "smaller_epc"
  | "smaller_partner_network"
  | "lpl_solar"
  | "unknown";

export type DealStructureType =
  | "single_path"
  | "standard_supply"
  | "structured_midmarket"
  | "infrastructure"
  | "infrastructure_stack"
  | "portfolio_rollup"
  | "premium_partner"
  | "blended"
  | "financed"
  | "recurring_service"
  | "unknown";

export type DealMonetizationProfileType =
  | "light_touch_volume"
  | "direct_execution"
  | "blended_services"
  | "premium_partner"
  | "infrastructure_stack"
  | "recurring_optimization";

export type DealMonetizationProfileInput = {
  sizeBand: DealSizeBand;
  infrastructureClass: DealInfrastructureClass;
  recurringRevenuePossible: boolean;
  bundled: boolean;
  routeType?: string | null;
  financingRelevant?: boolean | null;
};

export type DealMonetizationProfileOutput = {
  monetizationProfile: DealMonetizationProfileType;
  primaryRevenueModel: string;
  secondaryRevenueModels: string[];
  revenueCapturePriority: string[];
  tier1ValueDriver: string | null;
  tier2ValueDriver: string | null;
  tier3ValueDriver: string | null;
  economicStructureType: string | null;
  stackedMonetizationFlag: boolean;
  recurringRevenueFlag: boolean;
  assumptions: JsonObject;
  rationale: JsonObject;
};

export type DealClusterType =
  | "portfolio"
  | "hybrid"
  | "geographic"
  | "sector"
  | "utility_territory"
  | "time_window";

export type DealClusterCandidateInput = {
  primaryEntityId?: string | null;
  regionKey?: string | null;
  utilityKey?: string | null;
  sectorKey?: string | null;
  timeWindowKey?: string | null;

  /**
   * Average MW estimate used for cluster and bundle eligibility.
   * This may be provided directly or injected from the demand-estimation engine.
   */
  estimatedAvgMw?: number | null;

  /**
   * Peak MW estimate used by the embedded origination engine when enriching
   * cluster candidate context from demand estimation output.
   */
  estimatedPeakMw?: number | null;

  /**
   * Estimated economic value used for bundle and commercial leverage checks.
   */
  estimatedValue?: number | null;
};

export type DealClusterCandidateOutput = {
  clusterCandidate: boolean;
  recommendedClusterType: DealClusterType | null;
  bundleCandidate: boolean;
  bundleRationale: string | null;
  confidenceScore: number;
  matchingKeys: string[];
};

export function clampScore(score: number): number {
  return Math.min(100, Math.max(0, Math.round(score)));
}

export type DealDemandEstimationMethod =
  | "direct_mw_input"
  | "direct_kw_input"
  | "annual_usage_derived"
  | "bill_derived"
  | "sparse_inference"
  | "unknown";

export type DealDemandEstimateInput = {
  annualSpendAmount?: number | null;
  monthlyBillAmount?: number | null;
  annualKwh?: number | null;
  monthlyKwh?: number | null;
  annualMwh?: number | null;
  directMwInput?: number | null;
  directKwInput?: number | null;
  siteCount?: number | null;
  facilityType?: string | null;
  businessModelHint?: string | null;
  assumptions?: {
    inferredRatePerKwh?: number | null;
    inferredLoadFactor?: number | null;
    peakMultiplier?: number | null;
    aggregationFactor?: number | null;
  } | null;
};

export type DealDemandEstimateOutput = {
  estimationMethod: DealDemandEstimationMethod;
  annualMwh: number | null;
  estimatedAvgMw: number | null;
  estimatedPeakMw: number | null;
  estimatedPeakKw: number | null;
  mwConfidenceScore: number;
  siteCountUsed: number | null;
  assumptions: JsonObject;
  calculationTrace: JsonObject;
};

export type DealInfrastructureAssessmentInput = {
  estimatedAvgMw?: number | null;
  estimatedPeakMw?: number | null;
  aggregatedClusterMw?: number | null;
  annualSpendAmount?: number | null;
  siteCount?: number | null;
  facilityType?: string | null;
  financingRequested?: boolean | null;
  hasLandSignal?: boolean | null;
  hasRoofSignal?: boolean | null;
  hasResilienceSignal?: boolean | null;
  hasStorageSignal?: boolean | null;
  landAvailable?: boolean | null;
  roofAvailable?: boolean | null;
  storageRelevant?: boolean | null;
  resilienceRelevant?: boolean | null;
  premiumPartnerFlag?: boolean | null;
};

export type DealInfrastructureAssessmentOutput = {
  infrastructureClass: DealInfrastructureClass;
  infrastructureGradeScore: number;
  infrastructureFlag: boolean;
  premiumPartnerFlag: boolean;
  portfolioRollupFlag: boolean;
  financingRelevanceFlag: boolean;
  autoRouteLplEligible: boolean;
  autoRouteLplScore: number;
  autoRoutePartnerTier: string | null;
  primaryPartnerRoute: string | null;
  secondaryPartnerRoute: string | null;
  infrastructureReasonCodes: string[];
  routingRationale: JsonObject;
  assumptions: JsonObject;
};

export type DealSizeBandInput = {
  estimatedAvgMw?: number | null;
  estimatedPeakMw?: number | null;
  aggregatedClusterMw?: number | null;
  annualSpendAmount?: number | null;
  infrastructureFlag?: boolean | null;
  premiumPartnerFlag?: boolean | null;
};

export type DealSizeBandOutput = {
  sizeBand: DealSizeBand;
  sizeBandScore: number;
  expectedValueBand: string;
  classificationReason: string;
};