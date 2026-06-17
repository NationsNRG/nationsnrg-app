// lib/deal-engine/autonomous-supplier-routing.ts

export interface SupplierRoutingSequence {
  sequenceId: string;
  supplierEntityId: string;
  supplierName: string;
  sequenceType: string;
  sequencePosition: number;
  isPrimary: boolean;
  holdReason: string | null;
  latestResponseType: string | null;
  latestResponseStatus: string | null;
  latestConfidenceSignal: number | null;
  fitScore: number | null;
}

export interface SupplierRoutingAnalytics {
  averageConfidence: number | null;
  averageResponseSpeedHours: number | null;
  totals: {
    totalResponses: number;
    interestCount: number;
    declineCount: number;
    nonStarterCount: number;
    rfiCount: number;
  };
}

export interface RoutingAdjustmentDecision {
  action:
    | "keep_primary"
    | "promote_next_best"
    | "demote_current_primary"
    | "hold_current_path"
    | "expand_supplier_pool"
    | "pause_for_repackaging";
  reason: string;
  targetSequenceId: string | null;
  targetSupplierEntityId: string | null;
  priority: "low" | "medium" | "high";
}

function getPrimarySequence(
  sequences: SupplierRoutingSequence[],
): SupplierRoutingSequence | null {
  return sequences.find((sequence) => sequence.isPrimary) ?? null;
}

function getBestFallbackSequence(
  sequences: SupplierRoutingSequence[],
): SupplierRoutingSequence | null {
  return (
    sequences
      .filter((sequence) => !sequence.isPrimary)
      .sort((a, b) => {
        const fitA = a.fitScore ?? 0;
        const fitB = b.fitScore ?? 0;

        if (fitB !== fitA) {
          return fitB - fitA;
        }

        return a.sequencePosition - b.sequencePosition;
      })[0] ?? null
  );
}

function isNegativeResponse(
  responseType: string | null,
  responseStatus: string | null,
): boolean {
  return (
    responseType === "decline" ||
    responseType === "non_starter" ||
    responseStatus === "rejected"
  );
}

function isStalledInfoRequest(
  responseType: string | null,
  responseStatus: string | null,
): boolean {
  return (
    responseType === "request_for_info" &&
    (responseStatus === "received" || responseStatus === "pending_followup")
  );
}

function isConstructivePath(
  responseType: string | null,
  responseStatus: string | null,
): boolean {
  return (
    responseType === "interest" ||
    responseType === "counter" ||
    responseType === "term_revision" ||
    responseStatus === "accepted"
  );
}

export function evaluateAutonomousSupplierRouting(params: {
  sequences: SupplierRoutingSequence[];
  analytics: SupplierRoutingAnalytics;
}): RoutingAdjustmentDecision[] {
  const decisions: RoutingAdjustmentDecision[] = [];
  const primary = getPrimarySequence(params.sequences);
  const bestFallback = getBestFallbackSequence(params.sequences);

  if (!primary && bestFallback) {
    decisions.push({
      action: "promote_next_best",
      reason: "No primary supplier is currently assigned. Promote the strongest fallback path.",
      targetSequenceId: bestFallback.sequenceId,
      targetSupplierEntityId: bestFallback.supplierEntityId,
      priority: "high",
    });

    return decisions;
  }

  if (!primary) {
    decisions.push({
      action: "expand_supplier_pool",
      reason: "No supplier sequences are viable. Expand the supplier pool.",
      targetSequenceId: null,
      targetSupplierEntityId: null,
      priority: "high",
    });

    return decisions;
  }

  if (
    isNegativeResponse(primary.latestResponseType, primary.latestResponseStatus) &&
    bestFallback
  ) {
    decisions.push({
      action: "demote_current_primary",
      reason: "Current primary supplier is on a negative response path.",
      targetSequenceId: primary.sequenceId,
      targetSupplierEntityId: primary.supplierEntityId,
      priority: "high",
    });

    decisions.push({
      action: "promote_next_best",
      reason: "Best fallback supplier should be promoted after current primary failure.",
      targetSequenceId: bestFallback.sequenceId,
      targetSupplierEntityId: bestFallback.supplierEntityId,
      priority: "high",
    });

    return decisions;
  }

  if (isStalledInfoRequest(primary.latestResponseType, primary.latestResponseStatus)) {
    decisions.push({
      action: "hold_current_path",
      reason: "Primary supplier is waiting on more information. Hold path until package is improved.",
      targetSequenceId: primary.sequenceId,
      targetSupplierEntityId: primary.supplierEntityId,
      priority: "medium",
    });
  }

  if (
    params.analytics.averageConfidence !== null &&
    params.analytics.averageConfidence < 50
  ) {
    decisions.push({
      action: "pause_for_repackaging",
      reason: "Supplier confidence is low across the current response set. Repackage before deeper routing.",
      targetSequenceId: primary.sequenceId,
      targetSupplierEntityId: primary.supplierEntityId,
      priority: "high",
    });
  }

  if (
    params.analytics.totals.declineCount + params.analytics.totals.nonStarterCount >=
    3
  ) {
    decisions.push({
      action: "expand_supplier_pool",
      reason: "Too many declines/non-starters. Current supplier set may be too narrow.",
      targetSequenceId: null,
      targetSupplierEntityId: null,
      priority: "high",
    });
  }

  if (
    isConstructivePath(primary.latestResponseType, primary.latestResponseStatus) &&
    !primary.holdReason
  ) {
    decisions.push({
      action: "keep_primary",
      reason: "Current primary supplier is still on a constructive path.",
      targetSequenceId: primary.sequenceId,
      targetSupplierEntityId: primary.supplierEntityId,
      priority: "low",
    });
  }

  if (decisions.length === 0) {
    decisions.push({
      action: "keep_primary",
      reason: "No routing change is required at this time.",
      targetSequenceId: primary.sequenceId,
      targetSupplierEntityId: primary.supplierEntityId,
      priority: "low",
    });
  }

  return decisions;
}