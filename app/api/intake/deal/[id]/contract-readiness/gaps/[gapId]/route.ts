// app/api/intake/deal/[id]/contract-readiness/gaps/[gapId]/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { triggerContractReadinessRefresh } from "@/lib/deal-engine/contract-readiness-trigger";

interface RouteContext {
  params: Promise<{
    id: string;
    gapId: string;
  }>;
}

const patchSchema = z.object({
  gapStatus: z.enum(["open", "in_progress", "resolved", "waived"]),
  resolutionAction: z.string().trim().nullable().optional(),
});

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id, gapId } = await context.params;
    const body = patchSchema.parse(await request.json());

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("contract_gap_events")
      .update({
        gap_status: body.gapStatus,
        resolution_action: body.resolutionAction ?? null,
        resolved_at:
          body.gapStatus === "resolved" || body.gapStatus === "waived"
            ? now
            : null,
      })
      .eq("id", gapId)
      .eq("deal_id", id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to update contract gap");
    }

    void triggerContractReadinessRefresh({
      dealId: id,
      triggerSource: "operator",
    });

    return NextResponse.json({
      ok: true,
      dealId: id,
      gap: data,
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