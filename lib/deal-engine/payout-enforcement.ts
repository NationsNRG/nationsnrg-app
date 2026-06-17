// lib/deal-engine/payout-enforcement.ts

export interface PayoutEnforcementInput {
  claimType: "commission" | "referral" | "success";
  claimId: string;
  claimStatus: string;
  expectedAmount: number | null;
  payoutDueAt: string | null;
  paidAt: string | null;
  counterpartyIdentifier: string | null;
}

export interface PayoutEnforcementDecision {
  shouldEscalate: boolean;
  enforcementSeverity: number;
  enforcementReason: string;
  recommendedAction: string;
}

export function evaluatePayoutEnforcement(
  input: PayoutEnforcementInput,
): PayoutEnforcementDecision {
  if (input.claimStatus === "paid") {
    return {
      shouldEscalate: false,
      enforcementSeverity: 1,
      enforcementReason: "Claim is already marked paid.",
      recommendedAction: "No action required.",
    };
  }

  if (input.claimStatus === "disputed") {
    return {
      shouldEscalate: true,
      enforcementSeverity: 5,
      enforcementReason: "Claim is disputed and requires escalation.",
      recommendedAction:
        "Escalate to operator review with invoice, agreement, and communication history.",
    };
  }

  if (input.claimStatus === "rejected") {
    return {
      shouldEscalate: true,
      enforcementSeverity: 5,
      enforcementReason: "Claim was rejected and may require dispute review.",
      recommendedAction:
        "Review rejection reason, supporting compensation terms, and retained rights.",
    };
  }

  if (!input.payoutDueAt) {
    return {
      shouldEscalate: input.claimStatus === "approved",
      enforcementSeverity: input.claimStatus === "approved" ? 3 : 1,
      enforcementReason:
        input.claimStatus === "approved"
          ? "Approved claim has no payout due date."
          : "Claim has no payout due date yet.",
      recommendedAction:
        input.claimStatus === "approved"
          ? "Assign payout due date and invoice reference."
          : "No enforcement needed until claim becomes approved or due.",
    };
  }

  const due = new Date(input.payoutDueAt).getTime();
  const now = Date.now();

  if (Number.isNaN(due)) {
    return {
      shouldEscalate: true,
      enforcementSeverity: 3,
      enforcementReason: "Payout due date is invalid.",
      recommendedAction: "Correct payout due date.",
    };
  }

  const overdueDays = Math.floor((now - due) / (1000 * 60 * 60 * 24));

  if (overdueDays <= 0) {
    return {
      shouldEscalate: false,
      enforcementSeverity: 1,
      enforcementReason: "Payout is not overdue.",
      recommendedAction: "Monitor until due date.",
    };
  }

  if (overdueDays >= 30) {
    return {
      shouldEscalate: true,
      enforcementSeverity: 5,
      enforcementReason: `Payout is ${overdueDays} days overdue.`,
      recommendedAction:
        "Escalate for formal collection review and preserve all claim evidence.",
    };
  }

  if (overdueDays >= 14) {
    return {
      shouldEscalate: true,
      enforcementSeverity: 4,
      enforcementReason: `Payout is ${overdueDays} days overdue.`,
      recommendedAction:
        "Send second notice and escalate to senior operator review.",
    };
  }

  return {
    shouldEscalate: true,
    enforcementSeverity: 3,
    enforcementReason: `Payout is ${overdueDays} days overdue.`,
    recommendedAction:
      "Send first payout follow-up notice with claim and invoice reference.",
  };
}