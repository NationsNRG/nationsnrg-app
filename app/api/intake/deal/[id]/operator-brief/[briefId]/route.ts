// app/api/intake/deal/[id]/operator-brief/[briefId]/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

interface RouteContext {
  params: Promise<{
    id: string;
    briefId: string;
  }>;
}

const patchSchema = z.object({
  action: z.enum(["mark_draft", "mark_reviewed", "mark_approved", "mark_archived"]),
});

const statusByAction = {
  mark_draft: "draft",
  mark_reviewed: "reviewed",
  mark_approved: "approved",
  mark_archived: "archived",
} as const;

const eventTypeByAction = {
  mark_draft: "brief_refreshed",
  mark_reviewed: "brief_reviewed",
  mark_approved: "brief_approved",
  mark_archived: "brief_archived",
} as const;

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id, briefId } = await context.params;
    const body = patchSchema.parse(await request.json());

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const nextStatus = statusByAction[body.action];

    const { data: brief, error } = await supabase
      .from("operator_briefs")
      .update({
        brief_status: nextStatus,
        metadata: {
          lastBriefAction: body.action,
          lastBriefActionAt: new Date().toISOString(),
        },
      })
      .eq("id", briefId)
      .eq("deal_id", id)
      .select("*")
      .single();

    if (error || !brief) {
      throw new Error(error?.message ?? "Failed to update operator brief");
    }

    await supabase.from("operator_brief_events").insert({
      deal_id: id,
      operator_brief_id: brief.id,
      event_type: eventTypeByAction[body.action],
      event_status: "logged",
      event_title: `Operator brief ${nextStatus}`,
      event_summary: brief.next_best_action ?? null,
      triggered_by: "operator",
      metadata: {
        action: body.action,
        nextStatus,
      },
    });

    return NextResponse.json({
      ok: true,
      dealId: id,
      operatorBrief: brief,
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