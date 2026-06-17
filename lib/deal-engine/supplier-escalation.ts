// lib/deal-engine/supplier-escalation.ts

export interface EscalationSignal {
  type:
    | "low_confidence"
    | "slow_response"
    | "decline_cluster"
    | "no_activity"
    | "strong_interest";
  severity: "low" | "medium" | "high";
  message: string;
  recommendedAction: string;
}

export interface EscalationInput {
  averageConfidence: number | null;
  averageResponseSpeedHours: number | null;
  totals: {
    totalResponses: number;
    interestCount: number;
    declineCount: number;
    nonStarterCount: number;
  };
  latestResponseType: string | null;
}

export function evaluateSupplierEscalation(
  input: EscalationInput,
): EscalationSignal[] {
  const signals: EscalationSignal[] = [];

  if (input.averageConfidence !== null && input.averageConfidence < 50) {
    signals.push({
      type: "low_confidence",
      severity: "high",
      message: "Supplier confidence across responses is low.",
      recommendedAction:
        "Repackage deal or improve data quality before continuing outreach.",
    });
  }

  if (
    input.averageResponseSpeedHours !== null &&
    input.averageResponseSpeedHours > 48
  ) {
    signals.push({
      type: "slow_response",
      severity: "medium",
      message: "Suppliers are responding slowly.",
      recommendedAction:
        "Tighten targeting or prioritize more responsive suppliers.",
    });
  }

  if (
    input.totals.declineCount + input.totals.nonStarterCount >= 3 &&
    input.totals.totalResponses >= 3
  ) {
    signals.push({
      type: "decline_cluster",
      severity: "high",
      message: "Multiple suppliers are declining or marking non-starter.",
      recommendedAction:
        "Escalate to fallback structure or adjust pricing assumptions.",
    });
  }

  if (input.totals.totalResponses === 0) {
    signals.push({
      type: "no_activity",
      severity: "medium",
      message: "No supplier responses yet.",
      recommendedAction:
        "Trigger follow-ups or expand supplier outreach pool.",
    });
  }

  if (input.latestResponseType === "interest") {
    signals.push({
      type: "strong_interest",
      severity: "low",
      message: "Recent supplier signaled interest.",
      recommendedAction:
        "Advance to pricing or move into deeper engagement.",
    });
  }

  return signals;
}