// app/api/intake/deal/[id]/epc-sequence/[sequenceId]/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

interface RouteContext {
  params: Promise<{
    id: string;
    sequenceId: string;
  }>;
}

const patchSchema = z.object({
  action: z.enum([
    "mark_planned",
    "mark_approved",
    "mark_contacted",
    "mark_responded",
    "mark_held",
    "mark_rejected",
    "mark_completed",
    "set_primary",
  ]),
  notes: z.string().trim().nullable().optional(),
  holdReason: z.string().trim().nullable().optional(),
  packageLevel: z
    .enum(["none", "teaser", "qualified_package", "full_package", "nda_required"])
    .optional(),
});

const statusByAction = {
  mark_planned: "planned",
  mark_approved: "approved",
  mark_contacted: "contacted",
  mark_responded: "responded",
  mark_held: "held",
  mark_rejected: "rejected",
  mark_completed: "completed",
} as const;

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id, sequenceId } = await context.params;
    const body = patchSchema.parse(await request.json());

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    if (body.action === "set_primary") {
      await supabase
        .from("epc_sequence_plans")
        .update({ is_primary: false })
        .eq("deal_id", id);
    }

    const updatePayload: Record<string, unknown> = {
      notes: body.notes ?? undefined,
      hold_reason: body.holdReason ?? undefined,
      metadata: {
        lastEpcSequenceAction: body.action,
        lastEpcSequenceActionAt: new Date().toISOString(),
        principle:
          "EPC sequence status should protect disclosure, compensation, accountability, and liability boundaries.",
      },
    };

    if (body.action !== "set_primary") {
      updatePayload.sequence_status = statusByAction[body.action];
    }

    if (body.action === "set_primary") {
      updatePayload.is_primary = true;
    }

    if (body.packageLevel !== undefined) {
      updatePayload.package_level = body.packageLevel;
    }

    const { data, error } = await supabase
      .from("epc_sequence_plans")
      .update(updatePayload)
      .eq("id", sequenceId)
      .eq("deal_id", id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to update EPC sequence");
    }

    await supabase.from("epc_recommendation_events").insert({
      deal_id: id,
      epc_profile_id: data.epc_profile_id,
      epc_identifier: data.epc_identifier,
      event_type:
        body.action === "set_primary"
          ? "epc_primary_selected"
          : body.action === "mark_contacted"
            ? "epc_contacted"
            : body.action === "mark_responded"
              ? "epc_response_logged"
              : body.action === "mark_held"
                ? "epc_held"
                : body.action === "mark_rejected"
                  ? "epc_rejected"
                  : "epc_sequence_created",
      event_status: "logged",
      event_title: `EPC sequence updated: ${body.action}`,
      event_summary: body.notes ?? body.holdReason ?? null,
      recommended_package_level: data.package_level,
      triggered_by: "operator",
      metadata: {
        sequenceStatus: data.sequence_status,
        isPrimary: data.is_primary,
      },
    });

    return NextResponse.json({
      ok: true,
      dealId: id,
      epcSequence: data,
    });
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