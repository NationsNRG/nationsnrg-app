// lib/deal-engine/deal-auto-progression.ts

export type DealStage =
  | "intake"
  | "qualified"
  | "package_ready"
  | "supplier_routing"
  | "supplier_engaged"
  | "big_deal_review"
  | "rollup_hold"
  | "execution_ready"
  | "blocked";

export interface AutoProgressionInput {
  currentStatus: string | null;
  hasDemandEstimate: boolean;
  hasPackage: boolean;
  hasSupplierSequence: boolean;
  hasShareEvent: boolean;
  hasActiveBlockers: boolean;
  bigDealStatus: string | null;
  rollupStatus: string | null;
  latestSupplierResponseType: string | null;
}

export interface AutoProgressionDecision {
  nextStatus: DealStage;
  shouldUpdate: boolean;
  reason: string;
}

export function evaluateDealAutoProgression(
  input: AutoProgressionInput,
): AutoProgressionDecision {
  if (input.hasActiveBlockers) {
    return {
      nextStatus: "blocked",
      shouldUpdate: input.currentStatus !== "blocked",
      reason: "Deal has active blockers.",
    };
  }

  if (input.bigDealStatus === "queued" || input.bigDealStatus === "under_review") {
    return {
      nextStatus: "big_deal_review",
      shouldUpdate: input.currentStatus !== "big_deal_review",
      reason: "Deal is in big deal desk review.",
    };
  }

  if (input.rollupStatus === "held") {
    return {
      nextStatus: "rollup_hold",
      shouldUpdate: input.currentStatus !== "rollup_hold",
      reason: "Deal is held for portfolio rollup.",
    };
  }

  if (
    input.latestSupplierResponseType === "interest" ||
    input.latestSupplierResponseType === "counter" ||
    input.latestSupplierResponseType === "term_revision"
  ) {
    return {
      nextStatus: "supplier_engaged",
      shouldUpdate: input.currentStatus !== "supplier_engaged",
      reason: "Supplier has signaled constructive engagement.",
    };
  }

  if (input.hasShareEvent && input.hasSupplierSequence) {
    return {
      nextStatus: "supplier_routing",
      shouldUpdate: input.currentStatus !== "supplier_routing",
      reason: "Package has been shared with supplier routing active.",
    };
  }

  if (input.hasPackage && input.hasDemandEstimate) {
    return {
      nextStatus: "package_ready",
      shouldUpdate: input.currentStatus !== "package_ready",
      reason: "Demand estimate and package are ready.",
    };
  }

  if (input.hasDemandEstimate) {
    return {
      nextStatus: "qualified",
      shouldUpdate: input.currentStatus !== "qualified",
      reason: "Demand estimate exists and deal is qualified for next step.",
    };
  }

  return {
    nextStatus: "intake",
    shouldUpdate: input.currentStatus !== "intake",
    reason: "Deal remains in intake.",
  };
}