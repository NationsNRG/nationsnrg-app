// lib/deal-engine/foundation-types.ts

import type { Json } from "@/types/supabase";

// =========================================
// QUEUES
// =========================================

export type DealQueueType =
  | "intake"
  | "qualification"
  | "packaging"
  | "supplier_routing"
  | "pricing"
  | "execution"
  | "escalation"
  | "review"
  | "stalled";

// =========================================
// TASKS
// =========================================

export type DealTaskType =
  | "operator"
  | "ai"
  | "system"
  | "supervisory";

export type DealTaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "blocked"
  | "cancelled";

// =========================================
// BLOCKERS
// =========================================

export type DealBlockerType =
  | "missing_required_docs"
  | "insufficient_package_quality"
  | "counterparty_risk_flag"
  | "strategic_hold";

// =========================================
// WAIT STATES
// =========================================

export type DealWaitState =
  | "waiting_for_supplier_response"
  | "waiting_for_cluster_rollup"
  | "waiting_for_internal_review";

// =========================================
// DISCLOSURE / PACKAGING
// =========================================

export type DealDisclosureTier =
  | "tier_0_internal"
  | "tier_1_teaser"
  | "tier_2_qualified"
  | "tier_3_execution"
  | "tier_4_premium";

export type DealPackageAudience =
  | "internal"
  | "supplier_teaser"
  | "supplier_qualified"
  | "epc"
  | "lpl"
  | "buyer"
  | "negotiation"
  | "execution";

// =========================================
// SUPPLIER SEQUENCING
// =========================================

export type SupplierSequenceType =
  | "sequential_waterfall"
  | "fallback_only"
  | "premium_first_look"
  | "hold_until_ready"
  | "do_not_show_yet";

// =========================================
// ECONOMIC STACK
// =========================================

export type EconomicStackType =
  | "direct_execution"
  | "aggregation"
  | "infrastructure"
  | "premium_escalation"
  | "advisory_led";

export type CompensationAttachmentStatus =
  | "not_defined"
  | "preliminary"
  | "internally_attached"
  | "externally_committed"
  | "review_required";

export type LplCandidateStatus =
  | "not_lpl_candidate"
  | "lpl_potential_hold"
  | "lpl_review_candidate"
  | "lpl_ready_for_release"
  | "lpl_blocked";

export type PortfolioReleaseDecision =
  | "release_now"
  | "hold_for_rollup"
  | "split"
  | "escalate_partial_cluster"
  | "reassess_later";

// =========================================
// COMMON STRUCTURES
// =========================================

export interface FoundationQueueInput {
  dealId: string;
  queueType: DealQueueType;
  priorityScore: number;
  queueReason: string;
  metadata?: Json;
}

export interface FoundationTaskInput {
  dealId: string;
  taskType: DealTaskType;
  taskTitle: string;
  taskDescription?: string | null;
  ownerType: string;
  ownerIdentifier?: string | null;
  dueAt?: string | null;
  metadata?: Json;
}

export interface FoundationBlockerInput {
  dealId: string;
  blockerType: DealBlockerType;
  severity: number;
  ownerType: string;
  unblockCondition?: string | null;
  metadata?: Json;
}

export interface FoundationWaitStateInput {
  dealId: string;
  waitState: DealWaitState;
  reason?: string | null;
  resumeTrigger?: string | null;
  metadata?: Json;
}

export interface FoundationNextBestActionInput {
  dealId: string;
  actionTitle: string;
  actionDescription?: string | null;
  confidenceScore: number;
  requiresHumanReview: boolean;
  sourceEngine: string;
  metadata?: Json; 
}

export interface FoundationSupplierSequenceInput {
  dealId: string;
  supplierEntityId: string;
  sequenceType: SupplierSequenceType;
  sequencePosition: number;
  visibilityTier: DealDisclosureTier;
  packageAudience: DealPackageAudience;
  isPrimary: boolean;
  holdReason?: string | null;
  metadata?: Json;
}

export interface FoundationEconomicStackInput {
  dealId: string;
  stackType: EconomicStackType;
  primaryTransactionModel?: string | null;
  secondaryLayers: string[];
  tertiaryLayers: string[];
  compensationAttachmentStatus: CompensationAttachmentStatus;
  retainedRights: string[];
  marginProtectionFlags: string[];
  metadata?: Json;
}

export interface FoundationDemandEstimateInput {
  dealId: string;
  estimatedAnnualSpend: number;
  estimatedAnnualKwh: number;
  estimatedAverageKw: number;
  estimatedPeakKw: number;
  confidenceScore: number;
  confidenceBand: "low" | "medium" | "high";
  loadBand:
    | "micro"
    | "small_commercial"
    | "mid_commercial"
    | "large_commercial"
    | "infrastructure_candidate";
  assumedBlendedRatePerKwh: number;
  reasoning: string[];
}