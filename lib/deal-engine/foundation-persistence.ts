// lib/deal-engine/foundation-persistence.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/supabase";
import {
  foundationBlockerInputSchema,
  foundationDemandEstimateInputSchema,
  foundationEconomicStackInputSchema,
  foundationNextBestActionInputSchema,
  foundationQueueInputSchema,
  foundationSupplierSequenceInputSchema,
  foundationTaskInputSchema,
  foundationWaitStateInputSchema,
} from "./foundation-validation";

type DbClient = SupabaseClient<Database>;

// Small helper so every metadata payload is explicitly DB-safe.
function toJson(value: Json | undefined): Json {
  return value ?? {};
}

export async function createFoundationQueue(
  client: DbClient,
  input: unknown,
): Promise<string> {
  const parsed = foundationQueueInputSchema.parse(input);

  const row: Database["public"]["Tables"]["deal_action_queues"]["Insert"] = {
    deal_id: parsed.dealId,
    queue_type: parsed.queueType,
    priority_score: parsed.priorityScore,
    queue_reason: parsed.queueReason,
    metadata: toJson(parsed.metadata),
  };

  const { data, error } = await client
    .from("deal_action_queues")
    .insert(row)
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(`Failed to create foundation queue: ${error?.message ?? "Unknown error"}`);
  }

  return String(data.id);
}

export async function createFoundationTask(
  client: DbClient,
  input: unknown,
): Promise<string> {
  const parsed = foundationTaskInputSchema.parse(input);

  const row: Database["public"]["Tables"]["deal_operator_tasks"]["Insert"] = {
    deal_id: parsed.dealId,
    task_type: parsed.taskType,
    task_status: "pending",
    task_title: parsed.taskTitle,
    task_description: parsed.taskDescription ?? null,
    owner_type: parsed.ownerType,
    owner_identifier: parsed.ownerIdentifier ?? null,
    due_at: parsed.dueAt ?? null,
    metadata: toJson(parsed.metadata),
  };

  const { data, error } = await client
    .from("deal_operator_tasks")
    .insert(row)
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(`Failed to create foundation task: ${error?.message ?? "Unknown error"}`);
  }

  return String(data.id);
}

export async function createFoundationBlocker(
  client: DbClient,
  input: unknown,
): Promise<string> {
  const parsed = foundationBlockerInputSchema.parse(input);

  const row: Database["public"]["Tables"]["deal_blocker_states"]["Insert"] = {
    deal_id: parsed.dealId,
    blocker_type: parsed.blockerType,
    severity: parsed.severity,
    owner_type: parsed.ownerType,
    unblock_condition: parsed.unblockCondition ?? null,
    metadata: toJson(parsed.metadata),
  };

  const { data, error } = await client
    .from("deal_blocker_states")
    .insert(row)
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(`Failed to create foundation blocker: ${error?.message ?? "Unknown error"}`);
  }

  return String(data.id);
}

export async function createFoundationWaitState(
  client: DbClient,
  input: unknown,
): Promise<string> {
  const parsed = foundationWaitStateInputSchema.parse(input);

  const row: Database["public"]["Tables"]["deal_wait_states"]["Insert"] = {
    deal_id: parsed.dealId,
    wait_state: parsed.waitState,
    is_active: true,
    reason: parsed.reason ?? null,
    resume_trigger: parsed.resumeTrigger ?? null,
    metadata: toJson(parsed.metadata),
  };

  const { data, error } = await client
    .from("deal_wait_states")
    .insert(row)
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(`Failed to create foundation wait state: ${error?.message ?? "Unknown error"}`);
  }

  return String(data.id);
}

export async function createFoundationNextBestAction(
  client: DbClient,
  input: unknown,
): Promise<string> {
  const parsed = foundationNextBestActionInputSchema.parse(input);

  const row: Database["public"]["Tables"]["deal_next_best_actions"]["Insert"] = {
    deal_id: parsed.dealId,
    action_title: parsed.actionTitle,
    action_description: parsed.actionDescription ?? null,
    confidence_score: parsed.confidenceScore,
    requires_human_review: parsed.requiresHumanReview,
    source_engine: parsed.sourceEngine,
    metadata: toJson(parsed.metadata),
  };

  const { data, error } = await client
    .from("deal_next_best_actions")
    .insert(row)
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(
      `Failed to create foundation next best action: ${error?.message ?? "Unknown error"}`,
    );
  }

  return String(data.id);
}

export async function createFoundationSupplierSequence(
  client: DbClient,
  input: unknown,
): Promise<string> {
  const parsed = foundationSupplierSequenceInputSchema.parse(input);

  const row: Database["public"]["Tables"]["supplier_sequence_plans"]["Insert"] = {
    deal_id: parsed.dealId,
    supplier_entity_id: parsed.supplierEntityId,
    sequence_type: parsed.sequenceType,
    sequence_position: parsed.sequencePosition,
    visibility_tier: parsed.visibilityTier,
    package_audience: parsed.packageAudience,
    is_primary: parsed.isPrimary,
    hold_reason: parsed.holdReason ?? null,
    metadata: toJson(parsed.metadata),
  };

  const { data, error } = await client
    .from("supplier_sequence_plans")
    .insert(row)
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(
      `Failed to create foundation supplier sequence: ${error?.message ?? "Unknown error"}`,
    );
  }

  return String(data.id);
}

export async function upsertFoundationEconomicStack(
  client: DbClient,
  input: unknown,
): Promise<string> {
  const parsed = foundationEconomicStackInputSchema.parse(input);

  const row: Database["public"]["Tables"]["deal_economic_stack_decisions"]["Insert"] = {
    deal_id: parsed.dealId,
    stack_type: parsed.stackType,
    primary_transaction_model: parsed.primaryTransactionModel ?? null,
    secondary_layers: parsed.secondaryLayers,
    tertiary_layers: parsed.tertiaryLayers,
    compensation_attachment_status: parsed.compensationAttachmentStatus,
    retained_rights: parsed.retainedRights,
    margin_protection_flags: parsed.marginProtectionFlags,
    metadata: toJson(parsed.metadata),
  };

  const { data, error } = await client
    .from("deal_economic_stack_decisions")
    .upsert(row, { onConflict: "deal_id" })
    .select("deal_id")
    .single();

  if (error || !data?.deal_id) {
    throw new Error(
      `Failed to upsert foundation economic stack: ${error?.message ?? "Unknown error"}`,
    );
  }

  return String(data.deal_id);
}

export async function createFoundationDemandEstimate(
  client: DbClient,
  input: unknown,
): Promise<string> {
  const parsed = foundationDemandEstimateInputSchema.parse(input);

  const row: Database["public"]["Tables"]["deal_demand_estimates"]["Insert"] = {
    deal_id: parsed.dealId,
    estimated_annual_spend: parsed.estimatedAnnualSpend,
    estimated_annual_kwh: parsed.estimatedAnnualKwh,
    estimated_average_kw: parsed.estimatedAverageKw,
    estimated_peak_kw: parsed.estimatedPeakKw,
    confidence_score: parsed.confidenceScore,
    confidence_band: parsed.confidenceBand,
    load_band: parsed.loadBand,
    assumed_blended_rate_per_kwh: parsed.assumedBlendedRatePerKwh,
    reasoning: parsed.reasoning,
  };

  const { data, error } = await client
    .from("deal_demand_estimates")
    .insert(row)
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(
      `Failed to create foundation demand estimate: ${error?.message ?? "Unknown error"}`,
    );
  }

  return String(data.id);
}