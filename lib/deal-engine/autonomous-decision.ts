// lib/deal-engine/autonomous-decision.ts

export type AutonomousDecisionAction =
  | "refresh_readiness"
  | "refresh_compensation"
  | "run_execution_gate"
  | "run_epc_scoring"
  | "run_auto_progression"
  | "run_payout_enforcement"
  | "generate_operator_brief"
  | "hold_deal"
  | "no_action";

export interface AutonomousDecisionInput {
  dealId: string;
  dealStatus: string | null;
  readinessStatus: string | null;
  readinessScore: number | null;
  compensationStatus: string | null;
  disclosureSafe: boolean;
  executionGateStatus: string | null;
  executionGateScore: number | null;
  supplierSequenceCount: number;
  epcSequenceCount: number;
  openContractGapCount: number;
  openCriticalChecklistCount: number;
  openPayoutEnforcementCount: number;
  hasDemandEstimate: boolean;
  hasPackage: boolean;
  hasSupplierSequence: boolean;
  hasEpcScores: boolean;
  lastOperatorBriefAt: string | null;
}

export interface AutonomousDecision {
  action: AutonomousDecisionAction;
  priority: number;
  reason: string;
  shouldRun: boolean;
}

export interface AutonomousDecisionResult {
  dealId: string;
  decisions: AutonomousDecision[];
  primaryDecision: AutonomousDecision;
}

function briefIsStale(lastOperatorBriefAt: string | null): boolean {
  if (!lastOperatorBriefAt) return true;

  const last = new Date(lastOperatorBriefAt).getTime();
  if (Number.isNaN(last)) return true;

  const hoursOld = (Date.now() - last) / (1000 * 60 * 60);
  return hoursOld >= 12;
}

export function evaluateAutonomousDecisions(
  input: AutonomousDecisionInput,
): AutonomousDecisionResult {
  const decisions: AutonomousDecision[] = [];

  if (!input.hasDemandEstimate || input.readinessStatus === null) {
    decisions.push({
      action: "refresh_readiness",
      priority: 95,
      shouldRun: true,
      reason: "Deal is missing demand/readiness evaluation.",
    });
  }

  if (
    input.compensationStatus === null ||
    input.compensationStatus === "unprotected" ||
    input.disclosureSafe === false
  ) {
    decisions.push({
      action: "refresh_compensation",
      priority: 90,
      shouldRun: true,
      reason: "Compensation protection or disclosure safety must be evaluated.",
    });
  }

  if (
    input.readinessScore !== null &&
    input.readinessScore >= 35 &&
    input.executionGateStatus === null
  ) {
    decisions.push({
      action: "run_execution_gate",
      priority: 85,
      shouldRun: true,
      reason: "Readiness exists but execution gate has not been evaluated.",
    });
  }

  if (
    input.openContractGapCount > 0 ||
    input.openCriticalChecklistCount > 0 ||
    input.openPayoutEnforcementCount > 0
  ) {
    decisions.push({
      action: "hold_deal",
      priority: 100,
      shouldRun: true,
      reason: "Deal has unresolved contract, checklist, or payout blockers.",
    });
  }

  if (
    input.executionGateScore !== null &&
    input.executionGateScore >= 55 &&
    !input.hasEpcScores
  ) {
    decisions.push({
      action: "run_epc_scoring",
      priority: 70,
      shouldRun: true,
      reason: "Execution gate is strong enough to evaluate EPC fit.",
    });
  }

  if (
    input.hasPackage &&
    input.hasSupplierSequence &&
    input.openContractGapCount === 0
  ) {
    decisions.push({
      action: "run_auto_progression",
      priority: 65,
      shouldRun: true,
      reason: "Package and supplier sequence exist; deal can be auto-progressed.",
    });
  }

  if (input.compensationStatus === "protected") {
    decisions.push({
      action: "run_payout_enforcement",
      priority: 55,
      shouldRun: true,
      reason: "Protected compensation exists; payout enforcement should be monitored.",
    });
  }

  if (briefIsStale(input.lastOperatorBriefAt)) {
    decisions.push({
      action: "generate_operator_brief",
      priority: 50,
      shouldRun: true,
      reason: "Operator brief is missing or stale.",
    });
  }

  if (decisions.length === 0) {
    decisions.push({
      action: "no_action",
      priority: 0,
      shouldRun: false,
      reason: "No autonomous action required.",
    });
  }

  const sorted = decisions.sort((a, b) => b.priority - a.priority);

  return {
    dealId: input.dealId,
    decisions: sorted,
    primaryDecision: sorted[0],
  };
}