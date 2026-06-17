// lib/deal-engine/operator-brief.ts

export interface OperatorBriefInput {
  dealId: string;
  businessName: string | null;
  state: string | null;
  estimatedMonthlyBill: number | null;
  dealStatus: string | null;

  readinessStatus: string | null;
  readinessScore: number | null;
  executionLane: string | null;
  nextReadinessAction: string | null;

  compensationStatus: string | null;
  compensationScore: number | null;
  disclosureSafe: boolean;
  expectedCompensationTotal: number;
  retainedRightsCount: number;
  openPayoutEnforcementCount: number;

  checklistStatus: string | null;
  latestGateStatus: string | null;
  latestGateScore: number | null;
  latestGateAction: string | null;

  supplierSequenceCount: number;
  latestSupplierResponseType: string | null;

  openContractGapCount: number;
  openCriticalChecklistCount: number;
  bigDealStatus: string | null;
  rollupStatus: string | null;
}

export interface OperatorBriefResult {
  briefTitle: string;
  executiveSummary: string;
  currentPosture: string;
  moneyPathSummary: string;
  riskSummary: string;
  nextBestAction: string;
  operatorWorkloadLevel: "low" | "medium" | "high" | "delegate_now";
  delegationRecommendation: string;
  disclosureRecommendation: string;
  compensationRecommendation: string;
  epcRecommendation: string;
}

function money(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

export function generateOperatorBrief(
  input: OperatorBriefInput,
): OperatorBriefResult {
  const businessName = input.businessName ?? "Unnamed Deal";
  const bill =
    typeof input.estimatedMonthlyBill === "number"
      ? `$${input.estimatedMonthlyBill.toLocaleString()}/mo`
      : "unknown monthly bill";

  const briefTitle = `${businessName} — Operator Brief`;

  const postureParts = [
    `Deal status: ${input.dealStatus ?? "unknown"}.`,
    `Readiness: ${input.readinessStatus ?? "not evaluated"} (${input.readinessScore ?? "—"}/100).`,
    `Execution lane: ${input.executionLane ?? "standard_supply"}.`,
    `Gate: ${input.latestGateStatus ?? "not evaluated"} (${input.latestGateScore ?? "—"}/100).`,
  ];

  if (input.bigDealStatus) {
    postureParts.push(`Big Deal Desk: ${input.bigDealStatus}.`);
  }

  if (input.rollupStatus) {
    postureParts.push(`Portfolio Rollup: ${input.rollupStatus}.`);
  }

  const currentPosture = postureParts.join(" ");

  const executiveSummary =
    `${businessName} is a ${input.state ?? "unknown-state"} opportunity with ${bill}. ` +
    `The system currently sees this as ${input.executionLane ?? "standard_supply"} with readiness score ${input.readinessScore ?? "—"} and execution gate ${input.latestGateStatus ?? "not evaluated"}.`;

  const moneyPathSummary =
    `Expected tracked compensation is ${money(input.expectedCompensationTotal)} across protected/drafted terms. ` +
    `Retained rights reserved: ${input.retainedRightsCount}. ` +
    `Open payout enforcement events: ${input.openPayoutEnforcementCount}.`;

  const riskItems: string[] = [];

  if (input.openContractGapCount > 0) {
    riskItems.push(`${input.openContractGapCount} open contract gap(s).`);
  }

  if (input.openCriticalChecklistCount > 0) {
    riskItems.push(`${input.openCriticalChecklistCount} open critical checklist item(s).`);
  }

  if (!input.disclosureSafe) {
    riskItems.push("Disclosure is not compensation-safe yet.");
  }

  if (input.openPayoutEnforcementCount > 0) {
    riskItems.push("Open payout enforcement exists.");
  }

  if (riskItems.length === 0) {
    riskItems.push("No major system risk flags detected.");
  }

  const riskSummary = riskItems.join(" ");

  let nextBestAction =
    input.latestGateAction ??
    input.nextReadinessAction ??
    "Refresh readiness, compensation protection, and execution gate.";

  if (!input.disclosureSafe) {
    nextBestAction =
      "Do not expand disclosure yet. Protect compensation terms, acknowledgment, and retained rights first.";
  }

  if (input.openCriticalChecklistCount > 0) {
    nextBestAction =
      "Resolve critical checklist items before supplier/EPC release or execution movement.";
  }

  if (input.openContractGapCount > 0) {
    nextBestAction =
      "Resolve open contract gaps and verify required documents before further release.";
  }

  let operatorWorkloadLevel: OperatorBriefResult["operatorWorkloadLevel"] =
    "medium";

  if (
    input.openContractGapCount >= 3 ||
    input.openCriticalChecklistCount >= 2 ||
    !input.disclosureSafe
  ) {
    operatorWorkloadLevel = "high";
  }

  if (
    input.supplierSequenceCount > 0 &&
    input.readinessScore !== null &&
    input.readinessScore >= 65 &&
    input.disclosureSafe &&
    input.openCriticalChecklistCount === 0
  ) {
    operatorWorkloadLevel = "low";
  }

  if (
    input.openContractGapCount >= 5 ||
    input.openCriticalChecklistCount >= 3 ||
    input.openPayoutEnforcementCount > 0
  ) {
    operatorWorkloadLevel = "delegate_now";
  }

  const delegationRecommendation =
    operatorWorkloadLevel === "delegate_now"
      ? "Delegate immediately to a sales/team/accountability owner and assign checklist owners before continuing."
      : operatorWorkloadLevel === "high"
        ? "Keep founder/operator oversight, but assign document, compensation, and checklist tasks to accountable roles."
        : "This deal can be managed with limited founder involvement if owners and gates stay current.";

  const disclosureRecommendation = input.disclosureSafe
    ? "Disclosure may proceed only through the approved package and visibility rules."
    : "Disclosure should remain blocked or limited to teaser-level only until compensation protection is stronger.";

  const compensationRecommendation =
    input.compensationStatus === "protected"
      ? "Compensation posture is protected. Continue preserving retained rights and payout evidence."
      : "Create or strengthen compensation terms, signed acknowledgment, retained rights, and claim records before deeper release.";

  const epcRecommendation =
    input.executionLane === "infrastructure_triage" ||
    input.executionLane === "big_deal_desk"
      ? "Evaluate EPC fit next. Do not send full EPC package until EPC recommendation, compensation protection, and disclosure gates align."
      : "EPC routing is optional unless infrastructure or project-development potential becomes stronger.";

  return {
    briefTitle,
    executiveSummary,
    currentPosture,
    moneyPathSummary,
    riskSummary,
    nextBestAction,
    operatorWorkloadLevel,
    delegationRecommendation,
    disclosureRecommendation,
    compensationRecommendation,
    epcRecommendation,
  };
}