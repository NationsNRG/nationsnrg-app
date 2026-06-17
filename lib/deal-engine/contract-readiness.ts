// lib/deal-engine/contract-readiness.ts

export type ReadinessStatus =
  | "not_ready"
  | "in_progress"
  | "ready_for_supplier"
  | "ready_for_execution"
  | "blocked";

export type ExecutionLane =
  | "standard_supply"
  | "premium_escalation"
  | "infrastructure_triage"
  | "portfolio_rollup"
  | "big_deal_desk";

export interface ContractReadinessInput {
  dealId: string;
  executionLane: ExecutionLane;
  buyerIdentityStatus: "unknown" | "identified" | "verified";
  authorityStatus:
    | "unknown"
    | "contact_only"
    | "decision_maker"
    | "authorized_signer";
  usageDataStatus: "missing" | "partial" | "estimated" | "verified";
  siteDataStatus: "missing" | "partial" | "verified";
  supplierPackageStatus: "not_ready" | "teaser_ready" | "full_ready" | "shared";
  compensationProtectionStatus:
    | "unprotected"
    | "drafted"
    | "review_required"
    | "protected";
  legalReviewStatus:
    | "not_started"
    | "not_required"
    | "review_required"
    | "cleared";
  blockerCount: number;
}

export interface ContractReadinessResult {
  readinessStatus: ReadinessStatus;
  readinessScore: number;
  readinessReason: string;
  nextRequiredAction: string | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function evaluateContractReadiness(
  input: ContractReadinessInput,
): ContractReadinessResult {
  let score = 0;
  const reasons: string[] = [];

  if (input.buyerIdentityStatus === "verified") {
    score += 15;
    reasons.push("Buyer identity verified.");
  } else if (input.buyerIdentityStatus === "identified") {
    score += 8;
    reasons.push("Buyer identified but not verified.");
  } else {
    reasons.push("Buyer identity is unknown.");
  }

  if (input.authorityStatus === "authorized_signer") {
    score += 20;
    reasons.push("Authorized signer confirmed.");
  } else if (input.authorityStatus === "decision_maker") {
    score += 14;
    reasons.push("Decision maker identified.");
  } else if (input.authorityStatus === "contact_only") {
    score += 6;
    reasons.push("Only contact-level authority confirmed.");
  } else {
    reasons.push("Authority status is unknown.");
  }

  if (input.usageDataStatus === "verified") {
    score += 20;
    reasons.push("Usage data verified.");
  } else if (input.usageDataStatus === "estimated") {
    score += 10;
    reasons.push("Usage data is estimated.");
  } else if (input.usageDataStatus === "partial") {
    score += 8;
    reasons.push("Usage data is partial.");
  } else {
    reasons.push("Usage data is missing.");
  }

  if (input.siteDataStatus === "verified") {
    score += 10;
    reasons.push("Site data verified.");
  } else if (input.siteDataStatus === "partial") {
    score += 5;
    reasons.push("Site data is partial.");
  } else {
    reasons.push("Site data is missing.");
  }

  if (input.supplierPackageStatus === "shared") {
    score += 15;
    reasons.push("Supplier package has been shared.");
  } else if (input.supplierPackageStatus === "full_ready") {
    score += 12;
    reasons.push("Full supplier package is ready.");
  } else if (input.supplierPackageStatus === "teaser_ready") {
    score += 7;
    reasons.push("Teaser package is ready.");
  } else {
    reasons.push("Supplier package is not ready.");
  }

  if (input.compensationProtectionStatus === "protected") {
    score += 15;
    reasons.push("Compensation protection is in place.");
  } else if (input.compensationProtectionStatus === "review_required") {
    score += 6;
    reasons.push("Compensation protection requires review.");
  } else if (input.compensationProtectionStatus === "drafted") {
    score += 8;
    reasons.push("Compensation terms are drafted.");
  } else {
    reasons.push("Compensation protection is missing.");
  }

  if (input.legalReviewStatus === "cleared") {
    score += 5;
    reasons.push("Legal review cleared.");
  } else if (input.legalReviewStatus === "not_required") {
    score += 5;
    reasons.push("Legal review not required.");
  } else if (input.legalReviewStatus === "review_required") {
    score -= 5;
    reasons.push("Legal review is required.");
  }

  if (input.blockerCount > 0) {
    score -= input.blockerCount * 10;
    reasons.push(`${input.blockerCount} active contract blocker(s).`);
  }

  score = clamp(score, 0, 100);

  let readinessStatus: ReadinessStatus = "not_ready";
  let nextRequiredAction: string | null = "Verify buyer identity and usage data.";

  if (input.blockerCount > 0) {
    readinessStatus = "blocked";
    nextRequiredAction = "Resolve active contract blockers.";
  } else if (score >= 85) {
    readinessStatus = "ready_for_execution";
    nextRequiredAction = null;
  } else if (score >= 65) {
    readinessStatus = "ready_for_supplier";
    nextRequiredAction = "Confirm compensation protection and final package quality.";
  } else if (score >= 35) {
    readinessStatus = "in_progress";
    nextRequiredAction = "Complete missing buyer, usage, package, or compensation inputs.";
  }

  return {
    readinessStatus,
    readinessScore: score,
    readinessReason: reasons.join(" "),
    nextRequiredAction,
  };
}