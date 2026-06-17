// lib/deal-engine/foundation-validation.ts

import { z } from "zod";

// =========================================
// ENUM VALIDATION
// =========================================

export const dealQueueTypeSchema = z.enum([
  "intake",
  "qualification",
  "packaging",
  "supplier_routing",
  "pricing",
  "execution",
  "escalation",
  "review",
  "stalled",
]);

export const dealTaskTypeSchema = z.enum([
  "operator",
  "ai",
  "system",
  "supervisory",
]);

export const dealTaskStatusSchema = z.enum([
  "pending",
  "in_progress",
  "completed",
  "blocked",
  "cancelled",
]);

export const dealBlockerTypeSchema = z.enum([
  "missing_required_docs",
  "insufficient_package_quality",
  "counterparty_risk_flag",
  "strategic_hold",
]);

export const dealWaitStateSchema = z.enum([
  "waiting_for_supplier_response",
  "waiting_for_cluster_rollup",
  "waiting_for_internal_review",
]);

export const dealDisclosureTierSchema = z.enum([
  "tier_0_internal",
  "tier_1_teaser",
  "tier_2_qualified",
  "tier_3_execution",
  "tier_4_premium",
]);

export const dealPackageAudienceSchema = z.enum([
  "internal",
  "supplier_teaser",
  "supplier_qualified",
  "epc",
  "lpl",
  "buyer",
  "negotiation",
  "execution",
]);

export const supplierSequenceTypeSchema = z.enum([
  "sequential_waterfall",
  "fallback_only",
  "premium_first_look",
  "hold_until_ready",
  "do_not_show_yet",
]);

export const economicStackTypeSchema = z.enum([
  "direct_execution",
  "aggregation",
  "infrastructure",
  "premium_escalation",
  "advisory_led",
]);

export const compensationAttachmentStatusSchema = z.enum([
  "not_defined",
  "preliminary",
  "internally_attached",
  "externally_committed",
  "review_required",
]);

// =========================================
// COMMON SCHEMAS
// =========================================

const nonEmptyStringSchema = z.string().trim().min(1);
const nullableStringSchema = z.string().trim().nullable().optional();

import type { Json } from "@/types/supabase";

const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonSchema),
    z.record(z.string(), jsonSchema),
  ]),
);

// =========================================
// INPUT VALIDATION
// =========================================

export const foundationQueueInputSchema = z.object({
  dealId: nonEmptyStringSchema,
  queueType: dealQueueTypeSchema,
  priorityScore: z.number().finite(),
  queueReason: nonEmptyStringSchema,
  metadata: jsonSchema.optional(),
});

export const foundationTaskInputSchema = z.object({
  dealId: nonEmptyStringSchema,
  taskType: dealTaskTypeSchema,
  taskTitle: nonEmptyStringSchema,
  taskDescription: nullableStringSchema,
  ownerType: nonEmptyStringSchema,
  ownerIdentifier: nullableStringSchema,
  dueAt: nullableStringSchema,
  metadata: jsonSchema.optional(),
});

export const foundationBlockerInputSchema = z.object({
  dealId: nonEmptyStringSchema,
  blockerType: dealBlockerTypeSchema,
  severity: z.number().int().min(1).max(5),
  ownerType: nonEmptyStringSchema,
  unblockCondition: nullableStringSchema,
  metadata: jsonSchema.optional(),
});

export const foundationWaitStateInputSchema = z.object({
  dealId: nonEmptyStringSchema,
  waitState: dealWaitStateSchema,
  reason: nullableStringSchema,
  resumeTrigger: nullableStringSchema,
  metadata: jsonSchema.optional(),
});

export const foundationNextBestActionInputSchema = z.object({
  dealId: nonEmptyStringSchema,
  actionTitle: nonEmptyStringSchema,
  actionDescription: nullableStringSchema,
  confidenceScore: z.number().min(0).max(100),
  requiresHumanReview: z.boolean(),
  sourceEngine: nonEmptyStringSchema,
  metadata: jsonSchema.optional(),
});

export const foundationSupplierSequenceInputSchema = z.object({
  dealId: nonEmptyStringSchema,
  supplierEntityId: nonEmptyStringSchema,
  sequenceType: supplierSequenceTypeSchema,
  sequencePosition: z.number().int().positive(),
  visibilityTier: dealDisclosureTierSchema,
  packageAudience: dealPackageAudienceSchema,
  isPrimary: z.boolean(),
  holdReason: nullableStringSchema,
  metadata: jsonSchema.optional(),
});

export const foundationEconomicStackInputSchema = z.object({
  dealId: nonEmptyStringSchema,
  stackType: economicStackTypeSchema,
  primaryTransactionModel: nullableStringSchema,
  secondaryLayers: z.array(nonEmptyStringSchema),
  tertiaryLayers: z.array(nonEmptyStringSchema),
  compensationAttachmentStatus: compensationAttachmentStatusSchema,
  retainedRights: z.array(nonEmptyStringSchema),
  marginProtectionFlags: z.array(nonEmptyStringSchema),
  metadata: jsonSchema.optional(),
});

export const foundationDemandEstimateInputSchema = z.object({
  dealId: nonEmptyStringSchema,
  estimatedAnnualSpend: z.number().finite().min(0),
  estimatedAnnualKwh: z.number().finite().min(0),
  estimatedAverageKw: z.number().finite().min(0),
  estimatedPeakKw: z.number().finite().min(0),
  confidenceScore: z.number().finite().min(0).max(100),
  confidenceBand: z.enum(["low", "medium", "high"]),
  loadBand: z.enum([
    "micro",
    "small_commercial",
    "mid_commercial",
    "large_commercial",
    "infrastructure_candidate",
  ]),
  assumedBlendedRatePerKwh: z.number().finite().min(0),
  reasoning: z.array(nonEmptyStringSchema),
});