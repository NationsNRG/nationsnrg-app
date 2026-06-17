// app/api/intake/deal/[id]/supplier-sequence/[sequenceId]/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

interface RouteContext {
  params: Promise<{
    id: string;
    sequenceId: string;
  }>;
}

const requestSchema = z.object({
  action: z.enum(["approve_primary", "demote", "hold", "release_hold"]),
  holdReason: z.string().trim().nullable().optional(),
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

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id, sequenceId } = await context.params;
    const body = requestSchema.parse(await request.json());

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

    if (body.action === "approve_primary") {
      const { error: demoteError } = await supabase
        .from("supplier_sequence_plans")
        .update({ is_primary: false })
        .eq("deal_id", id)
        .eq("is_primary", true);

      if (demoteError) {
        throw new Error(demoteError.message);
      }

      const { data, error } = await supabase
        .from("supplier_sequence_plans")
        .update({
          is_primary: true,
          sequence_type: "sequential_waterfall",
          hold_reason: null,
          metadata: mergeMetadata(sequence.metadata, {
            approvalState: "approved_primary",
            reviewedBy: "operator_action",
          }),
        })
        .eq("id", sequenceId)
        .eq("deal_id", id)
        .select("*")
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "Failed to approve supplier as primary");
      }

      return NextResponse.json(
        {
          ok: true,
          supplierSequence: data,
        },
        { status: 200 },
      );
    }

    if (body.action === "demote") {
      const { data, error } = await supabase
        .from("supplier_sequence_plans")
        .update({
          is_primary: false,
          sequence_type: "fallback_only",
          metadata: mergeMetadata(sequence.metadata, {
            approvalState: "demoted",
            reviewedBy: "operator_action",
          }),
        })
        .eq("id", sequenceId)
        .eq("deal_id", id)
        .select("*")
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "Failed to demote supplier sequence");
      }

      return NextResponse.json(
        {
          ok: true,
          supplierSequence: data,
        },
        { status: 200 },
      );
    }

    if (body.action === "hold") {
      const { data, error } = await supabase
        .from("supplier_sequence_plans")
        .update({
          sequence_type: "hold_until_ready",
          hold_reason: body.holdReason ?? "Manually held by operator",
          metadata: mergeMetadata(sequence.metadata, {
            approvalState: "on_hold",
            reviewedBy: "operator_action",
          }),
        })
        .eq("id", sequenceId)
        .eq("deal_id", id)
        .select("*")
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "Failed to hold supplier sequence");
      }

      return NextResponse.json(
        {
          ok: true,
          supplierSequence: data,
        },
        { status: 200 },
      );
    }

    const { data, error } = await supabase
      .from("supplier_sequence_plans")
      .update({
        sequence_type: sequence.is_primary
          ? "sequential_waterfall"
          : "fallback_only",
        hold_reason: null,
        metadata: mergeMetadata(sequence.metadata, {
          approvalState: "released_hold",
          reviewedBy: "operator_action",
        }),
      })
      .eq("id", sequenceId)
      .eq("deal_id", id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to release supplier hold");
    }

    return NextResponse.json(
      {
        ok: true,
        supplierSequence: data,
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