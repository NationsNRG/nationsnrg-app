// lib/deal-engine/compensation-protection.ts

export type CompensationProtectionStatus =
  | "unprotected"
  | "drafted"
  | "review_required"
  | "protected";

export interface CompensationProtectionInput {
  dealId: string;
  hasCompensationTerms: boolean;
  hasProtectedTerm: boolean;
  hasSignedAcknowledgment: boolean;
  hasClaimRecord: boolean;
  hasRetainedRights: boolean;
  disclosureAllowed: boolean;
  readinessScore: number | null;
  executionLane: string | null;
}

export interface CompensationProtectionResult {
  compensationProtectionStatus: CompensationProtectionStatus;
  protectionScore: number;
  protectionReason: string;
  disclosureSafe: boolean;
  nextRequiredAction: string | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function evaluateCompensationProtection(
  input: CompensationProtectionInput,
): CompensationProtectionResult {
  let score = 0;
  const reasons: string[] = [];

  if (input.hasCompensationTerms) {
    score += 25;
    reasons.push("Compensation terms exist.");
  } else {
    reasons.push("No compensation terms exist.");
  }

  if (input.hasProtectedTerm) {
    score += 25;
    reasons.push("At least one compensation term is protected.");
  } else {
    reasons.push("No protected compensation term exists.");
  }

  if (input.hasSignedAcknowledgment) {
    score += 20;
    reasons.push("Signed acknowledgment received.");
  } else {
    reasons.push("Signed acknowledgment has not been received.");
  }

  if (input.hasClaimRecord) {
    score += 10;
    reasons.push("Claim record exists.");
  } else {
    reasons.push("No claim record exists yet.");
  }

  if (input.hasRetainedRights) {
    score += 10;
    reasons.push("Retained rights have been reserved.");
  } else {
    reasons.push("No retained rights are reserved.");
  }

  if (input.disclosureAllowed) {
    score += 10;
    reasons.push("Disclosure is allowed under current compensation posture.");
  } else {
    reasons.push("Disclosure is not yet compensation-safe.");
  }

  if (
    input.executionLane === "big_deal_desk" ||
    input.executionLane === "infrastructure_triage"
  ) {
    if (!input.hasProtectedTerm || !input.hasRetainedRights) {
      score -= 15;
      reasons.push("High-value lane requires stronger compensation protection.");
    }
  }

  score = clamp(score, 0, 100);

  let compensationProtectionStatus: CompensationProtectionStatus = "unprotected";
  let nextRequiredAction: string | null =
    "Create compensation terms before deeper disclosure.";

  if (score >= 85 && input.hasProtectedTerm && input.hasSignedAcknowledgment) {
    compensationProtectionStatus = "protected";
    nextRequiredAction = null;
  } else if (score >= 55) {
    compensationProtectionStatus = "review_required";
    nextRequiredAction =
      "Review compensation terms and confirm acknowledgment/protection.";
  } else if (score >= 25) {
    compensationProtectionStatus = "drafted";
    nextRequiredAction =
      "Finalize compensation protection and obtain acknowledgment.";
  }

  const disclosureSafe =
    compensationProtectionStatus === "protected" ||
    (input.disclosureAllowed && score >= 70);

  return {
    compensationProtectionStatus,
    protectionScore: score,
    protectionReason: reasons.join(" "),
    disclosureSafe,
    nextRequiredAction,
  };
}