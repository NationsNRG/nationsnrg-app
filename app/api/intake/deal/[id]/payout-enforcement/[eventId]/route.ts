// app/api/intake/deal/[id]/payout-enforcement/[eventId]/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

interface RouteContext {
  params: Promise<{
    id: string;
    eventId: string;
  }>;
}

const patchSchema = z.object({
  action: z.enum([
    "mark_open",
    "mark_in_progress",
    "mark_resolved",
    "mark_waived",
  ]),
  escalationOwner: z.string().trim().nullable().optional(),
  recommendedAction: z.string().trim().nullable().optional(),
});

const statusByAction = {
  mark_open: "open",
  mark_in_progress: "in_progress",
  mark_resolved: "resolved",
  mark_waived: "waived",
} as const;

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id, eventId } = await context.params;
    const body = patchSchema.parse(await request.json());

    const now = new Date().toISOString();
    const nextStatus = statusByAction[body.action];

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data, error } = await supabase
      .from("payout_enforcement_events")
      .update({
        enforcement_status: nextStatus,
        escalation_owner: body.escalationOwner ?? undefined,
        recommended_action: body.recommendedAction ?? undefined,
        resolved_at:
          nextStatus === "resolved" || nextStatus === "waived" ? now : null,
        metadata: {
          lastEnforcementAction: body.action,
          lastEnforcementActionAt: now,
          principle:
            "Payout enforcement should protect earned compensation while preserving fair dispute handling and partner trust.",
        },
      })
      .eq("id", eventId)
      .eq("deal_id", id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to update payout enforcement event");
    }

    return NextResponse.json({
      ok: true,
      dealId: id,
      enforcementEvent: data,
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