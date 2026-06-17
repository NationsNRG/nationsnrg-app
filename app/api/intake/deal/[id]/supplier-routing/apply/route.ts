// app/api/intake/deal/[id]/supplier-routing/apply/route.ts

import { ok, fail } from "@/lib/api/response";
import { getServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

const requestSchema = z.object({
  action: z.enum([
    "keep_primary",
    "promote_next_best",
    "demote_current_primary",
    "hold_current_path",
    "expand_supplier_pool",
    "pause_for_repackaging",
  ]),
  targetSequenceId: z.string().trim().nullable().optional(),
  targetSupplierEntityId: z.string().trim().nullable().optional(),
  reason: z.string().trim().min(1),
});

function mergeMetadata(
  existing: unknown,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {};

  return {
    ...base,
    ...patch,
  };
}

async function logRoutingAction(params: {
  supabase: ReturnType<typeof getServiceClient>;
  dealId: string;
  supplierSequenceId: string | null;
  actionType:
    | "keep_primary"
    | "promote_next_best"
    | "demote_current_primary"
    | "hold_current_path"
    | "expand_supplier_pool"
    | "pause_for_repackaging";
  actionStatus: "applied" | "signal_only" | "skipped" | "failed";
  targetSupplierEntityId: string | null;
  actionReason: string;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await params.supabase
    .from("supplier_routing_action_events")
    .insert({
    deal_id: params.dealId,
    supplier_sequence_id: params.supplierSequenceId,
    action_type: params.actionType,
    action_status: params.actionStatus,
    target_supplier_entity_id: params.targetSupplierEntityId,
    action_reason: params.actionReason,
    action_source: "operator_apply",
    notes: params.notes ?? null,
    metadata: params.metadata ?? {},
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const { id } = await context.params;
    const body = requestSchema.parse(await request.json());

    const supabase = getServiceClient();

    if (body.action === "expand_supplier_pool") {
      await logRoutingAction({
        supabase,
        dealId: id,
        supplierSequenceId: null,
        actionType: body.action,
        actionStatus: "signal_only",
        targetSupplierEntityId: body.targetSupplierEntityId ?? null,
        actionReason: body.reason,
        notes: "Operator signal only. No sequence mutation applied.",
      });

return ok({
  applied: false,
  dealId: id,
  action: body.action,
  message:
    "Expand supplier pool is an operator signal only right now. No direct sequence mutation was applied.",
});
    }

    if (body.action === "pause_for_repackaging") {
      await logRoutingAction({
        supabase,
        dealId: id,
        supplierSequenceId: null,
        actionType: body.action,
        actionStatus: "signal_only",
        targetSupplierEntityId: body.targetSupplierEntityId ?? null,
        actionReason: body.reason,
        notes: "Operator signal only. No sequence mutation applied.",
      });

return ok({
  applied: false,
  dealId: id,
  action: body.action,
  message:
    "Pause for repackaging is an operator signal only right now. No direct sequence mutation was applied.",
});
    }

    if (!body.targetSequenceId) {
      throw new Error("targetSequenceId is required for this routing action");
    }

    const { data: targetSequence, error: targetError } = await supabase
      .from("supplier_sequence_plans")
      .select("*")
      .eq("id", body.targetSequenceId)
      .eq("deal_id", id)
      .maybeSingle();

    if (targetError || !targetSequence) {
      throw new Error(targetError?.message ?? "Target supplier sequence not found");
    }

    if (body.action === "keep_primary") {
      const { data, error } = await supabase
        .from("supplier_sequence_plans")
        .update({
          metadata: mergeMetadata(targetSequence.metadata, {
            routingActionApplied: "keep_primary",
            routingActionReason: body.reason,
            routingActionAppliedAt: new Date().toISOString(),
          }),
        })
        .eq("id", body.targetSequenceId)
        .eq("deal_id", id)
        .select("*")
        .maybeSingle();

      if (error || !data) {
        throw new Error(error?.message ?? "Failed to keep primary");
      }

      await logRoutingAction({
        supabase,
        dealId: id,
        supplierSequenceId: body.targetSequenceId,
        actionType: body.action,
        actionStatus: "applied",
        targetSupplierEntityId: body.targetSupplierEntityId ?? null,
        actionReason: body.reason,
        metadata: {
          sequenceTypeAfter: data.sequence_type,
          isPrimaryAfter: data.is_primary,
        },
      });

return ok({
  applied: true,
  dealId: id,
  action: body.action,
  supplierSequence: data,
});
    }

    if (body.action === "promote_next_best") {
      const { error: demoteCurrentError } = await supabase
        .from("supplier_sequence_plans")
        .update({ is_primary: false })
        .eq("deal_id", id)
        .eq("is_primary", true);

      if (demoteCurrentError) {
        throw new Error(demoteCurrentError.message);
      }

      const { data, error } = await supabase
        .from("supplier_sequence_plans")
        .update({
          is_primary: true,
          sequence_type: "sequential_waterfall",
          hold_reason: null,
          metadata: mergeMetadata(targetSequence.metadata, {
            routingActionApplied: "promote_next_best",
            routingActionReason: body.reason,
            routingActionAppliedAt: new Date().toISOString(),
          }),
        })
        .eq("id", body.targetSequenceId)
        .eq("deal_id", id)
        .select("*")
        .maybeSingle();

      if (error || !data) {
        throw new Error(error?.message ?? "Failed to promote next best supplier");
      }

      await logRoutingAction({
        supabase,
        dealId: id,
        supplierSequenceId: body.targetSequenceId,
        actionType: body.action,
        actionStatus: "applied",
        targetSupplierEntityId: body.targetSupplierEntityId ?? null,
        actionReason: body.reason,
        metadata: {
          sequenceTypeAfter: data.sequence_type,
          isPrimaryAfter: data.is_primary,
        },
      });

return ok({
  applied: true,
  dealId: id,
  action: body.action,
  supplierSequence: data,
});
    }

    if (body.action === "demote_current_primary") {
      const { data, error } = await supabase
        .from("supplier_sequence_plans")
        .update({
          is_primary: false,
          sequence_type: "fallback_only",
          metadata: mergeMetadata(targetSequence.metadata, {
            routingActionApplied: "demote_current_primary",
            routingActionReason: body.reason,
            routingActionAppliedAt: new Date().toISOString(),
          }),
        })
        .eq("id", body.targetSequenceId)
        .eq("deal_id", id)
        .select("*")
        .maybeSingle();

      if (error || !data) {
        throw new Error(error?.message ?? "Failed to demote current primary");
      }

      await logRoutingAction({
        supabase,
        dealId: id,
        supplierSequenceId: body.targetSequenceId,
        actionType: body.action,
        actionStatus: "applied",
        targetSupplierEntityId: body.targetSupplierEntityId ?? null,
        actionReason: body.reason,
        metadata: {
          sequenceTypeAfter: data.sequence_type,
          isPrimaryAfter: data.is_primary,
        },
      });

return ok({
  applied: true,
  dealId: id,
  action: body.action,
  supplierSequence: data,
});
    }

    const { data, error } = await supabase
      .from("supplier_sequence_plans")
      .update({
        sequence_type: "hold_until_ready",
        hold_reason: body.reason,
        metadata: mergeMetadata(targetSequence.metadata, {
          routingActionApplied: "hold_current_path",
          routingActionReason: body.reason,
          routingActionAppliedAt: new Date().toISOString(),
        }),
      })
      .eq("id", body.targetSequenceId)
      .eq("deal_id", id)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to hold current path");
    }

    await logRoutingAction({
      supabase,
      dealId: id,
      supplierSequenceId: body.targetSequenceId,
      actionType: body.action,
      actionStatus: "applied",
      targetSupplierEntityId: body.targetSupplierEntityId ?? null,
      actionReason: body.reason,
      metadata: {
        sequenceTypeAfter: data.sequence_type,
        isPrimaryAfter: data.is_primary,
        holdReasonAfter: data.hold_reason,
      },
    });
return ok({
  applied: true,
  dealId: id,
  action: body.action,
  supplierSequence: data,
});
  } catch (error) {
return fail(error instanceof Error ? error.message : "Unknown error");
  }
}