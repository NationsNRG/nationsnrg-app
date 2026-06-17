// lib/deal-engine/epc-recommendation.ts

export interface EpcProfileInput {
  epcProfileId: string;
  epcIdentifier: string;
  epcName: string;
  coverageStates: string[];
  preferredMarkets: string[];
  preferredProjectTypes: string[];
  preferredIndustries: string[];
  minimumProjectValue: number | null;
  maximumProjectValue: number | null;
  minimumMonthlyEnergyBill: number | null;
  financingAppetite: string;
  speedToResponseScore: number;
  relationshipStrengthScore: number;
  disclosureTolerance: string;
  compensationRequirement: string;
  liabilityBoundaryRequirement: string;
  accountManagementRequired: boolean;
}

export interface EpcDealInput {
  dealId: string;
  state: string | null;
  industry: string | null;
  estimatedMonthlyBill: number | null;
  estimatedAnnualSpend: number | null;
  readinessScore: number | null;
  buyerIdentityStatus: string | null;
  siteDataStatus: string | null;
  compensationProtectionStatus: string | null;
  disclosureSafe: boolean;
  executionGateScore: number | null;
  hasLiabilityBoundary: boolean;
  hasAccountManagementOwner: boolean;
  executionLane: string | null;
}

export interface EpcRecommendationResult {
  fitScore: number;
  recommendationStatus:
    | "candidate"
    | "recommended"
    | "primary"
    | "backup"
    | "held"
    | "rejected";
  geographyScore: number;
  projectSizeScore: number;
  loadProfileScore: number;
  industryScore: number;
  buyerReadinessScore: number;
  siteReadinessScore: number;
  compensationProtectionScore: number;
  disclosureSafetyScore: number;
  executionGateScore: number;
  responseLikelihoodScore: number;
  relationshipScore: number;
  liabilityBoundaryScore: number;
  fitReason: string;
  recommendedPackageLevel:
    | "none"
    | "teaser"
    | "qualified_package"
    | "full_package"
    | "nda_required";
  recommendedNextAction: string;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function includesNormalized(values: string[], target: string | null): boolean {
  if (!target) return false;
  return values.map((v) => v.toLowerCase()).includes(target.toLowerCase());
}

function scoreDisclosure(params: {
  disclosureSafe: boolean;
  disclosureTolerance: string;
  compensationProtectionStatus: string | null;
}) {
  if (params.disclosureSafe) return 100;

  if (params.disclosureTolerance === "teaser_first") return 70;
  if (params.disclosureTolerance === "nda_required") return 55;
  if (params.compensationProtectionStatus === "protected") return 75;

  return 30;
}

function packageLevel(params: {
  disclosureSafe: boolean;
  disclosureTolerance: string;
  fitScore: number;
}): EpcRecommendationResult["recommendedPackageLevel"] {
  if (params.disclosureTolerance === "nda_required") return "nda_required";
  if (!params.disclosureSafe) return "teaser";
  if (params.fitScore >= 85) return "full_package";
  if (params.fitScore >= 65) return "qualified_package";
  if (params.fitScore >= 40) return "teaser";
  return "none";
}

export function evaluateEpcRecommendation(params: {
  epc: EpcProfileInput;
  deal: EpcDealInput;
}): EpcRecommendationResult {
  const { epc, deal } = params;
  const reasons: string[] = [];

  const geographyScore = includesNormalized(epc.coverageStates, deal.state)
    ? 100
    : 20;

  if (geographyScore === 100) {
    reasons.push(`${epc.epcName} covers ${deal.state ?? "the deal state"}.`);
  } else {
    reasons.push(`${epc.epcName} does not clearly cover ${deal.state ?? "the deal state"}.`);
  }

  const annualSpend =
    typeof deal.estimatedAnnualSpend === "number"
      ? deal.estimatedAnnualSpend
      : typeof deal.estimatedMonthlyBill === "number"
        ? deal.estimatedMonthlyBill * 12
        : null;

  let projectSizeScore = 40;

  if (annualSpend !== null) {
    const minOk =
      epc.minimumProjectValue === null || annualSpend >= epc.minimumProjectValue;
    const maxOk =
      epc.maximumProjectValue === null || annualSpend <= epc.maximumProjectValue;

    if (minOk && maxOk) {
      projectSizeScore = 100;
      reasons.push("Estimated project value fits EPC project-size preference.");
    } else if (minOk || maxOk) {
      projectSizeScore = 60;
      reasons.push("Estimated project value partially fits EPC preference.");
    } else {
      projectSizeScore = 25;
      reasons.push("Estimated project value is outside EPC preference.");
    }
  } else {
    reasons.push("Project value is not fully known.");
  }

  let loadProfileScore = 40;

  if (
    typeof deal.estimatedMonthlyBill === "number" &&
    typeof epc.minimumMonthlyEnergyBill === "number"
  ) {
    loadProfileScore =
      deal.estimatedMonthlyBill >= epc.minimumMonthlyEnergyBill ? 100 : 35;
  } else if (typeof deal.estimatedMonthlyBill === "number") {
    loadProfileScore = deal.estimatedMonthlyBill >= 10000 ? 85 : 55;
  }

  if (loadProfileScore >= 85) {
    reasons.push("Monthly bill/load profile is attractive for EPC review.");
  } else {
    reasons.push("Monthly bill/load profile may need stronger site/project data.");
  }

  const industryScore =
    epc.preferredIndustries.length === 0
      ? 60
      : includesNormalized(epc.preferredIndustries, deal.industry)
        ? 100
        : 45;

  if (industryScore >= 90) {
    reasons.push("Industry matches EPC preference.");
  }

  const buyerReadinessScore = clamp(deal.readinessScore ?? 35);

  const siteReadinessScore =
    deal.siteDataStatus === "verified"
      ? 100
      : deal.siteDataStatus === "partial"
        ? 60
        : 25;

  const compensationProtectionScore =
    deal.compensationProtectionStatus === "protected"
      ? 100
      : deal.compensationProtectionStatus === "review_required"
        ? 60
        : deal.compensationProtectionStatus === "drafted"
          ? 45
          : 20;

  const disclosureSafetyScore = scoreDisclosure({
    disclosureSafe: deal.disclosureSafe,
    disclosureTolerance: epc.disclosureTolerance,
    compensationProtectionStatus: deal.compensationProtectionStatus,
  });

  const executionGateScore = clamp(deal.executionGateScore ?? 35);
  const responseLikelihoodScore = clamp(epc.speedToResponseScore);
  const relationshipScore = clamp(epc.relationshipStrengthScore);

  let liabilityBoundaryScore = 40;

  if (
    epc.liabilityBoundaryRequirement === "not_required" ||
    epc.liabilityBoundaryRequirement === "recommended"
  ) {
    liabilityBoundaryScore = 70;
  }

  if (deal.hasLiabilityBoundary) {
    liabilityBoundaryScore = 100;
  }

  if (
    epc.liabilityBoundaryRequirement === "strict_required" &&
    !deal.hasLiabilityBoundary
  ) {
    liabilityBoundaryScore = 20;
    reasons.push("EPC requires strict liability boundary before release.");
  }

  if (epc.accountManagementRequired && !deal.hasAccountManagementOwner) {
    reasons.push("EPC likely requires account management support.");
  }

  const rawScore =
    geographyScore * 0.14 +
    projectSizeScore * 0.12 +
    loadProfileScore * 0.12 +
    industryScore * 0.06 +
    buyerReadinessScore * 0.1 +
    siteReadinessScore * 0.08 +
    compensationProtectionScore * 0.1 +
    disclosureSafetyScore * 0.09 +
    executionGateScore * 0.08 +
    responseLikelihoodScore * 0.05 +
    relationshipScore * 0.04 +
    liabilityBoundaryScore * 0.02;

  const fitScore = clamp(rawScore);

  let recommendationStatus: EpcRecommendationResult["recommendationStatus"] =
    "candidate";

  if (fitScore >= 85 && deal.disclosureSafe) {
    recommendationStatus = "primary";
  } else if (fitScore >= 70) {
    recommendationStatus = "recommended";
  } else if (fitScore >= 55) {
    recommendationStatus = "backup";
  } else if (fitScore >= 40) {
    recommendationStatus = "held";
  } else {
    recommendationStatus = "rejected";
  }

  const recommendedPackageLevel = packageLevel({
    disclosureSafe: deal.disclosureSafe,
    disclosureTolerance: epc.disclosureTolerance,
    fitScore,
  });

  let recommendedNextAction =
    "Hold EPC release until readiness, compensation protection, and disclosure posture improve.";

  if (recommendationStatus === "primary") {
    recommendedNextAction =
      "Select as primary EPC candidate and prepare controlled release package.";
  } else if (recommendationStatus === "recommended") {
    recommendedNextAction =
      "Add to EPC shortlist and release only the recommended package level.";
  } else if (recommendationStatus === "backup") {
    recommendedNextAction =
      "Keep as backup EPC while strengthening deal readiness and project data.";
  }

  if (!deal.disclosureSafe) {
    recommendedNextAction =
      "Use teaser only. Do not release full EPC package until compensation/disclosure protection improves.";
  }

  const fitReason = reasons.join(" ");

  return {
    fitScore,
    recommendationStatus,
    geographyScore,
    projectSizeScore,
    loadProfileScore,
    industryScore,
    buyerReadinessScore,
    siteReadinessScore,
    compensationProtectionScore,
    disclosureSafetyScore,
    executionGateScore,
    responseLikelihoodScore,
    relationshipScore,
    liabilityBoundaryScore,
    fitReason,
    recommendedPackageLevel,
    recommendedNextAction,
  };
}