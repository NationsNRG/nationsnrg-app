// app/api/intake/deal/[id]/retained-rights/[rightId]/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { triggerContractReadinessRefresh } from "@/lib/deal-engine/contract-readiness-trigger";

interface RouteContext {
  params: Promise<{
    id: string;
    rightId: string;
  }>;
}

const patchSchema = z.object({
  action: z.enum([
    "mark_reserved",
    "mark_acknowledged",
    "mark_released",
    "mark_expired",
    "mark_waived",
  ]),
  notes: z.string().trim().nullable().optional(),
});

const statusByAction = {
  mark_reserved: "reserved",
  mark_acknowledged: "acknowledged",
  mark_released: "released",
  mark_expired: "expired",
  mark_waived: "waived",
} as const;

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id, rightId } = await context.params;
    const body = patchSchema.parse(await request.json());

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data, error } = await supabase
      .from("retained_right_events")
      .update({
        right_status: statusByAction[body.action],
        notes: body.notes ?? undefined,
        metadata: {
          lastRightAction: body.action,
          lastRightActionAt: new Date().toISOString(),
          principle:
            "Retained rights should protect NationsNRG while preserving fair partner participation, team accountability, and liability boundaries.",
        },
      })
      .eq("id", rightId)
      .eq("deal_id", id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to update retained right");
    }

    void triggerContractReadinessRefresh({
      dealId: id,
      triggerSource: "compensation_update",
    });

    await fetch(
      `${
        process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
      }/api/intake/deal/${id}/compensation-protection`,
      {
        method: "POST",
        cache: "no-store",
      },
    );

    return NextResponse.json({
      ok: true,
      dealId: id,
      retainedRight: data,
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