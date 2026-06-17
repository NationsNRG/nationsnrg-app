// lib/deal-engine/execution-checklist.ts

export type ExecutionGateStatus = "blocked" | "conditional" | "passed" | "waived";

export interface ExecutionChecklistInput {
  dealId: string;
  executionLane: string;
  readinessScore: number | null;
  compensationStatus: string | null;
  supplierPackageStatus: string | null;
  blockerCount: number;
  hasVerifiedUtilityBill: boolean;
  hasVerifiedUsageHistory: boolean;
  hasLoa: boolean;
  hasAuthorizedSigner: boolean;
  hasProtectedCompensation: boolean;
  hasSupplierSequence: boolean;
  hasSharedPackage: boolean;
  hasOpenPayoutEnforcement: boolean;
}

export interface ExecutionChecklistItemSeed {
  itemKey: string;
  itemTitle: string;
  itemDescription: string;
  itemCategory:
    | "buyer"
    | "authority"
    | "usage"
    | "site"
    | "package"
    | "supplier"
    | "epc"
    | "compensation"
    | "legal"
    | "payout"
    | "operations"
    | "risk";
  severity: number;
  requiredBeforeStage:
    | "supplier_release"
    | "epc_release"
    | "pricing"
    | "contracting"
    | "execution"
    | "payout"
    | "closeout";
  ownerType:
    | "operator"
    | "sales_team"
    | "account_manager"
    | "supplier"
    | "epc"
    | "buyer"
    | "legal"
    | "finance"
    | "system";
  itemStatus: "open" | "in_progress" | "completed" | "blocked" | "waived";
}

export interface ExecutionChecklistResult {
  checklistStatus: "open" | "in_progress" | "ready" | "blocked" | "completed" | "waived";
  checklistSummary: string;
  nextRequiredAction: string | null;
  gateStatus: ExecutionGateStatus;
  gateScore: number;
  gateReason: string;
  recommendedAction: string | null;
  items: ExecutionChecklistItemSeed[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function completedWhen(condition: boolean): "completed" | "open" {
  return condition ? "completed" : "open";
}

export function evaluateExecutionChecklist(
  input: ExecutionChecklistInput,
): ExecutionChecklistResult {
  const items: ExecutionChecklistItemSeed[] = [
    {
      itemKey: "buyer_identity_confirmed",
      itemTitle: "Buyer identity confirmed",
      itemDescription: "Confirm the business entity, service location, and buyer identity.",
      itemCategory: "buyer",
      severity: 4,
      requiredBeforeStage: "supplier_release",
      ownerType: "operator",
      itemStatus: input.readinessScore !== null && input.readinessScore >= 35 ? "completed" : "open",
    },
    {
      itemKey: "authorized_signer_confirmed",
      itemTitle: "Authorized signer confirmed",
      itemDescription: "Confirm the decision maker or authorized signer before contracting.",
      itemCategory: "authority",
      severity: 5,
      requiredBeforeStage: "contracting",
      ownerType: "operator",
      itemStatus: completedWhen(input.hasAuthorizedSigner),
    },
    {
      itemKey: "utility_bill_verified",
      itemTitle: "Utility bill verified",
      itemDescription: "Verify a recent utility bill before supplier release or pricing.",
      itemCategory: "usage",
      severity: 4,
      requiredBeforeStage: "pricing",
      ownerType: "operator",
      itemStatus: completedWhen(input.hasVerifiedUtilityBill),
    },
    {
      itemKey: "usage_history_verified",
      itemTitle: "Usage history verified",
      itemDescription: "Verify 12-month usage history or equivalent before final pricing.",
      itemCategory: "usage",
      severity: 4,
      requiredBeforeStage: "pricing",
      ownerType: "operator",
      itemStatus: completedWhen(input.hasVerifiedUsageHistory),
    },
    {
      itemKey: "loa_collected",
      itemTitle: "LOA collected",
      itemDescription: "Collect Letter of Authorization when required for supplier access.",
      itemCategory: "authority",
      severity: 4,
      requiredBeforeStage: "supplier_release",
      ownerType: "operator",
      itemStatus: completedWhen(input.hasLoa),
    },
    {
      itemKey: "supplier_package_ready",
      itemTitle: "Supplier package ready",
      itemDescription: "Confirm teaser/full package is ready before external release.",
      itemCategory: "package",
      severity: 4,
      requiredBeforeStage: "supplier_release",
      ownerType: "system",
      itemStatus:
        input.supplierPackageStatus === "full_ready" ||
        input.supplierPackageStatus === "shared"
          ? "completed"
          : "open",
    },
    {
      itemKey: "supplier_sequence_ready",
      itemTitle: "Supplier sequence ready",
      itemDescription: "Confirm supplier routing sequence exists before supplier release.",
      itemCategory: "supplier",
      severity: 3,
      requiredBeforeStage: "supplier_release",
      ownerType: "system",
      itemStatus: completedWhen(input.hasSupplierSequence),
    },
    {
      itemKey: "compensation_protected",
      itemTitle: "Compensation protected",
      itemDescription:
        "Confirm compensation terms, acknowledgment, disclosure safety, and retained rights.",
      itemCategory: "compensation",
      severity: 5,
      requiredBeforeStage: "supplier_release",
      ownerType: "operator",
      itemStatus: completedWhen(input.hasProtectedCompensation),
    },
    {
      itemKey: "package_shared_or_ready",
      itemTitle: "Package shared or ready",
      itemDescription: "Confirm safe-share or package readiness before execution progression.",
      itemCategory: "package",
      severity: 3,
      requiredBeforeStage: "execution",
      ownerType: "system",
      itemStatus: completedWhen(input.hasSharedPackage),
    },
    {
      itemKey: "payout_enforcement_clear",
      itemTitle: "No open payout enforcement blockers",
      itemDescription: "Resolve payout enforcement issues before closeout or payout completion.",
      itemCategory: "payout",
      severity: 4,
      requiredBeforeStage: "payout",
      ownerType: "finance",
      itemStatus: input.hasOpenPayoutEnforcement ? "blocked" : "completed",
    },
  ];

  if (input.executionLane === "infrastructure_triage" || input.executionLane === "epc") {
    items.push({
      itemKey: "epc_release_review",
      itemTitle: "EPC release review complete",
      itemDescription:
        "Confirm EPC interest posture, project viability, and disclosure boundary before EPC release.",
      itemCategory: "epc",
      severity: 5,
      requiredBeforeStage: "epc_release",
      ownerType: "operator",
      itemStatus: input.hasProtectedCompensation && input.readinessScore !== null && input.readinessScore >= 65
        ? "completed"
        : "open",
    });
  }

  const completedCount = items.filter((item) => item.itemStatus === "completed").length;
  const blockedCount = items.filter((item) => item.itemStatus === "blocked").length;
  const openCriticalCount = items.filter(
    (item) => item.itemStatus !== "completed" && item.severity >= 5,
  ).length;

  let gateScore = Math.round((completedCount / items.length) * 100);

  if (input.readinessScore !== null) {
    gateScore = Math.round((gateScore + input.readinessScore) / 2);
  }

  if (input.blockerCount > 0) {
    gateScore -= input.blockerCount * 10;
  }

  if (blockedCount > 0) {
    gateScore -= blockedCount * 15;
  }

  if (!input.hasProtectedCompensation) {
    gateScore -= 15;
  }

  gateScore = clamp(gateScore, 0, 100);

  let gateStatus: ExecutionGateStatus = "blocked";
  let checklistStatus: ExecutionChecklistResult["checklistStatus"] = "blocked";
  let nextRequiredAction: string | null = "Resolve critical checklist blockers.";
  let recommendedAction: string | null =
    "Complete missing authority, usage, package, and compensation protection items.";

  if (gateScore >= 85 && openCriticalCount === 0 && blockedCount === 0) {
    gateStatus = "passed";
    checklistStatus = "ready";
    nextRequiredAction = null;
    recommendedAction = "Deal is execution-ready under current checklist posture.";
  } else if (gateScore >= 65 && blockedCount === 0) {
    gateStatus = "conditional";
    checklistStatus = "in_progress";
    nextRequiredAction = "Complete remaining non-critical checklist items.";
    recommendedAction = "Proceed only with controlled disclosure and operator review.";
  } else if (input.blockerCount === 0 && completedCount > 0) {
    gateStatus = "conditional";
    checklistStatus = "in_progress";
    nextRequiredAction = "Continue completing checklist requirements.";
  }

  const checklistSummary = [
    `${completedCount}/${items.length} checklist items completed.`,
    `${blockedCount} blocked item(s).`,
    `${openCriticalCount} open critical item(s).`,
    `Execution gate score: ${gateScore}.`,
  ].join(" ");

  const gateReason = checklistSummary;

  return {
    checklistStatus,
    checklistSummary,
    nextRequiredAction,
    gateStatus,
    gateScore,
    gateReason,
    recommendedAction,
    items,
  };
}