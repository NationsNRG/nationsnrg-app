// app/api/intake/deal/[id]/supplier-sequence/[sequenceId]/responses/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { triggerDealAutoProgression } from "@/lib/deal-engine/auto-progress-trigger";

interface RouteContext {
  params: Promise<{
    id: string;
    sequenceId: string;
  }>;
}

const createSchema = z.object({
  responseType: z.enum([
    "interest",
    "decline",
    "objection",
    "counter",
    "request_for_info",
    "term_revision",
    "pricing_feedback",
    "non_starter",
  ]),
  responseStatus: z
    .enum(["received", "reviewed", "accepted", "rejected", "pending_followup"])
    .default("received"),
  responseSummary: z.string().trim().nullable().optional(),
  objections: z.array(z.string().trim().min(1)).default([]),
  requestedChanges: z.array(z.string().trim().min(1)).default([]),
  confidenceSignal: z.number().int().min(0).max(100).nullable().optional(),
  responseSpeedHours: z.number().finite().min(0).nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
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

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id, sequenceId } = await context.params;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data, error } = await supabase
      .from("supplier_response_events")
      .select("*")
      .eq("deal_id", id)
      .eq("supplier_sequence_id", sequenceId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(
      {
        ok: true,
        dealId: id,
        supplierSequenceId: sequenceId,
        responses: data ?? [],
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id, sequenceId } = await context.params;
    const body = createSchema.parse(await request.json());

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: sequence, error: sequenceError } = await supabase
      .from("supplier_sequence_plans")
      .select("*")
      .eq("id", sequenceId)
      .eq("deal_id", id)
      .single();

    if (sequenceError || !sequence) {
      throw new Error(sequenceError?.message ?? "Supplier sequence not found");
    }

    const { data: responseEvent, error: insertError } = await supabase
      .from("supplier_response_events")
      .insert({
        deal_id: id,
        supplier_sequence_id: sequenceId,
        response_type: body.responseType,
        response_status: body.responseStatus,
        response_summary: body.responseSummary ?? null,
        objections: body.objections,
        requested_changes: body.requestedChanges,
        confidence_signal: body.confidenceSignal ?? null,
        response_speed_hours: body.responseSpeedHours ?? null,
        notes: body.notes ?? null,
        metadata: {
          supplierEntityId: sequence.supplier_entity_id,
          supplierSequenceType: sequence.sequence_type,
          ...body.metadata,
        },
      })
      .select("*")
      .single();

    if (insertError || !responseEvent) {
      throw new Error(insertError?.message ?? "Failed to create supplier response");
    }

    const nextSequenceType =
      body.responseType === "decline" || body.responseType === "non_starter"
        ? "fallback_only"
        : body.responseType === "request_for_info"
        ? "hold_until_ready"
        : sequence.sequence_type;

    const nextHoldReason =
      body.responseType === "request_for_info"
        ? "Supplier requested more information before progression."
        : sequence.hold_reason;

    const { data: updatedSequence, error: updateError } = await supabase
      .from("supplier_sequence_plans")
      .update({
        sequence_type: nextSequenceType,
        hold_reason: nextHoldReason,
        metadata: mergeMetadata(sequence.metadata, {
          latestResponseType: body.responseType,
          latestResponseStatus: body.responseStatus,
          latestConfidenceSignal: body.confidenceSignal ?? null,
          latestResponseAt: new Date().toISOString(),
        }),
      })
      .eq("id", sequenceId)
      .eq("deal_id", id)
      .select("*")
      .single();

    if (updateError || !updatedSequence) {
      throw new Error(
        updateError?.message ?? "Failed to update supplier sequence after response",
      );
    }

void triggerDealAutoProgression({
  dealId: id,
  triggerSource: "supplier_response",
});

    return NextResponse.json(
      {
        ok: true,
        dealId: id,
        supplierSequenceId: sequenceId,
        responseEvent,
        supplierSequence: updatedSequence,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}